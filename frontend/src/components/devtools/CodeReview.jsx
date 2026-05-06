import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const LANGUAGES = ["Auto-detect","JavaScript","TypeScript","Python","Java","C#","C++","Go","Rust","Ruby","PHP","Swift","Kotlin"];
const FOCUS_OPTIONS = [
  { id: "bugs",        label: "🐛 Bugs & Logic Errors" },
  { id: "security",   label: "🔒 Security Vulnerabilities" },
  { id: "performance",label: "⚡ Performance" },
  { id: "style",      label: "✏️ Code Style & Readability" },
  { id: "solid",      label: "🏗️ SOLID / Design Patterns" },
  { id: "tests",      label: "🧪 Testability" },
];

export default function CodeReview({ config }) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("Auto-detect");
  const [focus, setFocus] = useState(["bugs", "security", "performance"]);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Code Review", mode: "review", view: "devtools" });

  const toggleFocus = (id) =>
    setFocus(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const handle = async () => {
    if (!code.trim()) return;
    const areas = FOCUS_OPTIONS.filter(o => focus.includes(o.id)).map(o => o.label.replace(/[^\w\s&]/g, "").trim()).join(", ");
    const langHint = lang !== "Auto-detect" ? `Language: ${lang}\n` : "";
    await query(
      `You are a senior software engineer conducting a thorough code review. Be specific, cite line numbers or code snippets when relevant, and provide actionable recommendations. Use emoji severity indicators: 🔴 Critical, 🟠 Major, 🟡 Minor, 🟢 Good practice.`,
      `${langHint}Review focus: ${areas || "all aspects"}\n\nProvide a structured code review with:\n1. **Summary** — overall assessment\n2. **Issues Found** — categorized by severity\n3. **Recommendations** — specific improvements with examples\n4. **Positive Aspects** — what the code does well\n\nCode to review:\n\`\`\`\n${code}\n\`\`\``
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📋 Code to Review</span>
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500">
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} rows={10}
          placeholder="// Paste the code you want reviewed..."
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-2.5">Review Focus (select all that apply)</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map(o => (
            <button key={o.id} onClick={() => toggleFocus(o.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                focus.includes(o.id)
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || !code.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Reviewing...</> : "👀 Review Code"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}
      <ResultPanel result={result} title="📊 Review Results" titleColor="text-white" toolName="code-review" onClear={clear} maxHeight="600px" />
    </div>
  );
}
