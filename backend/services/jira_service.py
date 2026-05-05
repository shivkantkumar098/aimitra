"""
JIRA Cloud REST API service — acts as a backend proxy.

Auth: JIRA Cloud uses HTTP Basic Auth with email + API token.
  Authorization: Basic base64(email:api_token)

All calls are proxied through this backend so the user's JIRA
credentials are never exposed in browser network traffic to JIRA directly.

JIRA REST API v3 base: https://{domain}/rest/api/3/

Rich text fields (description, comment body) use Atlassian Document Format (ADF).
_to_adf() converts plain text to minimal valid ADF.

To get a JIRA API token:
  https://id.atlassian.com/manage-profile/security/api-tokens
"""

import base64
from typing import Any

import httpx


def _auth_header(email: str, api_token: str) -> dict:
    """Builds Basic Auth header from email + API token."""
    token = base64.b64encode(f"{email}:{api_token}".encode()).decode()
    return {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _base_url(domain: str) -> str:
    """Normalises the JIRA domain to a full base URL."""
    domain = domain.strip().rstrip("/")
    if not domain.startswith("http"):
        domain = f"https://{domain}"
    return f"{domain}/rest/api/3"


def _to_adf(text: str) -> dict:
    """
    Converts plain text to Atlassian Document Format (ADF).
    JIRA Cloud v3 API requires ADF for description and comment body.
    Splits on blank lines to create separate paragraphs.
    """
    paragraphs = []
    for para in text.strip().split("\n\n"):
        lines = para.strip()
        if lines:
            paragraphs.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": lines}],
            })
    if not paragraphs:
        paragraphs = [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]
    return {"type": "doc", "version": 1, "content": paragraphs}


async def test_connection(domain: str, email: str, api_token: str) -> dict:
    """
    Tests JIRA credentials by calling /myself endpoint.
    Returns user info on success, raises on failure.
    """
    url = f"{_base_url(domain)}/myself"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=_auth_header(email, api_token))
        response.raise_for_status()
        data = response.json()
        return {
            "displayName": data.get("displayName", ""),
            "email": data.get("emailAddress", email),
            "accountId": data.get("accountId", ""),
            "avatarUrl": data.get("avatarUrls", {}).get("48x48", ""),
        }


async def get_ticket(domain: str, email: str, api_token: str, issue_key: str) -> dict:
    """
    Fetches a JIRA ticket by key (e.g. QA-123).
    Returns structured ticket data: summary, description, status, type, AC, comments.
    """
    url = f"{_base_url(domain)}/issue/{issue_key.upper().strip()}"
    params = {
        "fields": "summary,description,status,issuetype,priority,assignee,"
                  "reporter,comment,acceptance_criteria,customfield_10016,"  # story points
                  "labels,components,fixVersions,created,updated"
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=_auth_header(email, api_token), params=params)
        response.raise_for_status()
        data = response.json()

    fields = data.get("fields", {})

    # Extract plain text from ADF description
    description = _extract_adf_text(fields.get("description") or {})

    # Extract comments
    comments = []
    for c in (fields.get("comment", {}).get("comments") or []):
        comments.append({
            "author": c.get("author", {}).get("displayName", "Unknown"),
            "body": _extract_adf_text(c.get("body") or {}),
            "created": c.get("created", ""),
        })

    return {
        "key": data.get("key"),
        "summary": fields.get("summary", ""),
        "description": description,
        "status": fields.get("status", {}).get("name", ""),
        "issueType": fields.get("issuetype", {}).get("name", ""),
        "priority": fields.get("priority", {}).get("name", ""),
        "assignee": (fields.get("assignee") or {}).get("displayName", "Unassigned"),
        "reporter": (fields.get("reporter") or {}).get("displayName", ""),
        "labels": fields.get("labels", []),
        "comments": comments,
        "url": f"https://{domain.replace('https://', '').replace('http://', '')}/browse/{data.get('key')}",
    }


async def create_ticket(
    domain: str,
    email: str,
    api_token: str,
    project_key: str,
    issue_type: str,
    summary: str,
    description: str,
    priority: str = "Medium",
    labels: list[str] | None = None,
) -> dict:
    """
    Creates a new JIRA ticket.
    Returns the created issue key and URL.
    """
    url = f"{_base_url(domain)}/issue"
    body = {
        "fields": {
            "project": {"key": project_key.upper()},
            "issuetype": {"name": issue_type},
            "summary": summary,
            "description": _to_adf(description),
            "priority": {"name": priority},
        }
    }
    if labels:
        body["fields"]["labels"] = labels

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=body, headers=_auth_header(email, api_token))
        response.raise_for_status()
        data = response.json()

    issue_key = data.get("key", "")
    domain_clean = domain.replace("https://", "").replace("http://", "")
    return {
        "key": issue_key,
        "id": data.get("id", ""),
        "url": f"https://{domain_clean}/browse/{issue_key}",
    }


async def add_comment(
    domain: str,
    email: str,
    api_token: str,
    issue_key: str,
    comment_text: str,
) -> dict:
    """
    Posts a comment to an existing JIRA ticket.
    Returns the created comment ID and author.
    """
    url = f"{_base_url(domain)}/issue/{issue_key.upper().strip()}/comment"
    body = {"body": _to_adf(comment_text)}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=body, headers=_auth_header(email, api_token))
        response.raise_for_status()
        data = response.json()

    return {
        "id": data.get("id", ""),
        "author": data.get("author", {}).get("displayName", ""),
        "created": data.get("created", ""),
    }


async def search_issues(
    domain: str,
    email: str,
    api_token: str,
    jql: str,
    max_results: int = 20,
) -> list[dict]:
    """
    Searches JIRA tickets using JQL.
    Returns a list of matching tickets with key, summary, status, priority.
    """
    url = f"{_base_url(domain)}/search"
    body = {
        "jql": jql,
        "maxResults": max_results,
        "fields": ["summary", "status", "priority", "issuetype", "assignee"],
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=body, headers=_auth_header(email, api_token))
        response.raise_for_status()
        data = response.json()

    results = []
    for issue in data.get("issues", []):
        fields = issue.get("fields", {})
        results.append({
            "key": issue.get("key"),
            "summary": fields.get("summary", ""),
            "status": fields.get("status", {}).get("name", ""),
            "priority": (fields.get("priority") or {}).get("name", ""),
            "issueType": fields.get("issuetype", {}).get("name", ""),
            "assignee": (fields.get("assignee") or {}).get("displayName", "Unassigned"),
        })
    return results


async def get_projects(domain: str, email: str, api_token: str) -> list[dict]:
    """
    Returns all accessible JIRA projects for the authenticated user.
    Used to populate the project dropdown in Bug Creator.
    """
    url = f"{_base_url(domain)}/project"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=_auth_header(email, api_token))
        response.raise_for_status()
        data = response.json()

    return [
        {"key": p.get("key"), "name": p.get("name"), "id": p.get("id")}
        for p in data
    ]


def _extract_adf_text(adf: dict) -> str:
    """
    Recursively extracts plain text from Atlassian Document Format (ADF).
    Used to convert JIRA ticket descriptions and comments to readable text.
    """
    if not adf:
        return ""
    text_parts = []
    for node in adf.get("content", []):
        node_type = node.get("type", "")
        if node_type == "text":
            text_parts.append(node.get("text", ""))
        elif node_type in ("paragraph", "heading", "bulletList", "orderedList",
                           "listItem", "blockquote", "panel", "codeBlock"):
            text_parts.append(_extract_adf_text(node))
            if node_type in ("paragraph", "heading"):
                text_parts.append("\n")
        elif node_type == "hardBreak":
            text_parts.append("\n")
        elif "content" in node:
            text_parts.append(_extract_adf_text(node))
    return "".join(text_parts).strip()
