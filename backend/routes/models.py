"""
/api/models — fetch available models directly from each provider's API.
Falls back gracefully; never crashes if a provider is unavailable.
"""

from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/api", tags=["models"])

# Base URLs for providers that expose OpenAI-compatible /models endpoints
_COMPAT_URLS: dict[str, str] = {
    "openai":      "https://api.openai.com/v1/models",
    "mistral":     "https://api.mistral.ai/v1/models",
    "deepseek":    "https://api.deepseek.com/v1/models",
    "xai":         "https://api.x.ai/v1/models",
    "together":    "https://api.together.xyz/v1/models",
    "cerebras":    "https://api.cerebras.ai/v1/models",
    "openrouter":  "https://openrouter.ai/api/v1/models",
    "fireworks":   "https://api.fireworks.ai/inference/v1/models",
    "cohere":      "https://api.cohere.com/compatibility/v1/models",
    "groq":        "https://api.groq.com/openai/v1/models",
    "perplexity":  "https://api.perplexity.ai/models",
}

# Extra headers some providers require
_EXTRA_HEADERS: dict[str, dict] = {
    "openrouter": {
        "HTTP-Referer": "https://aimitra.app",
        "X-Title": "AiMitra",
    },
}


def _logo(model_id: str, provider: str) -> str:
    """Infer the logo provider from model ID."""
    mid = model_id.lower()
    if any(k in mid for k in ("llama", "meta-llama")): return "meta"
    if any(k in mid for k in ("gemma",)):               return "google"
    if any(k in mid for k in ("qwen",)):                return "qwen"
    if any(k in mid for k in ("mixtral", "mistral")):   return "mistral"
    if any(k in mid for k in ("deepseek",)):            return "deepseek"
    if any(k in mid for k in ("gpt", "dall", "text-embedding", "tts", "whisper")):
        return "openai"
    if any(k in mid for k in ("o1", "o3")):             return "openai"
    if any(k in mid for k in ("claude",)):              return "anthropic"
    if any(k in mid for k in ("gemini",)):              return "google"
    if any(k in mid for k in ("grok",)):                return "xai"
    if any(k in mid for k in ("command",)):             return "cohere"
    if any(k in mid for k in ("sonar", "r1-1776")):     return "perplexity"
    if any(k in mid for k in ("phi-", "phi4")):         return "microsoft"
    _map = {
        "openai": "openai", "anthropic": "anthropic", "gemini": "google",
        "groq": "groq", "mistral": "mistral", "deepseek": "deepseek",
        "xai": "xai", "together": "meta", "perplexity": "perplexity",
        "cerebras": "cerebras", "openrouter": "openrouter",
        "fireworks": "fireworks", "cohere": "cohere",
    }
    return _map.get(provider, provider)


def _fmt_name(model_id: str, display_hint: str | None = None) -> str:
    """Return a human-readable model name."""
    if display_hint:
        return display_hint
    # Strip path prefixes (e.g. accounts/fireworks/models/foo -> foo)
    name = model_id.split("/")[-1]
    # Capitalise known tokens
    _subs = {
        "gpt": "GPT", "llama": "Llama", "claude": "Claude", "gemini": "Gemini",
        "gemma": "Gemma", "mistral": "Mistral", "deepseek": "DeepSeek",
        "qwen": "Qwen", "mixtral": "Mixtral", "sonar": "Sonar", "grok": "Grok",
        "codestral": "Codestral", "phi": "Phi", "command": "Command",
        "nemo": "Nemo", "turbo": "Turbo", "mini": "Mini", "lite": "Lite",
        "flash": "Flash", "pro": "Pro", "ultra": "Ultra", "nano": "Nano",
        "instant": "Instant", "versatile": "Versatile", "instruct": "Instruct",
        "chat": "Chat", "reasoner": "Reasoner", "thinking": "Thinking",
    }
    parts = name.replace("-", " ").replace("_", " ").replace(".", " ").split()
    result = []
    for p in parts:
        low = p.lower()
        result.append(_subs.get(low, p.upper() if len(p) <= 3 else p.capitalize()))
    return " ".join(result)


async def _fetch_compat(provider: str, api_key: str) -> list[dict] | None:
    """Fetch from an OpenAI-compatible /models endpoint."""
    url = _COMPAT_URLS[provider]
    headers = {"Authorization": f"Bearer {api_key}", **_EXTRA_HEADERS.get(provider, {})}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers=headers)
        if r.status_code != 200:
            return None
        data = r.json().get("data", [])
        models = []
        for m in data:
            mid = m.get("id", "")
            if not mid:
                continue
            # Skip non-chat models from OpenAI (embeddings, tts, etc.)
            if provider == "openai" and any(
                x in mid for x in ("embedding", "tts", "whisper", "dall-e", "moderation", "babbage", "davinci", "ada", "curie")
            ):
                continue
            # OpenRouter has a `name` field; use it as display hint
            hint = m.get("name") or m.get("display_name") or None
            models.append({
                "id": mid,
                "name": _fmt_name(mid, hint),
                "provider": provider,
                "logoProvider": _logo(mid, provider),
            })
        # Sort by id for consistent ordering
        models.sort(key=lambda x: x["id"])
        return models if models else None
    except Exception:
        return None


async def _fetch_anthropic(api_key: str) -> list[dict] | None:
    url = "https://api.anthropic.com/v1/models"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers=headers)
        if r.status_code != 200:
            return None
        data = r.json().get("data", [])
        models = []
        for m in data:
            mid = m.get("id", "")
            if not mid:
                continue
            models.append({
                "id": mid,
                "name": _fmt_name(mid, m.get("display_name")),
                "provider": "anthropic",
                "logoProvider": "anthropic",
            })
        models.sort(key=lambda x: x["id"])
        return models if models else None
    except Exception:
        return None


async def _fetch_gemini(api_key: str) -> list[dict] | None:
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}&pageSize=50"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
        if r.status_code != 200:
            return None
        raw = r.json().get("models", [])
        models = []
        for m in raw:
            # Only keep models that can generate content
            methods = m.get("supportedGenerationMethods", [])
            if "generateContent" not in methods:
                continue
            # name is like "models/gemini-2.0-flash" — strip prefix
            full_name = m.get("name", "")
            mid = full_name.replace("models/", "")
            if not mid:
                continue
            models.append({
                "id": mid,
                "name": _fmt_name(mid, m.get("displayName")),
                "provider": "gemini",
                "logoProvider": "google",
            })
        models.sort(key=lambda x: x["id"])
        return models if models else None
    except Exception:
        return None


@router.get("/models")
async def get_models(provider: str, api_key: str):
    """
    Fetch available models from the provider's live API.
    Returns {"models": [...], "source": "live"} on success,
    or {"models": [], "source": "error", "detail": "..."} on failure.
    """
    if not provider or not api_key:
        return {"models": [], "source": "error", "detail": "provider and api_key are required"}

    result = None

    if provider == "anthropic":
        result = await _fetch_anthropic(api_key)
    elif provider == "gemini":
        result = await _fetch_gemini(api_key)
    elif provider in _COMPAT_URLS:
        result = await _fetch_compat(provider, api_key)

    if result:
        return {"models": result, "source": "live"}
    return {"models": [], "source": "error", "detail": f"Could not fetch models for provider '{provider}'"}
