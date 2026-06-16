/**
 * ChatWindow — main chat panel component.
 *
 * Renders the scrollable message list, typing indicator, welcome screen,
 * and the input box. Also handles mode-specific inline UI:
 *   - DOM Locator mode: replaces the message list with DomLocatorGenerator
 *   - Web Search mode: shows a banner (green for Perplexity, amber warning for others)
 *
 * Props:
 *   messages        — array of message objects from useChat
 *   isLoading       — true while waiting for a streaming or non-streaming response
 *   error           — error string to display above the input, or null
 *   onSend          — called with the user's text when they submit the input
 *   activeMode      — current capability mode ID (controls inline panels and banners)
 *   setActiveMode   — callback to switch capability mode
 *   setActiveView   — callback to switch the top-level panel (chat/devtools/jira/ba)
 *   onNewChat       — called when the "New Chat" button is clicked
 *   onToggleSidebar — called when the hamburger icon is clicked
 *   config          — full config object (provider, model, etc.) passed down to devtools
 */
import { useEffect, useRef } from "react";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import ChatInput from "./ChatInput";
import { CAPABILITIES } from "../utils/capabilities";
import DomLocatorGenerator from "./devtools/DomLocatorGenerator";

export default function ChatWindow({
  messages,
  isLoading,
  error,
  onSend,
  activeMode,
  setActiveMode,
  setActiveView,
  onNewChat,
  onToggleSidebar,
  config = {},
}) {
  const bottomRef = useRef(null);
  const activeCapability = CAPABILITIES.find((c) => c.id === activeMode);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleSidebar}
            title="Toggle sidebar (Ctrl+/)"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-ui)] rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">
              {activeCapability ? (
                <span className="flex items-center gap-2">
                  <span>{activeCapability.icon}</span>
                  <span>{activeCapability.label}</span>
                </span>
              ) : "Chat"}
            </h2>
            <p className="text-xs text-[var(--text-faint)]">
              {messages.length === 0
                ? activeCapability?.description ?? "Start a conversation"
                : `${messages.length} message${messages.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-ui)] hover:bg-[var(--bg-ui-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs rounded-xl border border-[var(--border-primary)] transition-all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          New Chat
        </button>
      </header>

      {/* DOM Locator — full tool UI replaces chat body */}
      {activeMode === "dom_locator" && (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-3xl mx-auto">
            <DomLocatorGenerator config={config} />
          </div>
        </div>
      )}

      {/* Web Search banner */}
      {activeMode === "web_search" && (
        config.provider === "perplexity" ? (
          /* Perplexity → green "live search" confirmation */
          <div className="mx-4 md:mx-6 mt-3 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/40 flex gap-2.5 items-center flex-shrink-0">
            <span className="text-emerald-400 flex-shrink-0">🌐</span>
            <p className="text-xs text-emerald-300">
              <strong>Live web search active</strong> — Perplexity will query the web in real time.
            </p>
          </div>
        ) : (
          /* Any other provider → amber warning */
          <div className="mx-4 md:mx-6 mt-3 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-600/50 flex gap-3 items-start flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-300 mb-1">⚠ No live web search — training data only</p>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                <strong className="text-white">{config.provider?.toUpperCase() || "This model"}</strong> cannot browse the internet.
                Responses are based on training data and may be outdated or inaccurate for recent events.
              </p>
              <p className="text-xs text-amber-200/60 mt-0.5">
                For real-time web results, switch to <strong className="text-amber-300">Provider → Perplexity</strong> (Sonar Pro or Sonar).
              </p>
            </div>
          </div>
        )
      )}

      {/* Messages + input — hidden when DOM Locator tool is active */}
      {activeMode !== "dom_locator" && (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              <WelcomeScreen
                activeMode={activeMode}
                setActiveMode={setActiveMode}
                onExampleClick={onSend}
              />
            ) : (
              <div className="max-w-3xl mx-auto space-y-5">
                {messages.map((msg) => (
                  <Message key={msg.id} message={msg} setActiveMode={setActiveMode} setActiveView={setActiveView} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <TypingIndicator />
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="mx-6 mb-2 px-4 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-center gap-2 animate-slide-down">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="max-w-3xl mx-auto w-full">
            <ChatInput
              onSend={onSend}
              isLoading={isLoading}
              activeMode={activeMode}
              setActiveMode={setActiveMode}
            />
          </div>
        </>
      )}
    </main>
  );
}
