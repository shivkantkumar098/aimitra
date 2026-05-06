import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");
  if (!inline && match) {
    return (
      <div className="my-2 rounded-xl overflow-hidden border border-gray-700/60">
        <div className="flex items-center justify-between bg-[#1a1f2e] px-4 py-1.5">
          <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
          <CopyButton text={code} />
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, fontSize: "0.82rem", borderRadius: 0 }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className="bg-gray-700/60 text-violet-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
      {children}
    </code>
  );
};

// Parse file blocks embedded in user messages: --- File: name.ext ---\n```ext\ncontent\n```
const FILE_BLOCK_RE = /\n\n--- File: (.+?) ---\n```[\w]*\n([\s\S]*?)```/g;

function parseUserContent(content) {
  const files = [];
  let match;
  while ((match = FILE_BLOCK_RE.exec(content)) !== null) {
    files.push({ name: match[1], preview: match[2].slice(0, 120) });
  }
  FILE_BLOCK_RE.lastIndex = 0;
  const cleanText = content.replace(FILE_BLOCK_RE, "").trim();
  FILE_BLOCK_RE.lastIndex = 0;
  return { cleanText, files };
}

function fileExtIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "py") return "🐍";
  if (["js", "jsx", "ts", "tsx"].includes(ext)) return "⚛";
  if (["json", "yaml", "yml"].includes(ext)) return "📋";
  if (["html", "htm", "css"].includes(ext)) return "🌐";
  if (ext === "md") return "📝";
  if (["csv", "log"].includes(ext)) return "📊";
  if (ext === "sql") return "🗄️";
  if (["feature", "robot"].includes(ext)) return "🧪";
  return "📄";
}

function AttachedFileChip({ name, preview }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 bg-violet-900/30 border border-violet-700/40 rounded-xl overflow-hidden text-left">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-violet-900/20 transition-colors"
      >
        <span className="text-base">{fileExtIcon(name)}</span>
        <span className="text-xs font-medium text-violet-200 flex-1 truncate">{name}</span>
        <svg
          className={`w-3.5 h-3.5 text-violet-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {expanded && (
        <pre className="px-3 pb-3 text-[11px] text-violet-200/70 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
          {preview}{preview.length >= 120 ? "…" : ""}
        </pre>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, setActiveMode, setActiveView }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isModelSuggestion = suggestion.type === "model";

  const handleSwitch = () => {
    if (!isModelSuggestion) {
      if (setActiveView) setActiveView(suggestion.view);
      if (setActiveMode) setActiveMode(suggestion.mode);
    }
  };

  return (
    <div className="flex animate-msg-left">
      <div className={`max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex flex-col gap-2 border ${
        isModelSuggestion
          ? "bg-amber-950/30 border-amber-500/30"
          : "bg-violet-950/40 border-violet-500/30"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{isModelSuggestion ? "🤖" : "💡"}</span>
            <p className={`text-sm font-semibold ${isModelSuggestion ? "text-amber-200" : "text-violet-200"}`}>
              {isModelSuggestion ? "Better model for this" : "Better tool available"}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-600 hover:text-gray-400 text-sm leading-none flex-shrink-0 mt-0.5"
          >✕</button>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          {isModelSuggestion ? (
            <>Try <span className="font-medium text-amber-300">{suggestion.icon} {suggestion.label}</span> for this — {suggestion.hint}</>
          ) : (
            <><span className={`font-medium ${suggestion.view === "devtools" ? "text-emerald-300" : "text-violet-300"}`}>{suggestion.icon} {suggestion.label}</span> is designed exactly for this.{suggestion.hint ? ` ${suggestion.hint}` : " Switch to get more accurate, structured results."}</>
          )}
        </p>

        {!isModelSuggestion && (
          <button
            onClick={handleSwitch}
            className={`self-start flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors ${
              suggestion.view === "devtools"
                ? "bg-emerald-700 hover:bg-emerald-600"
                : "bg-violet-600 hover:bg-violet-500"
            }`}
          >
            Open {suggestion.label} →
          </button>
        )}

        {isModelSuggestion && (
          <p className="text-xs text-amber-400/70">
            Switch provider in the sidebar → Settings → Provider / Model
          </p>
        )}
      </div>
    </div>
  );
}

export default function Message({ message, setActiveMode, setActiveView }) {
  if (message.role === "suggestion") {
    return <SuggestionCard suggestion={message.suggestion} setActiveMode={setActiveMode} setActiveView={setActiveView} />;
  }

  const isUser = message.role === "user";
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const { cleanText, files } = isUser ? parseUserContent(message.content) : { cleanText: message.content, files: [] };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse animate-msg-right" : "animate-msg-left"}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-2xl flex-shrink-0 shadow-sm overflow-hidden">
        {isUser ? (
          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">U</div>
        ) : (
          <img src="/logo.png" alt="AiMitra" className="w-full h-full object-cover" style={{ objectPosition: "18% 45%" }} />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            message.isError
              ? "bg-red-900/30 border border-red-700/60 text-red-200 rounded-tl-sm"
              : isUser
              ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-tr-sm shadow-md shadow-violet-900/30"
              : "bg-[#1a1f2e] text-gray-100 rounded-tl-sm border border-gray-700/60 shadow-sm"
          }`}
        >
          {isUser ? (
            <>
              {cleanText && <p className="whitespace-pre-wrap">{cleanText}</p>}
              {files.map((f, i) => (
                <AttachedFileChip key={i} name={f.name} preview={f.preview} />
              ))}
            </>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-600 px-1">{time}</span>
      </div>
    </div>
  );
}
