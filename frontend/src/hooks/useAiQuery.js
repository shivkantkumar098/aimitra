/**
 * useAiQuery — lightweight single-shot AI query hook for JIRA tools.
 *
 * Unlike useChat (which manages conversation history), this hook is
 * designed for one-shot queries: send a prompt, get a result, display it.
 * Each tool call is independent — no conversation history maintained.
 *
 * Exposed API:
 *   result      — the AI's response text (streamed in progressively)
 *   isLoading   — true while waiting
 *   error       — error string or null
 *   query(systemPrompt, userMessage) — fires the AI call
 *   clear()     — resets result/error
 */

import { useState, useCallback } from "react";
import { sendMessageStream, sendMessage } from "../services/chatService";

export function useAiQuery(config) {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const query = useCallback(
    async (systemPrompt, userMessage) => {
      if (!config.apiKey) {
        setError("No API key configured. Please set it in the sidebar.");
        return;
      }

      setError(null);
      setResult("");
      setIsLoading(true);

      // Use a special mode "jira_direct" — prompt_router returns it unchanged
      // because systemPrompt + userMessage are pre-built by each JIRA tool
      const payload = {
        message: `[SYSTEM]\n${systemPrompt}\n[/SYSTEM]\n\n${userMessage}`,
        mode: "text_generation", // uses text_generation as passthrough
        history: [],
        ...config,
      };

      if (config.streaming) {
        try {
          await sendMessageStream(
            payload,
            (chunk) => setResult((prev) => prev + chunk),
            (err) => { setError(err); setIsLoading(false); }
          );
        } finally {
          setIsLoading(false);
        }
      } else {
        try {
          const res = await sendMessage(payload);
          setResult(res.response);
        } catch (err) {
          setError(err.response?.data?.detail || err.message);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [config]
  );

  const clear = useCallback(() => {
    setResult("");
    setError(null);
  }, []);

  return { result, isLoading, error, query, clear };
}
