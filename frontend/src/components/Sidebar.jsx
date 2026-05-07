import { useState, useRef, useEffect } from "react";
import { CAPABILITIES, MODELS } from "../utils/capabilities";
import ModelIcon from "./ModelIcon";
import ReportIssueModal from "./ReportIssueModal";

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

const BA_TOOLS = [
  { id: "ba_user_story",   icon: "📖", label: "User Story Generator" },
  { id: "ba_acceptance",   icon: "✅", label: "Acceptance Criteria" },
  { id: "ba_use_case",     icon: "🎭", label: "Use Case Generator" },
  { id: "ba_requirements", icon: "🔎", label: "Requirements Analyzer" },
  { id: "ba_process_flow", icon: "🔄", label: "Process Flow Generator" },
  { id: "ba_brd",          icon: "📄", label: "BRD Generator" },
  { id: "ba_gap",          icon: "📊", label: "Gap Analysis" },
  { id: "ba_stakeholder",  icon: "📧", label: "Stakeholder Update" },
  { id: "ba_meeting",      icon: "📝", label: "Meeting Summarizer" },
  { id: "ba_impact",       icon: "💥", label: "Impact Analysis" },
];

const DEV_TOOLS = [
  { id: "chrome_ext",      icon: "🧩", label: "Chrome Extension ★" },
  { id: "model_compare",   icon: "⚡", label: "Model Compare ★" },
  { id: "issues_viewer",   icon: "🐛", label: "Reported Issues" },
  { id: "tool_helper",     icon: "🧭", label: "Tool Helper" },
  { id: "explain",         icon: "🔍", label: "Code Explainer" },
  { id: "review",          icon: "🕵️", label: "Code Review" },
  { id: "debug",           icon: "🐛", label: "Debug & Fix" },
  { id: "convert",         icon: "🔄", label: "Code Converter" },
  { id: "regex",           icon: "📝", label: "Regex Builder" },
  { id: "sql",             icon: "🗄️", label: "SQL Helper" },
  { id: "git",             icon: "📦", label: "Git Assistant" },
  { id: "devops",          icon: "🐳", label: "DevOps Generator" },
  { id: "json",            icon: "🎲", label: "JSON & Mock Data" },
  { id: "bdd",             icon: "🥒", label: "BDD Generator" },
  { id: "api_test",        icon: "🔌", label: "API Test Generator" },
  { id: "a11y",            icon: "♿", label: "A11y Checker" },
];

const THEMES = [
  { id: "dark",     label: "Dark",     swatch: ["#7c3aed", "#0d0d1a"] },
  { id: "midnight", label: "Midnight", swatch: ["#0891b2", "#010d1a"] },
  { id: "forest",   label: "Forest",   swatch: ["#059669", "#030f07"] },
  { id: "light",    label: "Light",    swatch: ["#7c3aed", "#f8fafc"] },
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
        className="w-full flex items-center gap-2 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 border border-[var(--border-primary)] hover:border-violet-500/50 focus:outline-none focus:border-violet-500 transition-colors"
      >
        {selected && <ModelIcon logoProvider={selected.logoProvider} size={16} />}
        <span className="flex-1 text-left truncate">{selected?.name || "Select model"}</span>
        <svg className={`w-3.5 h-3.5 text-[var(--text-faint)] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl shadow-xl overflow-hidden">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-violet-600/10 ${
                m.id === value ? "bg-violet-600/20 text-violet-300" : "text-[var(--text-secondary)]"
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
  isOpen = false, onClose,
}) {
  const [showKey, setShowKey] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const savedProviders = Object.entries(config.apiKeys || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  const hint = PROVIDER_HINTS[config.provider];
  const activeModels = MODELS.filter((m) => m.provider === config.provider);

  return (
    <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-72 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      {/* Logo + New Chat */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-md shadow-violet-900/30 animate-glow-pulse ring-1 ring-violet-500/30">
            <img src="/logo.png" alt="AiMitra" className="w-full h-full object-cover" style={{ objectPosition: "18% 45%" }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[var(--text-heading)] tracking-tight">
              Ai<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Mitra</span>
            </h1>
            <p className="text-xs text-[var(--text-faint)]">by Shiv Kant Kumar</p>
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
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden flex-shrink-0 p-1.5 text-[var(--text-faint)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-ui)] transition-colors"
          title="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Configuration */}
        <div className="px-4 py-4 border-b border-[var(--border-subtle)]">
          <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">Configuration</p>

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
                      : "bg-[var(--bg-ui)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-medium)]"
                  }`}
                >
                  ✓ {p.toUpperCase()}
                </span>
              ))}
            </div>
          )}

          {/* Provider */}
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Provider</label>
            <select
              value={config.provider}
              onChange={(e) => {
                const first = MODELS.find((m) => m.provider === e.target.value);
                updateConfig({ provider: e.target.value, model: first?.id || "" });
              }}
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 border border-[var(--border-primary)] focus:outline-none focus:border-violet-500 transition-colors"
            >
              {Object.entries(PROVIDER_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Model — custom dropdown with icons */}
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Model</label>
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
              <label className="text-xs text-[var(--text-muted)]">
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
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 pr-9 border border-[var(--border-primary)] focus:outline-none focus:border-violet-500 placeholder-[var(--text-ghost)] transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-secondary)] text-xs"
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
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Temperature: <span className="text-violet-400 font-medium">{config.temperature.toFixed(1)}</span>
            </label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-[var(--text-ghost)] mt-0.5">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>

          {/* Streaming */}
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-[var(--text-muted)]">Streaming</label>
            <button
              onClick={() => updateConfig({ streaming: !config.streaming })}
              className={`relative w-10 h-5 rounded-full transition-colors ${config.streaming ? "bg-violet-600" : "bg-[var(--bg-ui)]"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.streaming ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Theme Picker */}
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <label className="block text-xs text-[var(--text-muted)] mb-2">Theme</label>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateConfig({ theme: t.id })}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs border transition-all ${
                    config.theme === t.id
                      ? "border-[var(--accent)] bg-[var(--accent-faint)] text-[var(--accent-light)]"
                      : "border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-medium)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
                  />
                  {t.label}
                  {config.theme === t.id && (
                    <svg className="ml-auto w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-[var(--bg-ui)] p-0.5">
            <button
              onClick={() => setActiveView("chat")}
              className={`py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "chat" ? "bg-violet-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveView("devtools")}
              className={`py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "devtools" ? "bg-emerald-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              ⚡ More Tools
            </button>
            <button
              onClick={() => setActiveView("jira")}
              className={`py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "jira" ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              🔵 JIRA
            </button>
            <button
              onClick={() => setActiveView("ba")}
              className={`py-1.5 text-xs rounded-md transition-all font-medium ${
                activeView === "ba" ? "bg-amber-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              📋 BA Tools
            </button>
          </div>
        </div>

        {/* Capabilities (Chat view only) */}
        {activeView === "chat" && (
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">Capabilities</p>
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
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-ui)] hover:text-[var(--text-primary)]"
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

        {/* JIRA Tools (JIRA view) */}
        {activeView === "jira" && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">JIRA Tools</p>
            <div className="space-y-0.5">
              {JIRA_TOOLS.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveMode(tool.id)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`nav-item-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeMode === tool.id
                      ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-ui)] hover:text-[var(--text-primary)]"
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

        {/* Additional Tools (devtools view) */}
        {activeView === "devtools" && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">More Tools</p>
            <div className="space-y-0.5">
              {DEV_TOOLS.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveMode(tool.id)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`nav-item-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeMode === tool.id
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/40"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-ui)] hover:text-[var(--text-primary)]"
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

        {/* BA Tools (ba view) */}
        {activeView === "ba" && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-3">BA Tools</p>
            <div className="space-y-0.5">
              {BA_TOOLS.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveMode(tool.id)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`nav-item-enter w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeMode === tool.id
                      ? "bg-amber-600/20 text-amber-300 border border-amber-600/40"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-ui)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-base w-5 text-center">{tool.icon}</span>
                  <span className="text-left leading-tight">{tool.label}</span>
                  {activeMode === tool.id && <span className="ml-auto w-1.5 h-1.5 bg-amber-400 rounded-full animate-fade-in" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity History — visible in all views ── */}
        <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
            >
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`w-3 h-3 transition-transform ${historyOpen ? "rotate-90" : ""}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              Activity
              {history.length > 0 && (
                <span className="ml-1 bg-[var(--bg-ui)] text-[var(--text-muted)] text-xs px-1.5 py-0.5 rounded-full font-normal">
                  {history.length}
                </span>
              )}
            </button>

            {history.length > 0 && historyOpen && (
              confirmClear ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--text-muted)]">Sure?</span>
                  <button
                    onClick={() => { onClearHistory(); setConfirmClear(false); }}
                    className="text-xs text-red-400 hover:text-red-300 px-1"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs text-[var(--text-faint)] hover:text-[var(--text-secondary)] px-1"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors"
                >
                  Clear all
                </button>
              )
            )}
          </div>

          {/* List */}
          {historyOpen && (
            history.length === 0 ? (
              <p className="text-xs text-[var(--text-ghost)] italic px-1 py-2">
                No activity yet — start using any tool!
              </p>
            ) : (
              <div className="space-y-1">
                {history.map((conv, i) => (
                  <div
                    key={conv.id}
                    style={{ animationDelay: `${i * 25}ms` }}
                    className="animate-fade-up group flex items-start gap-2 rounded-lg hover:bg-[var(--bg-ui)] transition-colors cursor-pointer pr-1"
                    onClick={() => onLoadConversation(conv)}
                  >
                    <div className="flex-1 min-w-0 px-3 py-2">
                      <p className="text-xs text-[var(--text-secondary)] truncate leading-snug group-hover:text-[var(--text-heading)] transition-colors">
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-[var(--text-ghost)]">
                          {relativeTime(conv.timestamp)}
                        </span>
                        {conv.model && (
                          <>
                            <span className="text-[var(--text-ghost)]">·</span>
                            <span className="text-xs text-[var(--text-ghost)] truncate max-w-[90px]">
                              {conv.model.split("/").pop().split("-").slice(0, 3).join("-")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 text-[var(--text-ghost)] hover:text-red-400 transition-all p-1 rounded"
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
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
        <button
          onClick={() => setReportOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-red-300 hover:bg-red-900/20 border border-[var(--border-subtle)] hover:border-red-700/40 transition-all"
        >
          <span>🐛</span>
          <span>Report an Issue</span>
        </button>
        <p className="text-xs text-[var(--text-ghost)] text-center">
          {PROVIDER_LABELS[config.provider]
            ? `via ${PROVIDER_LABELS[config.provider]}`
            : "AI-Powered QA Assistant"}
        </p>
      </div>

      {reportOpen && <ReportIssueModal onClose={() => setReportOpen(false)} />}
    </aside>
  );
}
