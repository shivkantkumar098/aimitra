import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ResultPanel({ result, title = "Result", titleColor = "text-white", toolName = "aimitra-output", onClear, maxHeight = "500px" }) {
  if (!result) return null;

  const filename = `${slugify(toolName)}-${new Date().toISOString().slice(0, 10)}.md`;

  return (
    <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-wrap gap-2">
        <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadText(result, filename)}
            title="Download as .md file"
            className="text-xs px-3 py-1 bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-300 border border-emerald-700/40 rounded-lg transition-colors flex items-center gap-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(result)}
            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Copy
          </button>
          {onClear && (
            <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-300 px-2 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="p-4 markdown-content text-sm overflow-y-auto" style={{ maxHeight }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
      </div>
    </div>
  );
}
