import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessageStream, sendMessage } from "../../services/chatService";

// ── System prompt ────────────────────────────────────────────────────────────
const GUIDE_SYSTEM = `You are the AiMitra Jira Tools Help Assistant. Your only job is to help users understand and use the Jira section of AiMitra.

AiMitra Jira Tools (7 tools — all require Jira connection):

1. Ask Jira AI (this tab) — Guide for using the Jira tools in AiMitra.
2. Ticket Creator — Describe a feature/task → AI creates a full Jira ticket → create directly in Jira.
3. Bug Creator — Describe a bug → AI creates a formatted bug report → create directly in Jira.
4. JQL Search — Describe what you want in plain English → AI generates JQL → runs it against your Jira.
5. Test Plan Review — Paste a test plan → AI checks for missing scenarios, edge cases, unclear AC.
6. Ticket Validator — Enter a ticket key or paste content → AI checks BVA, AC completeness, missing info.
7. Comment Generator — Describe an update → AI generates a professional Jira comment → post directly.

Jira Connection: Click "Not connected" (top-right of Jira tab) → enter domain (e.g. mycompany.atlassian.net), email, API token from https://id.atlassian.com/manage-profile/security/api-tokens.

Rules:
- Only answer questions about AiMitra's Jira tools. For anything outside Jira tools, say: "I can only help with the Jira tools in AiMitra. Please use the relevant section of the app for other questions."
- Keep answers short and clear — use bullet points.
- If you don't know, say exactly: "I don't know this."
- Never make up features not listed above.`;

// ── Local FAQ (zero API calls) ────────────────────────────────────────────────
const FAQ = [
  {
    keys: ["hello", "hi", "hey", "hii", "good morning", "good afternoon", "good evening"],
    answer: `Hi there! 👋 I'm the **Ask Jira AI** guide for AiMitra's Jira tools.

Ask me about any Jira tool:
- *"How do I connect Jira?"*
- *"How do I create a bug ticket?"*
- *"How does JQL Search work?"*
- *"What Jira tools are available?"*`,
  },
  {
    keys: ["what jira tools", "jira features", "list jira", "all jira tools", "what can i do in jira", "jira tools available"],
    answer: `**AiMitra Jira Tools (7):**

1. 🤖 **Ask Jira AI** — this help guide
2. 🎫 **Ticket Creator** — describe a feature → AI creates a full Jira ticket
3. 🐛 **Bug Creator** — describe a bug → AI formats a bug report → create in Jira
4. 🔍 **JQL Search** — plain English → AI generates & runs JQL
5. 📋 **Test Plan Review** — paste a test plan → AI checks for gaps
6. ✅ **Ticket Validator** — paste a ticket → AI checks BVA, AC, missing info
7. 💬 **Comment Generator** — describe an update → AI writes a professional comment

All tools require a Jira connection.`,
  },
  {
    keys: ["connect jira", "jira connection", "how to connect", "link jira", "jira setup", "api token", "jira domain", "not connected"],
    answer: `**How to connect Jira:**

1. Click **"Not connected — click to connect"** (top-right of the Jira tab)
2. Enter your **Jira domain** (e.g. \`mycompany.atlassian.net\`)
3. Enter your **Atlassian email**
4. Enter your **API token** — get one at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
5. Click **Connect**

Once connected, your name and avatar appear in the top-right.`,
  },
  {
    keys: ["ticket creator", "create ticket", "how to create a ticket", "new ticket", "create jira ticket"],
    answer: `**Ticket Creator:**

1. Go to **Ticket Creator** tab
2. Describe your feature or task in the text box
3. Click **"✨ Ask Jira AI to Create"**
4. Review the generated ticket
5. Click **"Load Projects"** → select a project → **"Create in Jira"**

Tip: Load an existing ticket first — the AI will mimic its style.`,
  },
  {
    keys: ["bug creator", "create bug", "how to create bug", "bug report", "bug ticket"],
    answer: `**Bug Creator:**

1. Go to **Bug Creator** tab
2. Describe the bug (steps to reproduce, expected vs actual result)
3. Click **"✨ Generate Bug Ticket"**
4. Review the formatted report
5. Scroll down → **"Load Projects"** → select project → **"🔵 Create in JIRA"**`,
  },
  {
    keys: ["jql", "jql search", "search jira", "find tickets", "query", "how to search"],
    answer: `**JQL Search:**

1. Go to **JQL Search** tab
2. Describe what you want in plain English (e.g. *"all open P1 bugs in current sprint"*)
3. Click **Generate JQL** — AI writes the query
4. Click **Run** to execute against your Jira
5. Matching tickets appear as results`,
  },
  {
    keys: ["test plan", "test plan review", "review test plan"],
    answer: `**Test Plan Review:**

1. Go to **Test Plan Review** tab
2. Paste your test plan content
3. Click **Review** — AI checks for:
   - Missing test scenarios
   - Uncovered edge cases
   - Unclear acceptance criteria
4. Get a structured review with suggestions`,
  },
  {
    keys: ["ticket validator", "validate ticket", "check ticket", "bva", "acceptance criteria check"],
    answer: `**Ticket Validator:**

1. Go to **Ticket Validator** tab
2. Enter a ticket key (e.g. \`QA-123\`) or paste ticket content
3. Click **Validate** — AI checks for:
   - BVA completeness
   - Missing or weak acceptance criteria
   - Ambiguous requirements
   - Missing env, priority, or steps`,
  },
  {
    keys: ["comment generator", "generate comment", "jira comment", "post comment"],
    answer: `**Comment Generator:**

1. Go to **Comment Generator** tab
2. Describe the update (e.g. *"testing done, 2 issues found"*)
3. Click **Generate** — AI writes a professional comment
4. Click **Post to Jira** to add it directly to the ticket`,
  },
  {
    keys: ["help", "how to use", "get started", "getting started", "guide", "what can you do"],
    answer: `**AiMitra Jira Tools — Quick Guide:**

1. **Connect Jira** — click "Not connected" (top-right) → enter domain, email, API token
2. **Create tickets** — use Ticket Creator or Bug Creator tabs
3. **Search** — use JQL Search with plain English
4. **Review & validate** — Test Plan Review or Ticket Validator tabs
5. **Post comments** — Comment Generator tab

Ask me about any specific tool for step-by-step instructions.`,
  },
];

// ── Match user message against FAQ ──────────────────────────────────────────
function matchFAQ(text) {
  const lower = text.toLowerCase().trim();
  for (const entry of FAQ) {
    if (entry.keys.some((k) => lower.includes(k))) return entry.answer;
  }
  return null;
}

const QUICK_PROMPTS = [
  { icon: "🔵", text: "How do I connect to Jira?" },
  { icon: "🎫", text: "What Jira tools are available?" },
  { icon: "🐛", text: "How do I create a bug ticket?" },
  { icon: "🔍", text: "How does JQL Search work?" },
  { icon: "✅", text: "How do I validate a ticket?" },
  { icon: "💬", text: "How do I generate a Jira comment?" },
];

const WELCOME =
  "Hi! 👋 I'm **Ask Jira AI** — your guide for AiMitra's Jira tools.\n\nI can help you with:\n- 🎫 Ticket Creator & Bug Creator\n- 🔍 JQL Search\n- 📋 Test Plan Review\n- ✅ Ticket Validator\n- 💬 Comment Generator\n\nWhat would you like to know?";

export default function AskRovo({ config, rovoAvailable }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
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

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");

      // ── Local FAQ match — no API call ──────────────────────────────────────
      const faqAnswer = matchFAQ(trimmed);
      if (faqAnswer) {
        setMessages((prev) => [...prev, { role: "assistant", content: faqAnswer }]);
        inputRef.current?.focus();
        return;
      }

      // ── API key guard ──────────────────────────────────────────────────────
      if (!config.apiKey) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠ Please set your AI provider API key in the sidebar first." },
        ]);
        return;
      }

      // ── AI fallback ────────────────────────────────────────────────────────
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload = {
        message: `[SYSTEM]\n${GUIDE_SYSTEM}\n[/SYSTEM]\n\n${trimmed}`,
        mode: "text_generation",
        history,
        model: config.model,
        api_key: config.apiKey,
        temperature: 0.3,
        streaming: config.streaming,
      };

      if (config.streaming) {
        try {
          await sendMessageStream(
            payload,
            (chunk) =>
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + chunk,
                };
                return updated;
              }),
            (err) => {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: `⚠ Error: ${err}` };
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
            updated[updated.length - 1] = { role: "assistant", content: res.response };
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

  const clearChat = () => setMessages([{ role: "assistant", content: WELCOME }]);

  // ── Rovo not available screen ──────────────────────────────────────────────
  if (rovoAvailable === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] min-h-[400px] gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-2xl shadow-lg">
          🔒
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-white mb-2">Ask Jira AI Not Available</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            <strong className="text-gray-200">Atlassian Intelligence</strong> (Ask Jira AI) is available on{" "}
            <span className="text-blue-400">Jira Premium</span> and{" "}
            <span className="text-blue-400">Enterprise</span> plans only.
          </p>
          <p className="text-sm text-gray-500 mt-3">
            Your connected Jira account does not have this feature enabled. Contact your Atlassian admin or upgrade your plan.
          </p>
        </div>
        <a
          href="https://www.atlassian.com/software/jira/pricing"
          target="_blank"
          rel="noreferrer"
          className="text-xs px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-lg transition-colors"
        >
          View Jira plans ↗
        </a>
      </div>
    );
  }

  // ── Main chat UI ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
            ?
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ask Jira AI</p>
            <p className="text-xs text-gray-500">AiMitra help guide</p>
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
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" ? (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow">
                ?
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-xs text-gray-300 flex-shrink-0 mt-0.5">
                You
              </div>
            )}
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
                    {msg.content || (isLoading && i === messages.length - 1 ? "▍" : "")}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Quick prompts — only before first user message */}
        {messages.filter((m) => m.role === "user").length === 0 && (
          <div className="pt-2">
            <p className="text-xs text-gray-600 text-center mb-3">Try asking:</p>
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
            placeholder="Ask how to use AiMitra… (Enter to send, Shift+Enter for new line)"
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
