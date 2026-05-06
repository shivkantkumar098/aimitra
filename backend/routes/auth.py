"""Auth routes — signup / login / logout / me via Supabase Auth."""

import os

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

_client = None


def _get_client():
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
    client = _get_client()
    try:
        client.auth.sign_out()
    except Exception:
        pass
    return {"ok": True}


@router.get("/me")
async def me(authorization: str = Header(default=None)):
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
