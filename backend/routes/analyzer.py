"""
URL analyzer — fetches any webpage and extracts interactive elements for test generation.

Endpoint:
  POST /api/analyze-url — fetches the URL, parses HTML, returns structured element data.

Used by:
  - DomLocatorGenerator (frontend) to pre-populate CSS/XPath fields
  - DevTools test generators to understand page structure before generating tests

How it works:
  1. Fetches the page with httpx (follows redirects, allows self-signed certs for localhost)
  2. Strips script/style/noscript/svg tags from the DOM
  3. Extracts: title, headings, forms, inputs, buttons, links
  4. For each element, generates CSS selector and XPath via _css() and _xpath()
  5. Detects JS-heavy SPAs (React #root, Vue #app, Next.js #__next) and flags them

Note: For JS-rendered SPAs where content loads after page load, the Chrome extension's
content.js is a better tool since it runs in the live browser DOM.
"""

import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["analyzer"])


class AnalyzeRequest(BaseModel):
    url: str
    timeout: int = 20


# ── Selector helpers ──────────────────────────────────────────────────────────

def _css(tag: Tag) -> str:
    """
    Generates the most stable CSS selector for a BeautifulSoup Tag.

    Priority order (most reliable → least):
      1. #id           — unique, fastest
      2. [data-testid] — test-specific attribute, stable across refactors
      3. [data-cy]     — Cypress-style test attribute
      4. [name]        — form field name
      5. tag.class1.class2 — skips short utility classes (e.g. "mb-4")
      6. structural path anchored to nearest #id ancestor
    """
    if tag.get("id"):
        return f"#{tag['id']}"
    if tag.get("data-testid"):
        return f'[data-testid="{tag["data-testid"]}"]'
    if tag.get("data-cy"):
        return f'[data-cy="{tag["data-cy"]}"]'
    if tag.get("name"):
        return f'[name="{tag["name"]}"]'
    classes = [c for c in tag.get("class", []) if not re.match(r"^[a-z]{1,2}[-_]", c)][:2]
    if classes:
        return f'{tag.name}.{".".join(classes)}'
    # Build path up to nearest id anchor
    parts = []
    cur = tag
    while cur and getattr(cur, "name", None) not in (None, "[document]", "html", "body"):
        if cur.get("id"):
            parts.insert(0, f"#{cur['id']}")
            break
        siblings = [s for s in (cur.parent.children if cur.parent else [])
                    if getattr(s, "name", None) == cur.name]
        seg = cur.name
        if len(siblings) > 1:
            try:
                seg += f":nth-of-type({list(siblings).index(cur) + 1})"
            except ValueError:
                pass
        parts.insert(0, seg)
        cur = cur.parent
    return " > ".join(parts) if parts else tag.name


def _xpath(tag: Tag) -> str:
    """
    Generates an absolute XPath for a BeautifulSoup Tag.

    If the element has an `id`, returns the short //*[@id="..."] form.
    Otherwise builds a full positional path from the document root,
    using [n] index when the element has siblings of the same tag name.
    """
    if tag.get("id"):
        return f'//*[@id="{tag["id"]}"]'
    parts = []
    cur = tag
    while cur and getattr(cur, "name", None) not in (None, "[document]"):
        siblings = [s for s in (cur.parent.children if cur.parent else [])
                    if getattr(s, "name", None) == cur.name]
        idx = list(siblings).index(cur) + 1 if len(list(siblings)) > 1 else 1
        parts.insert(0, f"{cur.name}[{idx}]")
        cur = cur.parent
    return "/" + "/".join(parts) if parts else f"//{tag.name}"


def _info(tag: Tag, base_url: str) -> dict:
    """
    Extracts all useful metadata from a Tag for the frontend display and test generation.

    Returns a dict with: tag, id, name, type, placeholder, text (first 60 chars),
    ariaLabel, role, href (resolved to absolute URL), cssSelector, xpath.
    Relative hrefs are resolved against base_url using urljoin.
    """
    text = tag.get_text(" ", strip=True)[:60] or None
    href = tag.get("href")
    if href and not href.startswith(("http", "mailto", "tel", "javascript", "#", "data:")):
        href = urljoin(base_url, href)
    return {
        "tag":         tag.name,
        "id":          tag.get("id") or None,
        "name":        tag.get("name") or None,
        "type":        tag.get("type") or None,
        "placeholder": tag.get("placeholder") or None,
        "text":        text,
        "ariaLabel":   tag.get("aria-label") or None,
        "role":        tag.get("role") or None,
        "href":        href or None,
        "cssSelector": _css(tag),
        "xpath":       _xpath(tag),
    }


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/api/analyze-url")
async def analyze_url(body: AnalyzeRequest):
    """
    POST /api/analyze-url — fetches a URL and returns structured element data.

    Request body: { url: string, timeout: int (default 20s) }

    Response:
      url        — final URL after redirects
      title      — page <title> text
      headings   — first 6 h1/h2/h3 texts
      forms      — up to 6 forms, each with { id, action, method, fields[] }
      inputs     — up to 25 non-hidden form fields
      buttons    — up to 25 submit/button elements
      links      — up to 20 non-empty <a> elements
      is_js_heavy— true when page is likely a JS SPA (React/Vue/Next root div detected)

    Error responses:
      408 — page timed out
      502 — connection refused
      4xx/5xx — pass-through from the target server
    """
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "http://" + url

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=body.timeout,
            verify=False,           # allow localhost self-signed certs
            headers={"User-Agent": "Mozilla/5.0 (compatible; AiMitra/1.0)"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(408, f"Timed out after {body.timeout}s. The page may be slow or require login.")
    except httpx.ConnectError:
        raise HTTPException(502, "Could not connect. Make sure the server is running and the URL is correct.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, f"Server returned HTTP {e.response.status_code}.")
    except Exception as e:
        raise HTTPException(400, str(e))

    soup = BeautifulSoup(resp.text, "html.parser")
    base_url = str(resp.url)

    for dead in soup(["script", "style", "noscript", "svg"]):
        dead.decompose()

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    headings = [h.get_text(strip=True)[:80] for h in soup.find_all(["h1", "h2", "h3"])[:6] if h.get_text(strip=True)]

    forms = []
    for form in soup.find_all("form")[:6]:
        fields = [
            _info(f, base_url)
            for f in form.find_all(["input", "select", "textarea", "button"])[:12]
            if f.get("type") != "hidden"
        ]
        forms.append({
            "id":     form.get("id") or None,
            "action": form.get("action") or None,
            "method": (form.get("method") or "get").upper(),
            "fields": fields,
        })

    inputs = [
        _info(el, base_url)
        for el in soup.find_all(["input", "select", "textarea"])[:25]
        if el.get("type") not in ("hidden", "submit", "button", "reset", "image")
    ]

    buttons = [
        _info(el, base_url)
        for el in soup.find_all(["button", "input"])[:25]
        if el.name == "button" or el.get("type") in ("submit", "button", "reset")
    ]

    links = [
        _info(el, base_url)
        for el in soup.find_all("a", href=True)[:20]
        if el.get_text(strip=True)
    ]

    # Detect JS-heavy SPAs (React/Vue/Angular root divs)
    is_js_heavy = bool(
        soup.find("div", id="root") or
        soup.find("div", id="app") or
        soup.find("div", id="__next") or
        len(soup.find_all("script")) > 8
    )

    return {
        "url":         base_url,
        "title":       title,
        "headings":    headings,
        "forms":       forms,
        "inputs":      inputs,
        "buttons":     buttons,
        "links":       links,
        "is_js_heavy": is_js_heavy,
    }
