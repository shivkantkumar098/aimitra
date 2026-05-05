export default function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-msg-left">
      <div className="w-8 h-8 rounded-2xl bg-[#1a1f2e] border border-gray-700 flex items-center justify-center text-base flex-shrink-0 animate-glow-pulse">
        ⚡
      </div>
      <div className="bg-[#1a1f2e] border border-gray-700/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm animate-scale-in">
        <div className="flex gap-1.5 items-center h-5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
