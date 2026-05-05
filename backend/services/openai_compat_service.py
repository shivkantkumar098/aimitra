"""
Generic OpenAI-compatible API service.

Handles any provider that implements the OpenAI chat completions format:
  POST {base_url}/chat/completions
  Authorization: Bearer {api_key}
  Body: { model, messages, temperature, stream, max_tokens }

Providers using this service:
  openai      — https://api.openai.com/v1
  mistral     — https://api.mistral.ai/v1
  deepseek    — https://api.deepseek.com/v1
  xai         — https://api.x.ai/v1
  together    — https://api.together.xyz/v1
  perplexity  — https://api.perplexity.ai
  cerebras    — https://api.cerebras.ai/v1
  openrouter  — https://openrouter.ai/api/v1
  fireworks   — https://api.fireworks.ai/inference/v1
  cohere      — https://api.cohere.com/compatibility/v1

Instantiate with base_url and optional extra_headers, then call
generate_response() or stream_response() with the same signature
used by all other provider services.
"""

import asyncio
import json
from typing import AsyncGenerator

import httpx

MAX_HISTORY = 6
MAX_MSG_CHARS = 2000


class OpenAICompatProvider:
    def __init__(self, base_url: str, extra_headers: dict | None = None):
        self.url = base_url.rstrip("/") + "/chat/completions"
        self.extra_headers = extra_headers or {}

    def _headers(self, api_key: str) -> dict:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            **self.extra_headers,
        }

    def _build_messages(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict] | None,
        image_base64: str | None = None,
        image_mime_type: str = "image/png",
    ) -> list[dict]:
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            for msg in history[-MAX_HISTORY:]:
                messages.append(
                    {"role": msg["role"], "content": msg["content"][:MAX_MSG_CHARS]}
                )
        if image_base64:
            user_content = [
                {"type": "image_url", "image_url": {"url": f"data:{image_mime_type};base64,{image_base64}"}},
                {"type": "text", "text": user_message},
            ]
        else:
            user_content = user_message
        messages.append({"role": "user", "content": user_content})
        return messages

    async def generate_response(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.7,
        history: list[dict] | None = None,
        image_base64: str | None = None,
        image_mime_type: str = "image/png",
    ) -> str:
        body = {
            "model": model,
            "messages": self._build_messages(system_prompt, user_message, history, image_base64, image_mime_type),
            "temperature": temperature,
            "max_tokens": 4096,
            "stream": False,
        }
        data = None
        for attempt in range(3):
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.url, json=body, headers=self._headers(api_key)
                )
                if response.status_code == 429 and attempt < 2:
                    wait = int(response.headers.get("retry-after", 10 * (attempt + 1)))
                    await asyncio.sleep(wait)
                    continue
                response.raise_for_status()
                data = response.json()
                break
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise ValueError(f"Unexpected response: {data}") from e

    async def stream_response(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.7,
        history: list[dict] | None = None,
        image_base64: str | None = None,
        image_mime_type: str = "image/png",
    ) -> AsyncGenerator[str, None]:
        body = {
            "model": model,
            "messages": self._build_messages(system_prompt, user_message, history, image_base64, image_mime_type),
            "temperature": temperature,
            "max_tokens": 4096,
            "stream": True,
        }
        backoff = [10, 20, 40]
        for attempt in range(3):
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST", self.url, json=body, headers=self._headers(api_key)
                ) as response:
                    if response.status_code == 429:
                        if attempt < 2:
                            wait = int(
                                response.headers.get("retry-after", backoff[attempt])
                            )
                            yield f"\n⏳ Rate limited — retrying in {wait}s...\n"
                            await asyncio.sleep(wait)
                            continue
                        raise httpx.HTTPStatusError(
                            "Rate limit exceeded.",
                            request=response.request,
                            response=response,
                        )
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            return
                        try:
                            chunk = json.loads(raw)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                    return
