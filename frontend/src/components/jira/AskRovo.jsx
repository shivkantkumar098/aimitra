import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessageStream, sendMessage } from "../../services/chatService";

const ROVO_SYSTEM = `You are Rovo, Atlassian's AI assistant embedded in JIRA. You are an expert in:
- JIRA project management (tickets, epics, sprints, boards, workflows)
- JQL (JIRA Query Language) — writing, explaining, and optimizing queries
- Agile methodologies (Scrum, Kanban, SAFe)
- Creating well-structured tickets, user stories, bug reports, epics
- Test management, QA planning, acceptance criteria
- JIRA automations, dashboards, and reporting

Be helpful, concise, and professional. When creating tickets, use markdown formatting. When writing JQL, explain each clause.`;

const QUICK_PROMPTS = [
  { icon: "🐛", text: "Write a bug ticket for login failing on mobile" },
  { icon: "📖", text: "Create a user story for password reset via email" },
  { icon: "🔍", text: "JQL to find all open P1 bugs in current sprint" },
  { icon: "📋", text: "What makes a good acceptance criteria?" },
  { icon: "⚡", text: "How do I set up a sprint in JIRA?" },
  { icon: "📊", text: "Help me write a test plan for a checkout flow" },
];

export default function AskRovo({ config }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm **Rovo**, your AI assistant for JIRA. I can help you:\n\n- 🎫 Create tickets, epics, and user stories\n- 🔍 Write and explain JQL queries\n- 📋 Review test plans and acceptance criteria\n- ⚡ Answer any JIRA or agile question\n\nWhat can I help you with?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isLoading) return;

      if (!config.apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠ Please set your AI provider API key in the sidebar first.",
          },
        ]);
        return;
      }

      const userMsg = { role: "assistant_placeholder", content: trimmed };
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setIsLoading(true);

      // Add empty assistant slot
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const payload = {
        message: `[SYSTEM]\n${ROVO_SYSTEM}\n[/SYSTEM]\n\n${trimmed}`,
        mode: "text_generation",
        history,
        model: config.model,
        api_key: config.apiKey,
        temperature: config.temperature,
        streaming: config.streaming,
      };

      if (config.streaming) {
        try {
          await sendMessageStream(
            payload,
            (chunk) =>
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + chunk,
                };
                return updated;
              }),
            (err) => {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `⚠ Error: ${err}`,
                };
                return updated;
              });
              setIsLoading(false);
            }
          );
        } finally {
          setIsLoading(false);
        }
      } else {
        try {
          const res = await sendMessage(payload);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: res.response,
            };
            return updated;
          });
        } catch (err) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `⚠ ${err.response?.data?.detail || err.message}`,
            };
            return updated;
          });
        } finally {
          setIsLoading(false);
        }
      }

      inputRef.current?.focus();
    },
    [input, isLoading, messages, config]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm **Rovo**, your AI assistant for JIRA. How can I help you?",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
            R
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ask Rovo</p>
            <p className="text-xs text-gray-500">AI assistant for JIRA &amp; agile</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#0d1117] rounded-xl border border-gray-800 p-4 space-y-4 mb-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            {msg.role === "assistant" ? (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow">
                R
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-xs text-gray-300 flex-shrink-0 mt-0.5">
                You
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600/20 border border-blue-600/30 text-gray-100"
                  : "bg-[#1a1f2e] border border-gray-700 text-gray-200"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="markdown-content prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content ||
                      (isLoading && i === messages.length - 1 ? "▍" : "")}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Quick prompts — only show before first user message */}
        {messages.filter((m) => m.role === "user").length === 0 && (
          <div className="pt-2">
            <p className="text-xs text-gray-600 text-center mb-3">
              Try one of these:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  onClick={() => send(p.text)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 bg-[#1a1f2e] hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 rounded-xl transition-colors"
                >
                  <span>{p.icon}</span>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            placeholder="Ask Rovo anything about JIRA… (Enter to send, Shift+Enter for new line)"
            className="w-full bg-[#1a1f2e] text-gray-200 text-sm rounded-xl px-4 py-3 pr-12 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none transition-colors disabled:opacity-50"
            style={{ minHeight: "48px", maxHeight: "120px" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
        </div>
        <button
          onClick={() => send()}
          disabled={isLoading || !input.trim()}
          className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
          title="Send (Enter)"
        >
          {isLoading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
