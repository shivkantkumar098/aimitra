import { useState, useRef } from "react";
import { CAPABILITIES } from "../utils/capabilities";

const ACCEPT_EXTS = ".txt,.py,.js,.jsx,.ts,.tsx,.json,.xml,.html,.htm,.css,.scss,.less,.md,.mdx,.csv,.log,.yaml,.yml,.java,.cs,.cpp,.c,.h,.hpp,.go,.rb,.php,.sh,.bash,.zsh,.sql,.env,.conf,.toml,.ini,.feature,.robot,.rs,.swift,.kt,.kts,.dart,.vue,.svelte,.astro,.graphql,.proto,.tf,.hcl,.dockerfile,.makefile,.gradle,.pom,.lock";
const TEXT_EXTS = new Set(ACCEPT_EXTS.split(",").map((e) => e.replace(".", "")));

// Files that have no extension but are commonly text
const EXTENSIONLESS_TEXT = new Set(["dockerfile", "makefile", "jenkinsfile", "procfile", "vagrantfile"]);

function isTextFile(name) {
  const lower = name.toLowerCase();
  const ext = lower.split(".").pop();
  return TEXT_EXTS.has(ext) || EXTENSIONLESS_TEXT.has(lower);
}

function fileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["py"].includes(ext)) return "🐍";
  if (["js", "jsx", "ts", "tsx", "vue", "svelte"].includes(ext)) return "⚛";
  if (["json", "yaml", "yml", "toml"].includes(ext)) return "📋";
  if (["html", "htm", "css", "scss", "less"].includes(ext)) return "🌐";
  if (["md", "mdx"].includes(ext)) return "📝";
  if (["csv", "log"].includes(ext)) return "📊";
  if (["sql"].includes(ext)) return "🗄️";
  if (["sh", "bash", "zsh"].includes(ext)) return "💻";
  if (["java", "cs", "cpp", "c", "h", "hpp", "go", "rb", "php", "rs", "swift", "kt", "dart"].includes(ext)) return "⚙️";
  if (["feature", "robot"].includes(ext)) return "🧪";
  if (["tf", "hcl"].includes(ext)) return "🏗️";
  return "📄";
}

function fmtSize(b) {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

function totalSize(files) {
  return files.reduce((sum, f) => sum + f.size, 0);
}

export default function ChatInput({ onSend, isLoading, activeMode, setActiveMode }) {
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const activeCapability = CAPABILITIES.find((c) => c.id === activeMode);

  const readFiles = (fileList) => {
    setFileError(null);
    const files = Array.from(fileList).filter((f) => isTextFile(f.name));
    const skipped = Array.from(fileList).length - files.length;

    if (files.length === 0) {
      setFileError("No supported text/code files found.");
      return;
    }

    files.forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedFiles((prev) => {
          // Avoid duplicates by name
          if (prev.some((p) => p.name === file.name)) return prev;
          return [...prev, { name: file.name, content: ev.target.result, size: file.size, ext }];
        });
      };
      reader.onerror = () => {
        setFileError(`Failed to read ${file.name}`);
      };
      reader.readAsText(file, "UTF-8");
    });

    if (skipped > 0) {
      setFileError(`${skipped} binary/unsupported file${skipped > 1 ? "s" : ""} skipped (only text & code files supported).`);
    }
  };

  const handleFileSelect = (e) => {
    readFiles(e.target.files);
    e.target.value = "";
  };

  const handleFolderSelect = (e) => {
    readFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  const clearAll = () => { setAttachedFiles([]); setFileError(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!text.trim() && attachedFiles.length === 0) || isLoading) return;

    let msg = text.trim();
    if (attachedFiles.length > 0) {
      const block = attachedFiles
        .map((f) => `\n\n--- File: ${f.name} ---\n\`\`\`${f.ext}\n${f.content}\n\`\`\``)
        .join("");
      msg = (msg || "Please analyze the attached file(s).") + block;
    }

    onSend(msg);
    setText("");
    setAttachedFiles([]);
    setFileError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
    setText(e.target.value);
  };

  const canSend = (text.trim() || attachedFiles.length > 0) && !isLoading;
  const total = totalSize(attachedFiles);
  const isLarge = total > 200 * 1024; // soft warning above 200 KB total

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 pt-3 pb-4">
      {/* Capability switcher pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none">
        {CAPABILITIES.map((cap) => (
          <button
            key={cap.id}
            type="button"
            onClick={() => setActiveMode(cap.id)}
            title={cap.description}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              activeMode === cap.id
                ? "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-sm"
                : "text-[var(--text-faint)] border-[var(--border-primary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
            }`}
          >
            <span className="text-sm leading-none">{cap.icon}</span>
            <span className="whitespace-nowrap">{cap.label}</span>
          </button>
        ))}
      </div>

      {/* Attached files strip */}
      {attachedFiles.length > 0 && (
        <div className="mb-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-faint)]">
              {attachedFiles.length} file{attachedFiles.length !== 1 ? "s" : ""} · {fmtSize(total)}
              {isLarge && (
                <span className="ml-2 text-amber-400">⚠ Large — may exceed model context window</span>
              )}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-[var(--text-faint)] hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attachedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-violet-600/30 px-2.5 py-1.5 rounded-lg text-xs"
              >
                <span className="text-base leading-none">{fileIcon(f.name)}</span>
                <span className="text-[var(--text-primary)] font-medium max-w-[140px] truncate" title={f.name}>{f.name}</span>
                <span className="text-[var(--text-faint)]">{fmtSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-0.5 text-gray-500 hover:text-red-400 transition-colors text-base leading-none"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {fileError && (
        <p className="text-xs text-amber-400 mb-2">⚠ {fileError}</p>
      )}

      {/* Text input + send */}
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-end">
        <div
          className={`flex-1 rounded-2xl border transition-colors overflow-hidden ${
            attachedFiles.length > 0
              ? "border-violet-600/40 bg-[var(--bg-surface)]"
              : "border-[var(--border-primary)] bg-[var(--bg-surface)] focus-within:border-violet-500/60"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFiles.length > 0
                ? "Add instructions or send file(s) directly…"
                : `${activeCapability?.description ?? "Type a message"}…`
            }
            rows={1}
            disabled={isLoading}
            className="w-full bg-transparent text-[var(--text-primary)] text-sm px-4 pt-3 pb-1 resize-none focus:outline-none placeholder-[var(--text-ghost)] disabled:opacity-50 leading-relaxed"
          />
          <div className="flex items-center px-3 pb-2 pt-0.5 gap-3">
            {/* Attach file button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach text/code files (no size limit)"
              className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-violet-400 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>File</span>
            </button>

            {/* Attach folder button */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={isLoading}
              title="Attach a folder (all text/code files inside)"
              className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-violet-400 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Folder</span>
            </button>

            {attachedFiles.length > 0 && (
              <span className="bg-violet-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold leading-none">
                {attachedFiles.length}
              </span>
            )}

            <span className="ml-auto text-xs text-[var(--text-ghost)]">⏎ send · ⇧⏎ newline</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className={`w-11 h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-ui)] disabled:border disabled:border-[var(--border-primary)] disabled:cursor-not-allowed rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-md ${canSend && !isLoading ? "animate-glow-pulse" : ""}`}
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

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_EXTS}
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is non-standard but widely supported
        webkitdirectory="true"
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />
    </div>
  );
}
