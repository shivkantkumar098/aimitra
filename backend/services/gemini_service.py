"""
Google Gemini API service.

Uses Gemini's own REST API format (NOT OpenAI-compatible).
Key differences from Groq/DIAL:
  - Auth via query param (?key=...) not Authorization header
  - Role names: 'model' instead of 'assistant'
  - Request body uses 'contents' + 'system_instruction' (not 'messages')
  - Response body uses candidates[0].content.parts[0].text
  - Streaming uses alt=sse query param

To add a new Gemini model:
  1. Add model ID to frontend/src/utils/capabilities.js (provider: "gemini")
  2. No backend changes needed — model ID is passed directly in the URL
"""

import asyncio
import json
from typing import AsyncGenerator

import httpx

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def _build_request_body(
    system_prompt: str,
    user_message: str,
    temperature: float,
    history: list[dict] | None = None,
) -> dict:
    """
    Builds the Gemini-specific request body.

    Gemini uses 'contents' array (not 'messages') with role 'model' (not 'assistant').
    system_instruction is a separate top-level field, not a message role.
    History items are mapped: assistant → model to match Gemini's expected format.
    """
    contents = []

    if history:
        for msg in history:
            # Gemini requires 'model' not 'assistant' for AI turns
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    # Current user message appended last
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    return {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 8192,
            "topP": 0.95,
        },
    }


async def generate_response(
    api_key: str,
    model: str,
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    history: list[dict] | None = None,
) -> str:
    """
    Non-streaming Gemini call.

    Retries up to 3 times on 429 (rate limit), respecting Retry-After header.
    Extracts text from candidates[0].content.parts[0].text in the response.
    """
    url = f"{GEMINI_BASE_URL}/{model}:generateContent?key={api_key}"
    body = _build_request_body(system_prompt, user_message, temperature, history)

    for attempt in range(3):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=body)
            if response.status_code == 429 and attempt < 2:
                # Wait for as long as Gemini says, default 10s
                retry_after = int(response.headers.get("Retry-After", 10))
                await asyncio.sleep(retry_after)
                continue
            response.raise_for_status()
            data = response.json()
            break

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected Gemini response format: {data}") from e


async def stream_response(
    api_key: str,
    model: str,
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming Gemini call using Server-Sent Events (alt=sse).

    Uses exponential backoff on 429: waits 15s, 30s, then 60s before giving up.
    Yields a user-visible retry message so the frontend shows progress during wait.
    Parses candidates[0].content.parts[0].text from each SSE chunk.
    """
    url = f"{GEMINI_BASE_URL}/{model}:streamGenerateContent?key={api_key}&alt=sse"
    body = _build_request_body(system_prompt, user_message, temperature, history)

    backoff = [15, 30, 60]  # seconds to wait per retry attempt
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=body) as response:
                if response.status_code == 429:
                    if attempt < 2:
                        wait = backoff[attempt]
                        # Yield visible message so user sees retry happening
                        yield f"\n⏳ Rate limited — retrying in {wait}s (attempt {attempt + 1}/3)...\n"
                        await asyncio.sleep(wait)
                        continue
                    raise httpx.HTTPStatusError(
                        "Rate limit exceeded after 3 retries. Please wait ~1 minute and try again.",
                        request=response.request,
                        response=response,
                    )
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:]
                    if raw.strip() == "[DONE]":
                        return
                    try:
                        chunk = json.loads(raw)
                        text = chunk["candidates"][0]["content"]["parts"][0]["text"]
                        if text:
                            yield text
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue  # skip malformed or empty chunks
                return  # successfully finished — exit retry loop
