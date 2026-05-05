"""
Anthropic API service.

Uses the Anthropic Messages API (not OpenAI-compatible).
Auth: x-api-key header + anthropic-version header.
URL: https://api.anthropic.com/v1/messages

Streaming uses Anthropic's own SSE event format:
  event: content_block_delta  →  delta.text contains the token
  event: message_stop         →  stream is complete

To add a new Anthropic model:
  1. Add model ID to frontend/src/utils/capabilities.js (provider: "anthropic")
  2. Add model ID to ANTHROPIC_MODELS set in backend/routes/chat.py
"""

import asyncio
import json
from typing import AsyncGenerator

import httpx

ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

MAX_HISTORY = 6
MAX_MSG_CHARS = 2000


def _build_messages(
    user_message: str,
    history: list[dict] | None,
    image_base64: str | None = None,
    image_mime_type: str = "image/png",
) -> list[dict]:
    """
    Builds Anthropic-format messages array (no system message — passed separately).

    Structure: [...history (last 6), user]
    Roles must strictly alternate user/assistant; history is assumed well-formed.
    When image_base64 is provided, the user message uses a content array with
    an image block followed by a text block (Anthropic vision format).
    """
    messages = []
    if history:
        for msg in history[-MAX_HISTORY:]:
            messages.append({"role": msg["role"], "content": msg["content"][:MAX_MSG_CHARS]})
    if image_base64:
        content = [
            {"type": "image", "source": {"type": "base64", "media_type": image_mime_type, "data": image_base64}},
            {"type": "text", "text": user_message},
        ]
    else:
        content = user_message
    messages.append({"role": "user", "content": content})
    return messages


async def generate_response(
    api_key: str,
    model: str,
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    history: list[dict] | None = None,
    image_base64: str | None = None,
    image_mime_type: str = "image/png",
) -> str:
    """
    Non-streaming Anthropic call.

    Retries up to 3 times on 429 with 10s / 20s backoff.
    Extracts text from content[0].text.
    """
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "max_tokens": 4096,
        "temperature": temperature,
        "system": system_prompt,
        "messages": _build_messages(user_message, history, image_base64, image_mime_type),
    }

    data = None
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(ANTHROPIC_BASE_URL, json=body, headers=headers)
            if response.status_code == 429 and attempt < 2:
                wait = int(response.headers.get("retry-after", 10 * (attempt + 1)))
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()
            break

    try:
        return data["content"][0]["text"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected Anthropic response: {data}") from e


async def stream_response(
    api_key: str,
    model: str,
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    history: list[dict] | None = None,
    image_base64: str | None = None,
    image_mime_type: str = "image/png",
) -> AsyncGenerator[str, None]:
    """
    Streaming Anthropic call.

    Retries with backoff 10s/20s/40s on 429.
    Yields text from content_block_delta events (delta.type == "text_delta").
    Ignores all other event types (message_start, content_block_start, etc.).
    """
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "max_tokens": 4096,
        "temperature": temperature,
        "system": system_prompt,
        "messages": _build_messages(user_message, history, image_base64, image_mime_type),
        "stream": True,
    }

    backoff = [10, 20, 40]
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", ANTHROPIC_BASE_URL, json=body, headers=headers) as response:
                if response.status_code == 429:
                    if attempt < 2:
                        wait = int(response.headers.get("retry-after", backoff[attempt]))
                        yield f"\n⏳ Rate limited — retrying in {wait}s...\n"
                        await asyncio.sleep(wait)
                        continue
                    raise httpx.HTTPStatusError(
                        "Rate limit exceeded. Please wait a moment.",
                        request=response.request,
                        response=response,
                    )
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:].strip()
                    if not raw:
                        continue
                    try:
                        event = json.loads(raw)
                        if event.get("type") == "content_block_delta":
                            delta = event.get("delta", {})
                            if delta.get("type") == "text_delta":
                                text = delta.get("text", "")
                                if text:
                                    yield text
                        elif event.get("type") == "message_stop":
                            return
                    except (json.JSONDecodeError, KeyError):
                        continue
                return
