/**
 * chatService — low-level HTTP calls to the FastAPI backend.
 *
 * Two functions:
 *   sendMessage()       — axios POST to /api/chat, returns full response JSON
 *   sendMessageStream() — fetch POST to /api/chat/stream, reads SSE stream
 *
 * API_BASE defaults to http://localhost:8000 but can be overridden
 * via REACT_APP_API_URL environment variable for production deployments.
 */

import axios from "axios";

// Backend base URL — set REACT_APP_API_URL in .env for production
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Non-streaming chat request using axios.
 * Used when config.streaming === false.
 * Returns { response: string, mode: string }
 */
export async function sendMessage(payload) {
  const { message, mode, api_key, apiKey, model, provider, temperature, streaming, history } = payload;
  const res = await axios.post(`${API_BASE}/api/chat`, {
    message,
    mode,
    api_key: api_key || apiKey,
    model,
    provider: provider || "",
    temperature,
    streaming,
    history: history || [],
  });
  return res.data;
}

/**
 * Streaming chat request using native fetch + ReadableStream.
 * Used when config.streaming === true (default).
 *
 * Reads SSE lines from /api/chat/stream:
 *   data: {"chunk": "text"}   → calls onChunk(text) for each token
 *   data: [DONE]              → stream complete, function returns
 *   data: {"error": "msg"}   → calls onError(msg) and returns
 *
 * Uses fetch (not axios) because axios doesn't support streaming in browsers.
 * Uses a buffer to handle partial SSE lines split across multiple read() calls.
 */
export async function sendMessageStream(payload, onChunk, onError) {
  const { message, mode, api_key, apiKey, model, provider, temperature, history } = payload;

  const body = JSON.stringify({
    message,
    mode,
    api_key: api_key || apiKey,
    model,
    provider: provider || "",
    temperature,
    streaming: true,
    history: history || [],
  });

  // Initial fetch — connection errors handled separately from stream errors
  let response;
  try {
    response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (err) {
    onError(err.message);
    return;
  }

  // HTTP-level errors (4xx/5xx) before stream starts
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    onError(detail);
    return;
  }

  // Read SSE stream line by line
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep last incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return; // stream finished cleanly
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.chunk) onChunk(parsed.chunk);
      } catch { /* skip unparseable lines */ }
    }
  }
}
