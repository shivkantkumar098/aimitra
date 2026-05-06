import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";
import FileDrop from "../shared/FileDrop";

const LANGUAGES = ["JavaScript","TypeScript","Python","Java","C#","C++","C","Go","Rust","Ruby","PHP","Swift","Kotlin","Dart","Scala","R","MATLAB","Shell/Bash","PowerShell","SQL"];

export default function CodeConverter({ config }) {
  const [code, setCode] = useState("");
  const [fromLang, setFromLang] = useState("Python");
  const [toLang, setToLang] = useState("JavaScript");
  const [keepComments, setKeepComments] = useState(true);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Code Converter", mode: "convert", view: "devtools" });

  const swap = () => { setFromLang(toLang); setToLang(fromLang); };

  const handle = async () => {
    if (!code.trim()) return;
    await query(
      `You are an expert polyglot programmer. Convert code between programming languages accurately, preserving logic and functionality. Use idiomatic patterns for the target language — don't just translate syntax literally. Output the converted code in a fenced code block, followed by a brief explanation of key differences.`,
      `Convert the following ${fromLang} code to ${toLang}.${keepComments ? " Preserve and adapt all comments." : " Omit comments."}\n\nSource (${fromLang}):\n\`\`\`${fromLang.toLowerCase()}\n${code}\n\`\`\`\n\nProvide:\n1. **Converted ${toLang} code** (in a code block)\n2. **Key differences** — what changed and why (idioms, patterns, library equivalents)`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Language selectors */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <select value={fromLang} onChange={e => setFromLang(e.target.value)}
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500">
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={swap} title="Swap languages"
            className="mt-5 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </button>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <select value={toLang} onChange={e => setToLang(e.target.value)}
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500">
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={keepComments} onChange={e => setKeepComments(e.target.checked)}
            className="rounded accent-violet-500" />
          <span className="text-xs text-gray-400">Keep comments</span>
        </label>
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📋 Source Code ({fromLang})</span>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} rows={12}
          placeholder={`# Paste your ${fromLang} code here...`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
        <div className="px-4 pb-3"><FileDrop onLoad={(c) => setCode(c)} label="Or drop a source code file here" /></div>
      </div>

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || !code.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Converting...</> : `🔄 Convert to ${toLang}`}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}
      <ResultPanel result={result} title="✅ Converted Code" titleColor="text-white" toolName="code-converter" onClear={clear} maxHeight="600px" />
    </div>
  );
}
