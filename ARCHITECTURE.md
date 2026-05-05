# QA Assistant AI — Architecture & Developer Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Request Flow](#request-flow)
3. [Folder Structure](#folder-structure)
4. [Backend Deep Dive](#backend-deep-dive)
5. [Frontend Deep Dive](#frontend-deep-dive)
6. [Provider Integration Map](#provider-integration-map)
7. [How to Add a New AI Provider](#how-to-add-a-new-ai-provider)
8. [How to Add a New Capability Mode](#how-to-add-a-new-capability-mode)
9. [How to Add a New Model](#how-to-add-a-new-model)
10. [Environment & Config Reference](#environment--config-reference)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                  │
│  ┌──────────────┐        ┌──────────────────────────────────┐   │
│  │   Sidebar    │        │         Chat Window              │   │
│  │              │        │                                  │   │
│  │ • Provider   │        │  • Message bubbles               │   │
│  │ • Model      │        │  • Markdown + syntax highlight   │   │
│  │ • API Keys   │        │  • Streaming token display       │   │
│  │   (per prov) │        │  • Welcome / capability grid     │   │
│  │ • Temp/Mode  │        │                                  │   │
│  └──────┬───────┘        └──────────────┬───────────────────┘   │
│         │  useConfig()                  │  useChat()            │
│         └───────────────┬───────────────┘                       │
│                         │  chatService.js                       │
│                         │  POST /api/chat  (non-stream)         │
│                         │  POST /api/chat/stream  (SSE)         │
└─────────────────────────┼───────────────────────────────────────┘
                          │  HTTP / SSE
┌─────────────────────────▼───────────────────────────────────────┐
│                      FastAPI Backend                            │
│                                                                  │
│   routes/chat.py                                                 │
│      │                                                           │
│      ├─ build_prompt(mode)  ◄── utils/prompt_router.py          │
│      │                                                           │
│      └─ _pick_service(model) ──► gemini_service.py              │
│                              ──► groq_service.py                │
│                              ──► dial_service.py                │
└──────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
  Google Gemini API    Groq API      EPAM DIAL API
  (generativelanguage) (api.groq.com) (ai-proxy.lab.epam.com)
```

---

## Request Flow

### Streaming Flow (default)

```
User types message
      │
      ▼
useChat.send(text, mode)
      │  builds history (last 6 msgs, truncated to 2000 chars each)
      │
      ▼
chatService.sendMessageStream()
      │  POST /api/chat/stream   ← fetch() with SSE reader
      │
      ▼
routes/chat.py  →  chat_stream()
      │  1. Validates API key
      │  2. build_prompt(mode, message)  → (system_prompt, user_message)
      │  3. _pick_service(model)         → correct provider module
      │
      ▼
{provider}_service.stream_response()
      │  Sends HTTP POST to AI provider
      │  Reads SSE chunks line by line
      │  Yields each text chunk
      │
      ▼
event_generator() in chat.py
      │  Wraps each chunk as:  data: {"chunk": "...text..."}\n\n
      │  Ends with:            data: [DONE]\n\n
      │
      ▼
chatService.js SSE reader
      │  Parses each data: line
      │  Calls onChunk(text)
      │
      ▼
useChat  →  appends chunk to assistant message in state
      │
      ▼
React re-render  →  user sees tokens appearing in real-time
```

### Non-Streaming Flow

```
User types message  →  useChat.send()  →  chatService.sendMessage()
  →  POST /api/chat  →  chat()  →  svc.generate_response()
  →  full text returned  →  added to messages state  →  render
```

---

## Folder Structure

```
qa-assitant-ai/
│
├── backend/
│   ├── main.py                    # FastAPI app, CORS, router registration
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variable template
│   │
│   ├── routes/
│   │   ├── chat.py                # POST /api/chat and /api/chat/stream
│   │   └── health.py              # GET /health, /api/models, /api/capabilities
│   │
│   ├── services/
│   │   ├── gemini_service.py      # Google Gemini REST API calls
│   │   ├── groq_service.py        # Groq OpenAI-compatible API calls
│   │   └── dial_service.py        # EPAM DIAL OpenAI-compatible API calls
│   │
│   └── utils/
│       └── prompt_router.py       # Mode → system prompt + prefix mapping
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   ├── public/
│   │   └── index.html
│   │
│   └── src/
│       ├── App.js                 # Root: wires config + chat + layout
│       ├── index.js               # React entry point
│       ├── index.css              # Tailwind + global styles + markdown styles
│       │
│       ├── hooks/
│       │   ├── useConfig.js       # Provider/model/apiKey state + localStorage
│       │   └── useChat.js         # Messages state, send(), newChat()
│       │
│       ├── services/
│       │   └── chatService.js     # sendMessage() and sendMessageStream()
│       │
│       ├── components/
│       │   ├── Sidebar.jsx        # Config panel + capability selector
│       │   ├── ChatWindow.jsx     # Layout: header + message list + input
│       │   ├── ChatInput.jsx      # Textarea + send button
│       │   ├── Message.jsx        # Single message bubble with markdown
│       │   ├── TypingIndicator.jsx# Animated dots while loading
│       │   └── WelcomeScreen.jsx  # Empty-state with capability grid
│       │
│       └── utils/
│           └── capabilities.js    # CAPABILITIES array + MODELS array
│
├── .gitignore
├── README.md
└── ARCHITECTURE.md                # This file
```

---

## Backend Deep Dive

### `main.py`
Entry point. Registers CORS middleware (allows frontend at port 3000) and mounts all routers.

### `routes/chat.py`

| Symbol | Role |
|---|---|
| `GROQ_MODELS` | Set of model IDs that should route to Groq service |
| `DIAL_MODELS` | Set of model IDs that should route to DIAL service |
| `_pick_service(model)` | Returns the correct service module based on model name |
| `_scrub(text)` | Removes API keys from error strings before sending to frontend |
| `_raise_http_error(e)` | Converts httpx HTTP errors into FastAPI HTTPException with safe message |
| `ChatRequest` | Pydantic model — validates every incoming request body |
| `chat()` | Non-streaming endpoint — waits for full response then returns JSON |
| `chat_stream()` | Streaming endpoint — returns SSE StreamingResponse with token chunks |
| `event_generator()` | Async generator inside chat_stream — wraps provider chunks into SSE format |

### `utils/prompt_router.py`

| Symbol | Role |
|---|---|
| `CAPABILITY_PROMPTS` | Dict mapping mode ID → `{system, prefix}`. System sets AI persona. Prefix prepends structured instructions to user input. |
| `build_prompt(mode, user_input)` | Looks up the mode config, returns `(system_prompt, full_user_message)` tuple consumed by every service |

### `services/gemini_service.py`

| Symbol | Role |
|---|---|
| `GEMINI_BASE_URL` | Base URL for Google Generative Language REST API |
| `_build_request_body()` | Constructs Gemini-specific request format: `system_instruction` + `contents` array with role mapping (`model` not `assistant`) |
| `generate_response()` | Non-streaming call. Retries up to 3× on 429 with `Retry-After` delay |
| `stream_response()` | Streaming call. Uses SSE (`alt=sse`). Retries with backoff 15s/30s/60s. Yields text chunks |

### `services/groq_service.py`

| Symbol | Role |
|---|---|
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` — standard OpenAI format |
| `_build_messages()` | Builds OpenAI-style messages array: system → history → user. Trims to last 6 history items, 2000 chars each |
| `generate_response()` | Non-streaming call with Bearer auth header. Retries on 429 |
| `stream_response()` | Streaming call. Parses `choices[0].delta.content` from each SSE chunk |

### `services/dial_service.py`

| Symbol | Role |
|---|---|
| `CHAT_URL` | `https://ai-proxy.lab.epam.com/openai/v1/chat/completions` — standard OpenAI format (NOT Azure Deployments path) |
| `_headers()` | Returns `Authorization: Bearer {key}` headers |
| `_build_messages()` | Same structure as Groq — OpenAI messages array |
| `generate_response()` | Non-streaming. Model passed in request body (not URL) |
| `stream_response()` | Streaming. Parses same OpenAI SSE format as Groq |

---

## Frontend Deep Dive

### `hooks/useConfig.js`

| Symbol | Role |
|---|---|
| `defaultConfig` | Initial state with provider, model, empty apiKeys object, temperature, streaming |
| `apiKeys` | Object storing one key per provider: `{ dial: "...", groq: "...", gemini: "..." }` — survives provider switches |
| `useState` initializer | Reads from localStorage on mount, migrates old single-key format |
| `updateConfig(updates)` | Deep-merges `apiKeys` patch, saves entire config to localStorage |
| `apiKey` (derived) | Always returns `config.apiKeys[config.provider]` — the active key |
| `setApiKey(key)` | Saves key only for current provider — other providers' keys untouched |

### `hooks/useChat.js`

| Symbol | Role |
|---|---|
| `messages` | Array of `{id, role, content, timestamp}` objects |
| `addMessage()` | Helper that creates a message object with unique ID |
| `send(text, mode)` | Core function: validates input, appends user message, calls streaming or non-streaming path, updates state with response chunks |
| `newChat()` | Resets all state — messages, error, loading |
| History slice | `messages.slice(-6)` — only last 6 messages sent to API to avoid 413 payload errors |

### `services/chatService.js`

| Symbol | Role |
|---|---|
| `API_BASE` | Backend URL, defaults to `http://localhost:8000`, overridable via `REACT_APP_API_URL` env var |
| `sendMessage()` | axios POST to `/api/chat` — used when streaming is OFF |
| `sendMessageStream()` | native `fetch()` POST to `/api/chat/stream` — reads SSE with `getReader()`, calls `onChunk` per token, `onError` on failure |

### `utils/capabilities.js`

| Symbol | Role |
|---|---|
| `CAPABILITIES` | Array of 9 capability objects — each has `id`, `label`, `icon`, `description`, `examples`. The `id` maps directly to prompt router mode keys |
| `MODELS` | Array of all available models — each has `id` (sent to API), `name` (display), `provider` (used to filter by selected provider) |

### Components

| Component | Role |
|---|---|
| `App.js` | Composes `useConfig` + `useChat`, passes `effectiveConfig` (config + active apiKey merged) to useChat |
| `Sidebar.jsx` | Renders provider/model dropdowns, per-provider key input with `✓ saved` badge, capability list, saved-provider pills |
| `ChatWindow.jsx` | Layout shell — header with New Chat button, scrollable message list, error banner, input |
| `ChatInput.jsx` | Auto-resizing textarea, Enter-to-send, Shift+Enter for newline, mode badge display |
| `Message.jsx` | Renders user bubble (plain text) or assistant bubble (ReactMarkdown + SyntaxHighlighter + copy button) |
| `TypingIndicator.jsx` | Three animated dots shown while waiting for first streaming chunk |
| `WelcomeScreen.jsx` | Empty state — active capability card with example prompts, capability grid |

---

## Provider Integration Map

```
Model ID selected in UI
         │
         ▼
routes/chat.py → _pick_service(model)
         │
         ├── model in GROQ_MODELS  →  groq_service.py
         │                              URL: api.groq.com/openai/v1
         │                              Auth: Bearer {key}
         │                              Format: OpenAI
         │
         ├── model in DIAL_MODELS  →  dial_service.py
         │                              URL: ai-proxy.lab.epam.com/openai/v1
         │                              Auth: Bearer {key}
         │                              Format: OpenAI
         │
         └── (default)             →  gemini_service.py
                                        URL: generativelanguage.googleapis.com/v1beta
                                        Auth: ?key={key} (query param)
                                        Format: Gemini-specific
```

---

## How to Add a New AI Provider

### Step 1 — Create the service file

Create `backend/services/myprovider_service.py`:

```python
MYPROVIDER_URL = "https://api.myprovider.com/v1/chat/completions"

def _headers(api_key):
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

def _build_messages(system_prompt, user_message, history):
    # Build messages array — follow same pattern as groq_service.py
    ...

async def generate_response(api_key, model, system_prompt, user_message, temperature, history):
    # Non-streaming — POST to MYPROVIDER_URL, return text string
    ...

async def stream_response(api_key, model, system_prompt, user_message, temperature, history):
    # Streaming — async generator, yield text chunks
    ...
```

> If the provider uses OpenAI format, you can copy `groq_service.py` and just change the URL and headers.

### Step 2 — Register the model set in `routes/chat.py`

```python
# Add at top of routes/chat.py
import services.myprovider_service as myprovider_svc

MYPROVIDER_MODELS = {"my-model-id-1", "my-model-id-2"}

# Update _pick_service()
def _pick_service(model: str):
    if model in GROQ_MODELS:    return groq_svc
    if model in DIAL_MODELS:    return dial_svc
    if model in MYPROVIDER_MODELS: return myprovider_svc   # ← add this
    return gemini_svc
```

### Step 3 — Add models to frontend `utils/capabilities.js`

```js
export const MODELS = [
  // ... existing models ...
  { id: "my-model-id-1", name: "My Model Display Name", provider: "myprovider" },
];
```

### Step 4 — Add provider to `Sidebar.jsx`

```jsx
// In the provider <select>
<option value="myprovider">My Provider</option>

// In PROVIDER_LABELS object
const PROVIDER_LABELS = {
  dial: "EPAM DIAL",
  groq: "Groq (Free ⚡)",
  gemini: "Google Gemini",
  myprovider: "My Provider",  // ← add
};
```

### Step 5 — Update default in `useConfig.js` (optional)

```js
const defaultConfig = {
  provider: "myprovider",
  model: "my-model-id-1",
  ...
};
```

---

## How to Add a New Capability Mode

### Step 1 — Add prompt config in `backend/utils/prompt_router.py`

```python
CAPABILITY_PROMPTS = {
    # ... existing modes ...

    "my_new_mode": {
        "system": (
            # The AI persona — who the AI pretends to be for this mode
            "You are an expert in X. Your responses should Y."
        ),
        "prefix": (
            # Prepended to every user message in this mode
            "Analyze the following and provide:\n"
            "1. Item one\n"
            "2. Item two\n\n"
        ),
    },
}
```

### Step 2 — Add capability to `frontend/src/utils/capabilities.js`

```js
export const CAPABILITIES = [
  // ... existing capabilities ...
  {
    id: "my_new_mode",          // must match key in prompt_router.py
    label: "My New Feature",
    icon: "🔧",
    description: "Short description shown on hover",
    examples: ["Example prompt 1", "Example prompt 2"],
  },
];
```

That's it — the routing, UI, and prompt injection work automatically.

---

## How to Add a New Model

If the model belongs to an **already-supported provider**, only one file needs changing:

**`frontend/src/utils/capabilities.js`**:
```js
{ id: "new-model-id", name: "New Model Display Name", provider: "groq" },
```

**`backend/routes/chat.py`** — add to the correct model set:
```python
GROQ_MODELS = {
    ...,
    "new-model-id",   # ← add here
}
```

---

## Environment & Config Reference

### Backend `.env`

| Variable | Default | Purpose |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed frontend origins |
| `GEMINI_API_KEY` | — | Optional server-side default (user key takes priority) |

### Frontend localStorage (`qa_assistant_config`)

```json
{
  "provider": "dial",
  "model": "gpt-4o-mini-2024-07-18",
  "apiKeys": {
    "dial":   "your-dial-key",
    "groq":   "your-groq-key",
    "gemini": "your-gemini-key"
  },
  "temperature": 0.7,
  "streaming": true
}
```

To reset: `localStorage.removeItem("qa_assistant_config"); location.reload()`

### Frontend `.env` (optional)

| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend URL for production deployment |
