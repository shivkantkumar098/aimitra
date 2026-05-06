"""URL analyzer — fetches any webpage and extracts interactive elements for test generation."""

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
