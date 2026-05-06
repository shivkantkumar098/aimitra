/**
 * useChat — manages the chat messages state and send logic.
 *
 * Handles both streaming and non-streaming paths depending on config.streaming.
 *
 * Streaming path:
 *   - Creates an empty assistant message immediately
 *   - Appends chunks to it as they arrive from the SSE stream
 *   - User sees tokens appearing in real-time
 *
 * Non-streaming path:
 *   - Waits for full response then appends assistant message
 *
 * Exposed API:
 *   messages  — array of {id, role, content, timestamp} objects
 *   isLoading — true while waiting for response
 *   error     — string error message or null
 *   send(text, mode) — sends a message with the given capability mode
 *   newChat() — resets all state (starts fresh conversation)
 */

import { useState, useCallback, useRef } from "react";
import { sendMessage, sendMessageStream } from "../services/chatService";

export function useChat(config) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null); // reserved for future abort-controller support

  /** Creates a message object with a unique ID and current timestamp. */
  const addMessage = (role, content) => ({
    id: Date.now() + Math.random(),
    role,
    content,
    timestamp: new Date(),
  });

  const send = useCallback(
    async (text, mode, suggestion = null) => {
      if (!text.trim() || isLoading) return;

      // Guard: API key must be set before sending
      if (!config.apiKey) {
        setError("Please enter your API key in the sidebar.");
        return;
      }

      setError(null);
      const userMsg = addMessage("user", text);
      const toAdd = suggestion
        ? [userMsg, { ...addMessage("suggestion", ""), suggestion }]
        : [userMsg];
      setMessages((prev) => [...prev, ...toAdd]);
      setIsLoading(true);

      // Only send last 6 messages, truncated to 2000 chars each, to avoid 413 errors
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 2000),
      }));

      if (config.streaming) {
        // --- Streaming path ---
        // Create empty assistant message placeholder immediately so UI shows typing indicator
        const assistantMsg = addMessage("assistant", "");
        setMessages((prev) => [...prev, assistantMsg]);

        try {
          await sendMessageStream(
            { message: text, mode, history, ...config },
            // onChunk: append each arriving token to the placeholder message
            (chunk) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + chunk }
                    : m
                )
              );
            },
            // onError: replace placeholder content with error message
            (err) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: "Error: " + err, isError: true }
                    : m
                )
              );
            }
          );
        } finally {
          setIsLoading(false);
        }
      } else {
        // --- Non-streaming path ---
        try {
          const response = await sendMessage({
            message: text,
            mode,
            history,
            ...config,
          });
          setMessages((prev) => [
            ...prev,
            addMessage("assistant", response.response),
          ]);
        } catch (err) {
          const errText = err.response?.data?.detail || err.message || "Unknown error";
          setError(errText);
          setMessages((prev) => [
            ...prev,
            addMessage("assistant", `Error: ${errText}`, true),
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [messages, isLoading, config]
  );

  const injectMessage = useCallback((role, content, meta = {}) => {
    setMessages(prev => [...prev, { ...addMessage(role, content), ...meta }]);
  }, []);

  /** Clears all messages and resets loading/error state. */
  const newChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  /** Loads a saved conversation into the chat window (read/continue from history). */
  const loadMessages = useCallback((msgs) => {
    setMessages(
      msgs.map((m) => ({
        ...m,
        id: m.id ?? Date.now() + Math.random(),
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }))
    );
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, send, newChat, loadMessages, injectMessage };
}
