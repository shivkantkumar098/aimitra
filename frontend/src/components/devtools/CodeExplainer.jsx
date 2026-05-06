import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";
import FileDrop from "../shared/FileDrop";

const LANGUAGES = ["Auto-detect","JavaScript","TypeScript","Python","Java","C#","C++","Go","Rust","Ruby","PHP","Swift","Kotlin","SQL","Shell/Bash","YAML","JSON","HTML/CSS"];

export default function CodeExplainer({ config }) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("Auto-detect");
  const [depth, setDepth] = useState("detailed");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Code Explainer", mode: "explain", view: "devtools" });

  const system = `You are a senior software engineer and expert code educator. Explain code clearly and accurately.
Depth levels:
- simple: plain English, no jargon, as if explaining to a junior dev
- detailed: explain logic, patterns, data flow, and any gotchas
- expert: deep dive — algorithms, complexity, design patterns, potential issues, optimization opportunities`;

  const handle = async () => {
    if (!code.trim()) return;
    const langHint = lang !== "Auto-detect" ? ` The code is written in ${lang}.` : "";
    await query(system, `Explain this code at ${depth} level.${langHint}\n\nExplain:\n1. What the code does overall\n2. How it works step by step\n3. Key concepts or patterns used\n4. Any potential issues or edge cases\n\n\`\`\`\n${code}\n\`\`\``);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📋 Paste Your Code</span>
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500">
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
            <select value={depth} onChange={e => setDepth(e.target.value)}
              className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500">
              <option value="simple">Simple</option>
              <option value="detailed">Detailed</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} rows={10}
          placeholder="// Paste your code here..."
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
        <div className="px-4 pb-3">
          <FileDrop onLoad={(content) => setCode(content)} label="Or drop a code file here" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || !code.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Explaining...</> : "🔍 Explain Code"}
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      <ResultPanel result={result} title="💡 Explanation" toolName="code-explainer" onClear={clear} />
    </div>
  );
}
