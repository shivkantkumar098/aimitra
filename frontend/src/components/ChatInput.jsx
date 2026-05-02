import { useState, useRef } from "react";
import { CAPABILITIES } from "../utils/capabilities";

export default function ChatInput({ onSend, isLoading, activeMode }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const activeCapability = CAPABILITIES.find((c) => c.id === activeMode);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    setText(e.target.value);
  };

  return (
    <div className="border-t border-gray-800 bg-[#0d0d1a] px-4 py-4">
      {activeCapability && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500">Mode:</span>
          <span className="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 px-2 py-0.5 rounded-full">
            {activeCapability.icon} {activeCapability.label}
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1 bg-[#1f2937] border border-gray-700 rounded-xl focus-within:border-indigo-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`${activeCapability ? activeCapability.description : "Type a message"}... (Enter to send, Shift+Enter for newline)`}
            rows={1}
            disabled={isLoading}
            className="w-full bg-transparent text-gray-200 text-sm px-4 py-3 resize-none focus:outline-none placeholder-gray-600 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          {isLoading ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </form>
      <p className="text-xs text-gray-600 text-center mt-2">
        AI may produce errors. Verify important outputs.
      </p>
    </div>
  );
}
