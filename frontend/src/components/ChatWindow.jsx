import { useEffect, useRef } from "react";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import ChatInput from "./ChatInput";
import { CAPABILITIES } from "../utils/capabilities";

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
            className="md:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-ui)] rounded-lg transition-colors"
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

      {/* Messages */}
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

      {/* Error banner */}
      {error && (
        <div className="mx-6 mb-2 px-4 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm flex items-center gap-2 animate-slide-down">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput
          onSend={onSend}
          isLoading={isLoading}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
        />
      </div>
    </main>
  );
}
