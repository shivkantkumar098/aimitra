import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function sendMessage(payload) {
  const { message, mode, api_key, apiKey, model, temperature, streaming, history } = payload;
  const res = await axios.post(`${API_BASE}/api/chat`, {
    message,
    mode,
    api_key: api_key || apiKey,
    model,
    temperature,
    streaming,
    history: history || [],
  });
  return res.data;
}

export async function sendMessageStream(payload, onChunk, onError) {
  const { message, mode, api_key, apiKey, model, temperature, history } = payload;

  const body = JSON.stringify({
    message,
    mode,
    api_key: api_key || apiKey,
    model,
    temperature,
    streaming: true,
    history: history || [],
  });

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

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    onError(detail);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.chunk) onChunk(parsed.chunk);
      } catch {}
    }
  }
}
