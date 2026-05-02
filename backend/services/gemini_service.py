"""Gemini API service — handles both streaming and non-streaming requests."""

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
    contents = []

    if history:
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

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
    url = f"{GEMINI_BASE_URL}/{model}:generateContent?key={api_key}"
    body = _build_request_body(system_prompt, user_message, temperature, history)

    for attempt in range(3):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=body)
            if response.status_code == 429 and attempt < 2:
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
    url = f"{GEMINI_BASE_URL}/{model}:streamGenerateContent?key={api_key}&alt=sse"
    body = _build_request_body(system_prompt, user_message, temperature, history)

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=body) as response:
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 10))
                raise httpx.HTTPStatusError(
                    f"Rate limited. Please wait {retry_after}s and try again.",
                    request=response.request,
                    response=response,
                )
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                raw = line[6:]
                if raw.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(raw)
                    text = chunk["candidates"][0]["content"]["parts"][0]["text"]
                    if text:
                        yield text
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
