"""
Auth routes — user authentication via Supabase Auth.

Endpoints:
  POST /api/auth/signup  — register a new user
  POST /api/auth/login   — sign in and receive JWT tokens
  POST /api/auth/logout  — invalidate the current session
  GET  /api/auth/me      — validate a Bearer token and return the user

Setup:
  Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env.
  If not set, all auth endpoints return HTTP 503.

Token flow:
  login → returns { access_token, refresh_token }
  Subsequent requests send: Authorization: Bearer {access_token}
  /me validates the token and returns { id, email }

Note: Email confirmation may be required after signup depending on Supabase project settings.
"""

import os

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

_client = None


def _get_client():
    """
    Lazy-initialises and returns the Supabase client singleton.

    Raises HTTP 503 if SUPABASE_URL or SUPABASE_ANON_KEY env vars are missing,
    giving a clear message instead of an ImportError or AttributeError at call time.
    """
    global _client
    if _client is not None:
        return _client
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if not url or not key:
        raise HTTPException(
            status_code=503,
            detail="Auth not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.",
        )
    from supabase import create_client
    _client = create_client(url, key)
    return _client


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(body: AuthRequest):
    """
    POST /api/auth/signup — registers a new user with email + password.

    Returns access/refresh tokens if email confirmation is not required.
    Returns email_confirmation_required: true when Supabase needs email verification
    before the session is active (tokens will be null in that case).
    Raises 409 if the email is already registered.
    """
    client = _get_client()
    try:
        res = client.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as e:
        msg = str(e)
        if "already registered" in msg.lower() or "already exists" in msg.lower():
            raise HTTPException(409, "Email already registered. Please log in.")
        raise HTTPException(400, msg)

    if not res.user:
        raise HTTPException(400, "Signup failed. Please try again.")

    # Supabase may require email confirmation — session is None until confirmed
    return {
        "access_token": res.session.access_token if res.session else None,
        "refresh_token": res.session.refresh_token if res.session else None,
        "user": {"id": str(res.user.id), "email": res.user.email},
        "email_confirmation_required": res.session is None,
    }


@router.post("/login")
async def login(body: AuthRequest):
    """
    POST /api/auth/login — authenticates a user and returns JWT tokens.

    Returns { access_token, refresh_token, user: { id, email } } on success.
    Raises 401 for invalid credentials or unconfirmed email.
    """
    client = _get_client()
    try:
        res = client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        msg = str(e).lower()
        if "invalid login" in msg or "invalid credentials" in msg or "email not confirmed" in msg:
            raise HTTPException(401, "Invalid email or password.")
        raise HTTPException(401, str(e))

    if not res.user or not res.session:
        raise HTTPException(401, "Invalid email or password.")

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "user": {"id": str(res.user.id), "email": res.user.email},
        "email_confirmation_required": False,
    }


@router.post("/logout")
async def logout(authorization: str = Header(default=None)):
    """
    POST /api/auth/logout — invalidates the current Supabase session.

    Always returns { ok: true } — even if no session exists or sign_out fails,
    so the frontend can safely clear local token state.
    """
    client = _get_client()
    try:
        client.auth.sign_out()
    except Exception:
        pass
    return {"ok": True}


@router.get("/me")
async def me(authorization: str = Header(default=None)):
    """
    GET /api/auth/me — validates a Bearer token and returns the current user.

    Expects: Authorization: Bearer {access_token}
    Returns { id, email } on success.
    Raises 401 if the header is missing, malformed, or the token has expired.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "No token provided.")
    token = authorization[7:]
    client = _get_client()
    try:
        res = client.auth.get_user(token)
    except Exception:
        raise HTTPException(401, "Token invalid or expired. Please log in again.")
    if not res.user:
        raise HTTPException(401, "Token invalid or expired.")
    return {"id": str(res.user.id), "email": res.user.email}
