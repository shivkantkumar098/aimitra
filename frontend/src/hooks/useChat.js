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

// ── Local replies — no API call, no token cost ────────────────────────────
const LOCAL_RULES = [
  {
    pat: /^(hi|hello|hey|howdy|greetings|hiya|yo)\b[.!]?$/i,
    reply: "Hi there! 👋 How can I help you today? Select a capability from the sidebar or just ask your question.",
  },
  {
    pat: /^good (morning|afternoon|evening|night|day)\b/i,
    reply: (m) => `Good ${m[1]}! 🌟 Ready to help — what are you working on?`,
  },
  {
    pat: /^(how are you|how're you|you good|how do you do)\b/i,
    reply: "Doing great, thanks for asking! 😊 What can I help you with?",
  },
  {
    pat: /^(who are you|what are you|what is this|tell me about yourself)\b/i,
    reply: "I'm **AiMitra** — your AI-powered QA & development assistant by Shiv Kant Kumar.\n\nI can help with test generation, code debugging, JIRA tickets, BA documents, DOM locators, and much more. Use the sidebar to switch capabilities!",
  },
  {
    pat: /^(what can you do|what do you do|how to use|show me what you can do|help me)\b/i,
    reply: "Here's what I can do:\n\n- 💬 **Text & Code Generation** — write, explain, review code\n- 🧪 **Test Cases** — Selenium, Playwright, manual tests\n- 📋 **Test Plans** — full QA strategies\n- 🔍 **DOM Locators** — XPath & CSS selectors\n- 🐛 **Debug & Fix** — analyze and fix bugs\n- 🌐 **Web Search** — real-time with Perplexity, training data with others\n- 🔵 **JIRA Tools** — tickets, JQL, comments\n- 📁 **BA Tools** — user stories, BRDs, use cases\n- ⚡ **Dev Tools** — BDD, API tests, SQL, Git, DevOps\n\nSelect a capability from the sidebar to get started!",
  },
  {
    pat: /^(thanks|thank you|thx|ty|thank u|many thanks|appreciate it|appreciated|cheers)\b[.!]?$/i,
    reply: "You're welcome! 😊 Let me know if there's anything else I can help with.",
  },
  {
    pat: /^(bye|goodbye|see you|later|cya|take care|ttyl)\b[.!]?$/i,
    reply: "Goodbye! 👋 Come back whenever you need help.",
  },
  {
    pat: /^(ok|okay|alright|got it|understood|sure|fine|noted|i see|right|sounds good)\b[.!]?$/i,
    reply: "Got it! Let me know when you're ready or have a question.",
  },
];

function getLocalReply(text) {
  const t = text.trim();
  for (const rule of LOCAL_RULES) {
    const m = t.match(rule.pat);
    if (m) return typeof rule.reply === "function" ? rule.reply(m) : rule.reply;
  }
  return null;
}

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

      // Local reply — no API call, no token cost
      const localReply = getLocalReply(text);
      if (localReply) {
        const userMsg = addMessage("user", text);
        const botMsg = { ...addMessage("assistant", localReply), isLocal: true };
        setMessages((prev) => [...prev, userMsg, botMsg]);
        return;
      }

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

  return { messages, isLoading, error, send, newChat, loadMessages };
}
