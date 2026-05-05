"""
Chat routes.

Endpoints:
  POST /api/chat         — non-streaming, returns full response as JSON
  POST /api/chat/stream  — streaming, returns SSE (Server-Sent Events)

Provider selection is done automatically by _pick_service() based on the
model ID sent in the request. No provider field is needed from the frontend.

To add a new provider:
  1. Create backend/services/myprovider_service.py
  2. Import it here
  3. Add its model IDs to a new set (e.g. MYPROVIDER_MODELS)
  4. Add a branch in _pick_service()
"""

import json
import re

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import services.anthropic_service as anthropic_svc
import services.gemini_service as gemini_svc
import services.groq_service as groq_svc
from services.openai_compat_service import OpenAICompatProvider
from utils.prompt_router import build_prompt

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Model IDs that belong to the Groq provider
# When adding a new Groq model, add its ID here AND in frontend/src/utils/capabilities.js
GROQ_MODELS = {
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-8b-8192",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
}

# Model IDs that belong to the Anthropic provider (direct API)
ANTHROPIC_MODELS = {
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
}

# Base URLs for OpenAI-compatible providers
# Add new providers here — no extra service file needed
OPENAI_COMPAT_URLS: dict[str, str] = {
    "openai":      "https://api.openai.com/v1",
    "mistral":     "https://api.mistral.ai/v1",
    "deepseek":    "https://api.deepseek.com/v1",
    "xai":         "https://api.x.ai/v1",
    "together":    "https://api.together.xyz/v1",
    "perplexity":  "https://api.perplexity.ai",
    "cerebras":    "https://api.cerebras.ai/v1",
    "openrouter":  "https://openrouter.ai/api/v1",
    "fireworks":   "https://api.fireworks.ai/inference/v1",
    "cohere":      "https://api.cohere.com/compatibility/v1",
}

# Extra headers required by certain providers
OPENAI_COMPAT_EXTRA_HEADERS: dict[str, dict] = {
    "openrouter": {
        "HTTP-Referer": "https://aimitra.app",
        "X-Title": "AiMitra",
    },
}


def _pick_service(model: str, provider: str = ""):
    """
    Returns the correct service for the given provider/model.

    Provider-based routing takes priority over legacy model-ID sets.
    Falls back to model-ID detection for backwards compatibility.
    """
    if provider in OPENAI_COMPAT_URLS:
        extra = OPENAI_COMPAT_EXTRA_HEADERS.get(provider, {})
        return OpenAICompatProvider(OPENAI_COMPAT_URLS[provider], extra)
    if provider == "groq":
        return groq_svc
    if provider == "gemini":
        return gemini_svc
    if provider == "anthropic":
        return anthropic_svc
    # Legacy model-ID fallback
    if model in GROQ_MODELS:
        return groq_svc
    if model in ANTHROPIC_MODELS:
        return anthropic_svc
    return gemini_svc


def _scrub(text: str) -> str:
    """
    Removes API keys from error strings before they reach the frontend.
    Matches patterns like 'key=abc123' and 'Bearer abc123'.
    """
    return re.sub(r"(key=|Bearer )[^\s&'\"]+", r"\1***", text)


def _raise_http_error(e: Exception):
    """
    Converts httpx HTTP errors into FastAPI HTTPException.
    Extracts the provider's error message from the response body.
    Scrubs any API keys from the message before raising.
    """
    if isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        try:
            body = e.response.json()
            detail = body.get("error", {}).get("message") or str(e)
        except Exception:
            detail = f"HTTP {status} error from AI provider"
        raise HTTPException(status_code=status, detail=_scrub(detail))
    raise HTTPException(status_code=500, detail=_scrub(str(e)))


class Message(BaseModel):
    """Single chat history message — role is 'user' or 'assistant'."""
    role: str
    content: str


class ChatRequest(BaseModel):
    """
    Validated request body for both chat endpoints.

    Fields:
      message     — the user's current input text
      mode        — capability mode ID (maps to prompt in prompt_router.py)
      api_key     — provider API key (sent from frontend localStorage)
      model       — model ID
      provider    — provider ID (used for routing; overrides model-ID detection)
      temperature — 0.0 (precise) to 1.0 (creative)
      streaming   — if True, use SSE endpoint instead
      history     — last N messages for conversation context
    """
    message: str
    mode: str = "text_generation"
    api_key: str
    model: str = "llama-3.3-70b-versatile"
    provider: str = ""
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    streaming: bool = True
    history: list[Message] = []


@router.post("")
async def chat(req: ChatRequest):
    """
    Non-streaming chat endpoint.

    Flow:
      1. Validate API key presence
      2. Build (system_prompt, user_message) from capability mode
      3. Pick correct service module based on model
      4. Call generate_response() — waits for full response
      5. Return {"response": text, "mode": mode}
    """
    if not req.api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    system_prompt, user_message = build_prompt(req.mode, req.message)
    history = [{"role": m.role, "content": m.content} for m in req.history]
    svc = _pick_service(req.model, req.provider)

    try:
        text = await svc.generate_response(
            api_key=req.api_key,
            model=req.model,
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=req.temperature,
            history=history,
        )
        return {"response": text, "mode": req.mode}
    except Exception as e:
        _raise_http_error(e)


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """
    Streaming chat endpoint using Server-Sent Events (SSE).

    Flow:
      1. Validate API key presence
      2. Build (system_prompt, user_message) from capability mode
      3. Pick correct service module based on model
      4. Return StreamingResponse wrapping event_generator()

    SSE format sent to frontend:
      data: {"chunk": "token text here"}\n\n   ← for each token
      data: [DONE]\n\n                          ← when finished
      data: {"error": "message"}\n\n            ← on failure
    """
    if not req.api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    system_prompt, user_message = build_prompt(req.mode, req.message)
    history = [{"role": m.role, "content": m.content} for m in req.history]
    svc = _pick_service(req.model, req.provider)

    async def event_generator():
        """
        Async generator that wraps provider stream chunks into SSE format.
        Catches exceptions and sends them as error events so the frontend
        can display the message instead of silently hanging.
        """
        try:
            async for chunk in svc.stream_response(
                api_key=req.api_key,
                model=req.model,
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=req.temperature,
                history=history,
            ):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': _scrub(str(e))})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disables nginx buffering for true streaming
        },
    )
