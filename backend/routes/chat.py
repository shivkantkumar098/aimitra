"""Chat routes — /api/chat (non-streaming) and /api/chat/stream (SSE)."""

import json

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.gemini_service import generate_response, stream_response
from utils.prompt_router import build_prompt

router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    mode: str = "text_generation"
    api_key: str
    model: str = "gemini-2.0-flash-lite"
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    streaming: bool = False
    history: list[Message] = []


def _raise_http_error(e: Exception):
    if isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        try:
            detail = e.response.json().get("error", {}).get("message", str(e))
        except Exception:
            detail = f"HTTP {status} from Gemini API"
        # Scrub any API key from the detail string
        import re
        detail = re.sub(r"key=[^&\s'\"]+", "key=***", detail)
        raise HTTPException(status_code=status, detail=detail)
    raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def chat(req: ChatRequest):
    if not req.api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    system_prompt, user_message = build_prompt(req.mode, req.message)
    history = [{"role": m.role, "content": m.content} for m in req.history]

    try:
        text = await generate_response(
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
    if not req.api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    system_prompt, user_message = build_prompt(req.mode, req.message)
    history = [{"role": m.role, "content": m.content} for m in req.history]

    async def event_generator():
        try:
            async for chunk in stream_response(
                api_key=req.api_key,
                model=req.model,
                system_prompt=system_prompt,
                user_message=user_message,
                temperature=req.temperature,
                history=history,
            ):
                data = json.dumps({"chunk": chunk})
                yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            import re
            safe_err = re.sub(r"key=[^&\s'\"]+", "key=***", str(e))
            error_data = json.dumps({"error": safe_err})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
