"""
Groq API service.

Groq uses the standard OpenAI-compatible API format.
Auth: Authorization: Bearer {api_key}
URL: https://api.groq.com/openai/v1/chat/completions
Model is passed in the request body (not the URL).

Free tier: ~30 RPM. Much more generous than Gemini free tier.
To add a new Groq model:
  1. Add model ID to frontend/src/utils/capabilities.js (provider: "groq")
  2. Add model ID to GROQ_MODELS set in backend/routes/chat.py
"""

import asyncio
import json
from typing import AsyncGenerator

import httpx

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# History limits to avoid 413 Payload Too Large errors
MAX_HISTORY = 6        # only last 6 messages sent to API
MAX_MSG_CHARS = 2000   # each message truncated to 2000 chars


def _build_messages(system_prompt: str, user_message: str, history: list[dict] | None) -> list[dict]:
    """
    Builds OpenAI-format messages array.

    Structure: [system, ...history (last 6), user]
    History messages are truncated to MAX_MSG_CHARS to avoid payload size errors.
    """
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for msg in history[-MAX_HISTORY:]:
            messages.append({"role": msg["role"], "content": msg["content"][:MAX_MSG_CHARS]})
    messages.append({"role": "user", "content": user_message})
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
    Non-streaming Groq call.

    Retries up to 3 times on 429 with 10s / 20s backoff.
    Extracts text from choices[0].message.content.
    """
    url = f"{GROQ_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": model,
        "messages": _build_messages(system_prompt, user_message, history),
        "temperature": temperature,
        "max_tokens": 4096,
        "stream": False,
    }

    for attempt in range(3):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code == 429 and attempt < 2:
                await asyncio.sleep(10 * (attempt + 1))  # 10s, then 20s
                continue
            response.raise_for_status()
            data = response.json()
            break

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected Groq response: {data}") from e


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
    Streaming Groq call.

    Retries with backoff 10s/20s/40s on 429.
    Parses choices[0].delta.content from each SSE line.
    Skips lines where delta.content is empty (role/finish_reason lines).
    """
    url = f"{GROQ_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {
        "model": model,
        "messages": _build_messages(system_prompt, user_message, history),
        "temperature": temperature,
        "max_tokens": 4096,
        "stream": True,
    }

    backoff = [10, 20, 40]
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=body, headers=headers) as response:
                if response.status_code == 429:
                    if attempt < 2:
                        wait = backoff[attempt]
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
                    if raw == "[DONE]":
                        return  # stream complete
                    try:
                        chunk = json.loads(raw)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue  # skip empty/malformed chunks
                return  # successfully finished — exit retry loop
