"""
EPAM DIAL API service.

DIAL is EPAM's AI proxy at https://ai-proxy.lab.epam.com
It exposes a standard OpenAI-compatible API — NOT the Azure Deployments format.

Correct URL: https://ai-proxy.lab.epam.com/openai/v1/chat/completions
             with model name in request BODY

Wrong URL (Azure format, gives 404):
             https://ai-proxy.lab.epam.com/openai/deployments/{model}/chat/completions

Auth: Authorization: Bearer {api_key}

Available models (as of 2025):
  - gpt-4o-mini-2024-07-18  (cheapest, recommended for testing)
  - gpt-4o
  - gemini-2.5-flash
  - anthropic.claude-3-7-sonnet-20250219-v1:0  (most expensive — use sparingly)

To see full model list: GET https://ai-proxy.lab.epam.com/openai/models

To add a new DIAL model:
  1. Add model ID to frontend/src/utils/capabilities.js (provider: "dial")
  2. Add model ID to DIAL_MODELS set in backend/routes/chat.py
"""

import asyncio
import json
from typing import AsyncGenerator

import httpx

DIAL_ENDPOINT = "https://ai-proxy.lab.epam.com"
CHAT_URL = f"{DIAL_ENDPOINT}/openai/v1/chat/completions"  # OpenAI-compatible endpoint

# History limits to avoid 413 Payload Too Large errors
MAX_HISTORY = 6        # only last 6 messages sent to API
MAX_MSG_CHARS = 2000   # each message truncated to 2000 chars


def _headers(api_key: str) -> dict:
    """Returns auth headers for DIAL — uses Bearer token (OpenAI style)."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _build_messages(system_prompt: str, user_message: str, history: list[dict] | None) -> list[dict]:
    """
    Builds OpenAI-format messages array for DIAL.

    Structure: [system, ...history (last 6, truncated), user]
    Same format as Groq since both are OpenAI-compatible.
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
    Non-streaming DIAL call.

    Model is passed in the request body — not in the URL path.
    Retries up to 3 times on 429 with 10s/20s backoff.
    Extracts text from choices[0].message.content.
    """
    body = {
        "model": model,       # model in body, not URL — key difference from Azure format
        "messages": _build_messages(system_prompt, user_message, history),
        "temperature": temperature,
        "max_tokens": 4096,
        "stream": False,
    }

    for attempt in range(3):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(CHAT_URL, json=body, headers=_headers(api_key))
            if response.status_code == 429 and attempt < 2:
                await asyncio.sleep(10 * (attempt + 1))  # 10s, then 20s
                continue
            response.raise_for_status()
            data = response.json()
            break

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected DIAL response: {data}") from e


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
    Streaming DIAL call.

    Retries with backoff 10s/20s/40s on 429.
    SSE format is identical to Groq/OpenAI — parses choices[0].delta.content.
    """
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
            async with client.stream("POST", CHAT_URL, json=body, headers=_headers(api_key)) as response:
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
                        return  # stream finished
                    try:
                        chunk = json.loads(raw)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue  # skip empty or malformed chunks
                return  # successfully finished — exit retry loop
