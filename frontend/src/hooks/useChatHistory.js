/**
 * useChatHistory — persists and retrieves past conversations in localStorage.
 *
 * Storage key: "qa_chat_history"
 * Stores up to MAX_HISTORY conversations, newest first.
 * Each entry: { id, title, timestamp, messages, mode, model, provider }
 *
 * Title is auto-generated from the first user message (truncated to 60 chars).
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "qa_chat_history";
const MAX_HISTORY = 60;

function makeTitle(messages) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Untitled Chat";
  const text = first.content.trim();
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch { /* storage full */ }
}

export function useChatHistory() {
  const [history, setHistory] = useState(load);

  // Create a brand-new entry; returns the generated id
  const saveConversation = useCallback((messages, meta = {}) => {
    if (!messages || messages.length === 0) return null;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      title: makeTitle(messages),
      timestamp: new Date().toISOString(),
      messages,
      mode: meta.mode || "text_generation",
      model: meta.model || "",
      provider: meta.provider || "",
    };
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      persist(updated);
      return updated;
    });
    return id;
  }, []);

  // Upsert: if id exists → update in-place and move to top; otherwise create new entry
  const upsertConversation = useCallback((id, messages, meta = {}) => {
    if (!messages || messages.length === 0) return null;
    let resolvedId = id;

    setHistory((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === id);
      let updated;

      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        const refreshed = {
          ...existing,
          messages,
          timestamp: new Date().toISOString(),
          mode: meta.mode || existing.mode,
          model: meta.model || existing.model,
          provider: meta.provider || existing.provider,
        };
        updated = [refreshed, ...prev.filter((c) => c.id !== id)];
      } else {
        // id not found — create new (happens on first save)
        resolvedId = id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const entry = {
          id: resolvedId,
          title: makeTitle(messages),
          timestamp: new Date().toISOString(),
          messages,
          mode: meta.mode || "text_generation",
          model: meta.model || "",
          provider: meta.provider || "",
        };
        updated = [entry, ...prev].slice(0, MAX_HISTORY);
      }

      persist(updated);
      return updated;
    });

    return resolvedId;
  }, []);

  const deleteConversation = useCallback((id) => {
    setHistory((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { history, saveConversation, upsertConversation, deleteConversation, clearHistory };
}
