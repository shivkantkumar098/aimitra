import { useState, useRef, useEffect } from "react";
import { CAPABILITIES, MODELS } from "../utils/capabilities";
import ModelIcon from "./ModelIcon";

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const PROVIDER_LABELS = {
  openai:      "OpenAI",
  anthropic:   "Anthropic",
  gemini:      "Google Gemini",
  groq:        "Groq (Free ⚡)",
  mistral:     "Mistral AI",
  deepseek:    "DeepSeek",
  xai:         "xAI (Grok)",
  together:    "Together AI",
  perplexity:  "Perplexity",
  cerebras:    "Cerebras ⚡",
  openrouter:  "OpenRouter",
  fireworks:   "Fireworks AI",
  cohere:      "Cohere",
};

const PROVIDER_HINTS = {
  openai:     { color: "text-green-400",   text: "Get key: ", link: "https://platform.openai.com/api-keys",         linkText: "platform.openai.com"    },
  anthropic:  { color: "text-orange-400",  text: "Get key: ", link: "https://console.anthropic.com",                linkText: "console.anthropic.com"  },
  gemini:     { color: "text-yellow-400",  text: "Free key: ",link: "https://aistudio.google.com/api-keys",         linkText: "aistudio.google.com"    },
  groq:       { color: "text-emerald-400", text: "Free key: ",link: "https://console.groq.com",                     linkText: "console.groq.com"       },
  mistral:    { color: "text-orange-300",  text: "Get key: ", link: "https://console.mistral.ai/api-keys",          linkText: "console.mistral.ai"     },
  deepseek:   { color: "text-blue-400",    text: "Get key: ", link: "https://platform.deepseek.com/api_keys",       linkText: "platform.deepseek.com"  },
  xai:        { color: "text-gray-300",    text: "Get key: ", link: "https://console.x.ai",                         linkText: "console.x.ai"           },
  together:   { color: "text-yellow-300",  text: "Get key: ", link: "https://api.together.xyz/settings/api-keys",   linkText: "api.together.xyz"       },
  perplexity: { color: "text-teal-400",    text: "Get key: ", link: "https://www.perplexity.ai/settings/api",       linkText: "perplexity.ai/settings" },
  cerebras:   { color: "text-pink-400",    text: "Free key: ",link: "https://cloud.cerebras.ai",                    linkText: "cloud.cerebras.ai"      },
  openrouter: { color: "text-purple-400",  text: "Free key: ",link: "https://openrouter.ai/keys",                   linkText: "openrouter.ai/keys"     },
  fireworks:  { color: "text-red-400",     text: "Get key: ", link: "https://fireworks.ai/account/api-keys",        linkText: "fireworks.ai"           },
  cohere:     { color: "text-cyan-400",    text: "Get key: ", link: "https://dashboard.cohere.com/api-keys",        linkText: "dashboard.cohere.com"   },
};

const JIRA_TOOLS = [
  { id: "jira_rovo",     icon: "🤖", label: "Ask Rovo" },
  { id: "jira_create",   icon: "🎫", label: "Ticket Creator" },
  { id: "jira_bug",      icon: "🐛", label: "Bug Creator" },
  { id: "jira_jql",      icon: "🔍", label: "JQL Search" },
  { id: "jira_plan",     icon: "📋", label: "Test Plan Review" },
  { id: "jira_validate", icon: "✅", label: "Ticket Validator" },
  { id: "jira_comment",  icon: "💬", label: "Comment Generator" },
];

const DEV_TOOLS = [
  { id: "explain",  icon: "🔍", label: "Code Explainer" },
  { id: "review",   icon: "🕵️", label: "Code Review" },
  { id: "debug",    icon: "🐛", label: "Debug & Fix" },
  { id: "convert",  icon: "🔄", label: "Code Converter" },
  { id: "regex",    icon: "📝", label: "Regex Builder" },
  { id: "sql",      icon: "🗄️", label: "SQL Helper" },
  { id: "git",      icon: "📦", label: "Git Assistant" },
  { id: "devops",   icon: "🐳", label: "DevOps Generator" },
  { id: "json",     icon: "🎲", label: "JSON & Mock Data" },
];

function ModelDropdown({ models, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = models.find((m) => m.id === value) || models[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-[#1f2937] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 hover:border-violet-500/50 focus:outline-none focus:border-violet-500 transition-colors"
      >
        {selected && <ModelIcon logoProvider={selected.logoProvider} size={16} />}
        <span className="flex-1 text-left truncate">{selected?.name || "Select model"}</span>
        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1f2e] border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-violet-600/10 ${
                m.id === value ? "bg-violet-600/20 text-violet-300" : "text-gray-300"
              }`}
            >
              <ModelIcon logoProvider={m.logoProvider} size={16} />
              <span className="truncate">{m.name}</span>
              {m.id === value && (
                <svg className="ml-auto w-3.5 h-3.5 text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  config, updateConfig, apiKey, setApiKey,
  activeMode, setActiveMode, activeView, setActiveView,
  onNewChat, history = [], onLoadConversation, onDeleteConversation, onClearHistory,
}) {
  const [showKey, setShowKey] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const savedProviders = Object.entries(config.apiKeys || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  const hint = PROVIDER_HINTS[config.provider];
  const activeModels = MODELS.filter((m) => m.provider === config.provider);

  return (
    <aside className="w-72 min-w-[288px] h-screen bg-[#0f1117] border-r border-gray-800/80 flex flex-col overflow-hidden">
      {/* Logo + New Chat */}
      <div className="px-4 py-3 border-b border-gray-800/80 flex items-center gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/30 flex-shrink-0 animate-glow-pulse">
            <span className="text-white text-base">⚡</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight">
              Ai<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Mitra</span>
            </h1>
            <p className="text-xs text-gray-500">by Shiv Kant Kumar</p>
          </div>
        </div>
        <button
          onClick={onNewChat}
          title="New Chat"
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-600/30 hover:border-violet-500/60 rounded-lg text-xs font-medium transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Configuration */}
        <div className="px-4 py-4 border-b border-gray-800/80">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Configuration</p>

          {/* Saved keys indicator */}
          {savedProviders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {savedProviders.map((p) => (
                <span
                  key={p}
                  onClick={() => {
                    const first = MODELS.find((m) => m.provider === p);
                    updateConfig({ provider: p, model: first?.id || "" });
                  }}
                  title={`Switch to ${PROVIDER_LABELS[p]}`}
                  className={`cursor-pointer text-xs px-2 py-0.5 rounded-full border transition-all ${
                    config.provider === p
                      ? "bg-violet-600/30 border-violet-500/60 text-violet-300"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  ✓ {p.toUpperCase()}
                </span>
              ))}
            </div>
          )}

          {/* Provider */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => {
                const first = MODELS.find((m) => m.provider === e.target.value);
                updateConfig({ provider: e.target.value, model: first?.id || "" });
              }}
              className="w-full bg-[#1f2937] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 transition-colors"
            >
              {Object.entries(PROVIDER_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Model — custom dropdown with icons */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Model</label>
            <ModelDropdown
              models={activeModels}
              value={config.model}
              onChange={(id) => updateConfig({ model: id })}
            />
          </div>

          {/* Provider hint */}
          {hint && (
            <p className={`text-xs ${hint.color} mb-2`}>
              🔑 {hint.text}
              {hint.link && (
                <a href={hint.link} target="_blank" rel="noreferrer" className="underline">{hint.linkText}</a>
              )}
            </p>
          )}

          {/* API Key */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">
                API Key
                {apiKey && <span className="ml-1 text-emerald-400">✓ saved</span>}
              </label>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter ${config.provider.toUpperCase()} key...`}
                className="w-full bg-[#1f2937] text-gray-200 text-sm rounded-lg px-3 py-2 pr-9 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600 transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
            {!apiKey && (
              <p className="text-xs text-amber-400 mt-1">⚠ API key required</p>
            )}
          </div>

          {/* Temperature */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">
              Temperature: <span className="text-violet-400 font-medium">{config.temperature.toFixed(1)}</span>
            </label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>

          {/* Streaming */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Streaming</label>
            <button
              onClick={() => updateConfig({ streaming: !config.streaming })}
              className={`relative w-10 h-5 rounded-full transition-colors ${config.streaming ? "bg-violet-600" : "bg-gray-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.streaming ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex rounded-lg bg-gray-800/60 p-0.5 gap-0.5">
            <button
              onClick={() => setActiveView("chat")}
              className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "chat" ? "bg-violet-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveView("devtools")}
              className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "devtools" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              ⚡ Dev Tools
            </button>
            <button
              onClick={() => setActiveView("jira")}
              className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "jira" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              🔵 JIRA
            </button>
          </div>
        </div>

        {/* Capabilities (Chat view) */}
        {activeView === "chat" && (
          <div className="px-4 py-3 border-b border-gray-800/80">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Capabilities</p>
            <div className="space-y-0.5">
              {CAPABILITIES.map((cap, i) => (
                <button
                  key={cap.id}
                  onClick={() => setActiveMode(cap.id)}
                  title={cap.description}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`nav-item-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeMode === cap.id
                      ? "bg-violet-600/20 text-violet-300 border border-violet-600/40"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <span className="text-base w-5 text-center">{cap.icon}</span>
                  <span className="text-left leading-tight">{cap.label}</span>
                  {activeMode === cap.id && <span className="ml-auto w-1.5 h-1.5 bg-violet-400 rounded-full animate-fade-in" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat History ── */}
        {activeView === "chat" && (
          <div className="px-4 py-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setHistoryOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`w-3 h-3 transition-transform ${historyOpen ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                History
                {history.length > 0 && (
                  <span className="ml-1 bg-gray-700 text-gray-400 text-xs px-1.5 py-0.5 rounded-full font-normal">
                    {history.length}
                  </span>
                )}
              </button>

              {history.length > 0 && historyOpen && (
                confirmClear ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Sure?</span>
                    <button
                      onClick={() => { onClearHistory(); setConfirmClear(false); }}
                      className="text-xs text-red-400 hover:text-red-300 px-1"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-xs text-gray-500 hover:text-gray-300 px-1"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Clear all
                  </button>
                )
              )}
            </div>

            {/* List */}
            {historyOpen && (
              history.length === 0 ? (
                <p className="text-xs text-gray-600 italic px-1 py-2">
                  No history yet — start chatting!
                </p>
              ) : (
                <div className="space-y-1">
                  {history.map((conv, i) => (
                    <div
                      key={conv.id}
                      style={{ animationDelay: `${i * 25}ms` }}
                      className="animate-fade-up group flex items-start gap-2 rounded-lg hover:bg-gray-800/70 transition-colors cursor-pointer pr-1"
                      onClick={() => onLoadConversation(conv)}
                    >
                      <div className="flex-1 min-w-0 px-3 py-2">
                        <p className="text-xs text-gray-300 truncate leading-snug group-hover:text-white transition-colors">
                          {conv.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-600">
                            {relativeTime(conv.timestamp)}
                          </span>
                          {conv.model && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span className="text-xs text-gray-600 truncate max-w-[90px]">
                                {conv.model.split("/").pop().split("-").slice(0, 3).join("-")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                        className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded"
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* JIRA Tools (JIRA view) */}
        {activeView === "jira" && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">JIRA Tools</p>
            <div className="space-y-0.5">
              {JIRA_TOOLS.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveMode(tool.id)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`nav-item-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeMode === tool.id
                      ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <span className="text-base w-5 text-center">{tool.icon}</span>
                  <span className="text-left leading-tight">{tool.label}</span>
                  {activeMode === tool.id && <span className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full animate-fade-in" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dev Tools (devtools view) */}
        {activeView === "devtools" && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dev Tools</p>
            <div className="space-y-0.5">
              {DEV_TOOLS.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveMode(tool.id)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`nav-item-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeMode === tool.id
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/40"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <span className="text-base w-5 text-center">{tool.icon}</span>
                  <span className="text-left leading-tight">{tool.label}</span>
                  {activeMode === tool.id && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full animate-fade-in" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800/80">
        <p className="text-xs text-gray-600 text-center">
          {PROVIDER_LABELS[config.provider]
            ? `via ${PROVIDER_LABELS[config.provider]}`
            : "AI-Powered QA Assistant"}
        </p>
      </div>
    </aside>
  );
}
