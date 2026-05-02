import { useState, useCallback, useRef } from "react";
import { sendMessage, sendMessageStream } from "../services/chatService";

export function useChat(config) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const addMessage = (role, content) => ({
    id: Date.now() + Math.random(),
    role,
    content,
    timestamp: new Date(),
  });

  const send = useCallback(
    async (text, mode) => {
      if (!text.trim() || isLoading) return;
      if (!config.apiKey) {
        setError("Please enter your Gemini API key in the sidebar.");
        return;
      }

      setError(null);
      const userMsg = addMessage("user", text);
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (config.streaming) {
        // Streaming path
        const assistantMsg = addMessage("assistant", "");
        setMessages((prev) => [...prev, assistantMsg]);

        try {
          await sendMessageStream(
            { message: text, mode, history, ...config },
            (chunk) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + chunk }
                    : m
                )
              );
            },
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
        // Non-streaming path
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

  const newChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, send, newChat };
}
