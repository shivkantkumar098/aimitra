/**
 * useAiQuery — lightweight single-shot AI query hook for devtools and JIRA tools.
 *
 * Unlike useChat (which manages conversation history), this hook is designed for
 * one-shot queries: send a prompt, get a result, display it. Each tool call is
 * independent — no conversation history maintained per call.
 *
 * Accepts an optional toolMeta = { label, mode, view } second argument.
 * When provided, each completed query is automatically saved to activity history
 * so users can track everything they've done across all tools.
 *
 * Exposed API:
 *   result      — the AI's response text (streamed in progressively)
 *   isLoading   — true while waiting
 *   error       — error string or null
 *   query(systemPrompt, userMessage, imageData?) — fires the AI call
 *   clear()     — resets result/error
 */

import { useState, useCallback, useRef } from "react";
import { sendMessageStream, sendMessage } from "../services/chatService";
import { useChatHistory } from "./useChatHistory";

export function useAiQuery(config, toolMeta = null) {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tracks accumulated streaming content so we can save to history after completion
  const resultRef = useRef("");
  // Keep toolMeta fresh without causing useCallback re-creation on every render
  const toolMetaRef = useRef(toolMeta);
  toolMetaRef.current = toolMeta;

  const { saveConversation } = useChatHistory();

  const query = useCallback(
    async (systemPrompt, userMessage, imageData = null) => {
      if (!config.apiKey) {
        setError("No API key configured. Please set it in the sidebar.");
        return;
      }

      setError(null);
      setResult("");
      resultRef.current = "";
      setIsLoading(true);

      const payload = {
        message: `[SYSTEM]\n${systemPrompt}\n[/SYSTEM]\n\n${userMessage}`,
        mode: "text_generation",
        history: [],
        image_base64: imageData?.base64 ?? null,
        image_mime_type: imageData?.mimeType ?? "image/png",
        ...config,
      };

      const saveToHistory = (output) => {
        const meta = toolMetaRef.current;
        if (!meta || !output) return;
        const snippet = userMessage.replace(/\n/g, " ").trim().slice(0, 55);
        const title = `[${meta.label}] ${snippet}${snippet.length >= 55 ? "…" : ""}`;
        const ts = new Date();
        saveConversation(
          [
            { id: `u-${Date.now()}`, role: "user", content: userMessage, timestamp: ts },
            { id: `a-${Date.now() + 1}`, role: "assistant", content: output, timestamp: ts },
          ],
          {
            title,
            mode: meta.mode,
            model: config.model,
            provider: config.provider,
          }
        );
      };

      if (config.streaming) {
        try {
          await sendMessageStream(
            payload,
            (chunk) => {
              resultRef.current += chunk;
              setResult((prev) => prev + chunk);
            },
            (err) => { setError(err); setIsLoading(false); }
          );
          saveToHistory(resultRef.current);
        } finally {
          setIsLoading(false);
        }
      } else {
        try {
          const res = await sendMessage(payload);
          setResult(res.response);
          saveToHistory(res.response);
        } catch (err) {
          setError(err.response?.data?.detail || err.message);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [config, saveConversation]
  );

  const clear = useCallback(() => {
    setResult("");
    setError(null);
    resultRef.current = "";
  }, []);

  return { result, isLoading, error, query, clear };
}
