"""
JIRA API proxy routes.

All JIRA calls go through here — the frontend sends JIRA credentials
with each request so nothing is stored server-side.

Endpoints:
  POST /api/jira/connect              — test credentials, returns user info
  GET  /api/jira/ticket/{issue_key}   — fetch a ticket by key
  POST /api/jira/ticket               — create a new ticket
  POST /api/jira/ticket/{issue_key}/comment — post a comment
  POST /api/jira/search               — search with JQL
  GET  /api/jira/projects             — list accessible projects
"""

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from services.jira_service import (
    add_comment,
    create_ticket,
    get_projects,
    get_ticket,
    search_issues,
    test_connection,
)

router = APIRouter(prefix="/api/jira", tags=["jira"])


# ── Shared credential extraction ─────────────────────────────────────────────

def _creds(
    x_jira_domain: str = Header(..., description="JIRA domain, e.g. mycompany.atlassian.net"),
    x_jira_email: str = Header(..., description="Atlassian account email"),
    x_jira_token: str = Header(..., description="JIRA API token"),
):
    """Dependency: extracts JIRA credentials from custom request headers."""
    return {"domain": x_jira_domain, "email": x_jira_email, "api_token": x_jira_token}


def _handle_jira_error(e: Exception):
    """Converts httpx JIRA errors to FastAPI HTTPException with a clean message."""
    if isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        try:
            detail = e.response.json()
            msg = detail.get("errorMessages", [str(e)])[0] if detail.get("errorMessages") else \
                  str(detail.get("errors", str(e)))
        except Exception:
            msg = f"JIRA API error: HTTP {status}"
        if status == 401:
            msg = "Invalid JIRA credentials. Check your email and API token."
        elif status == 403:
            msg = "Permission denied. Your JIRA account may not have access to this resource."
        elif status == 404:
            msg = "Ticket not found. Check the issue key and JIRA domain."
        raise HTTPException(status_code=status, detail=msg)
    raise HTTPException(status_code=500, detail=str(e))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/connect")
async def connect(
    x_jira_domain: str = Header(...),
    x_jira_email: str = Header(...),
    x_jira_token: str = Header(...),
):
    """
    Tests JIRA credentials by calling /myself.
    Returns user display name, email, and avatar URL on success.
    Frontend calls this after user enters credentials to verify them.
    """
    try:
        user = await test_connection(x_jira_domain, x_jira_email, x_jira_token)
        return {"connected": True, "user": user}
    except Exception as e:
        _handle_jira_error(e)


@router.get("/ticket/{issue_key}")
async def fetch_ticket(
    issue_key: str,
    x_jira_domain: str = Header(...),
    x_jira_email: str = Header(...),
    x_jira_token: str = Header(...),
):
    """
    Fetches a JIRA ticket by key (e.g. QA-123).
    Returns structured ticket data for use in JIRA tools.
    """
    try:
        ticket = await get_ticket(x_jira_domain, x_jira_email, x_jira_token, issue_key)
        return ticket
    except Exception as e:
        _handle_jira_error(e)


class CreateTicketRequest(BaseModel):
    project_key: str
    issue_type: str = "Bug"
    summary: str
    description: str
    priority: str = "Medium"
    labels: list[str] = []


@router.post("/ticket")
async def create_new_ticket(
    body: CreateTicketRequest,
    x_jira_domain: str = Header(...),
    x_jira_email: str = Header(...),
    x_jira_token: str = Header(...),
):
    """
    Creates a new JIRA ticket.
    Returns the new issue key and URL.
    """
    try:
        result = await create_ticket(
            domain=x_jira_domain,
            email=x_jira_email,
            api_token=x_jira_token,
            project_key=body.project_key,
            issue_type=body.issue_type,
            summary=body.summary,
            description=body.description,
            priority=body.priority,
            labels=body.labels,
        )
        return result
    except Exception as e:
        _handle_jira_error(e)


class CommentRequest(BaseModel):
    comment: str


@router.post("/ticket/{issue_key}/comment")
async def post_comment(
    issue_key: str,
    body: CommentRequest,
    x_jira_domain: str = Header(...),
    x_jira_email: str = Header(...),
    x_jira_token: str = Header(...),
):
    """
    Posts a comment to an existing JIRA ticket.
    Returns created comment metadata.
    """
    try:
        result = await add_comment(
            x_jira_domain, x_jira_email, x_jira_token, issue_key, body.comment
        )
        return result
    except Exception as e:
        _handle_jira_error(e)


class SearchRequest(BaseModel):
    jql: str
    max_results: int = 20


@router.post("/search")
async def search(
    body: SearchRequest,
    x_jira_domain: str = Header(...),
    x_jira_email: str = Header(...),
    x_jira_token: str = Header(...),
):
    """
    Searches JIRA tickets using a JQL query.
    Returns matching tickets with key, summary, status, priority.
    """
    try:
        results = await search_issues(
            x_jira_domain, x_jira_email, x_jira_token, body.jql, body.max_results
        )
        return {"issues": results, "total": len(results)}
    except Exception as e:
        _handle_jira_error(e)


@router.get("/projects")
async def list_projects(
    x_jira_domain: str = Header(...),
    x_jira_email: str = Header(...),
    x_jira_token: str = Header(...),
):
    """
    Lists all JIRA projects accessible to the authenticated user.
    Used to populate project selector in Bug Creator.
    """
    try:
        projects = await get_projects(x_jira_domain, x_jira_email, x_jira_token)
        return {"projects": projects}
    except Exception as e:
        _handle_jira_error(e)
