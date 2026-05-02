import { useEffect, useRef } from "react";
import Message from "./Message";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import ChatInput from "./ChatInput";

export default function ChatWindow({
  messages,
  isLoading,
  error,
  onSend,
  activeMode,
  setActiveMode,
  onNewChat,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleExampleClick = (text) => {
    onSend(text);
  };

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0d0d1a]">
        <div>
          <h2 className="text-sm font-semibold text-white">Chat</h2>
          <p className="text-xs text-gray-500">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
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
            onExampleClick={handleExampleClick}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
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
        <div className="mx-6 mb-2 px-4 py-2 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput onSend={onSend} isLoading={isLoading} activeMode={activeMode} />
      </div>
    </main>
  );
}
