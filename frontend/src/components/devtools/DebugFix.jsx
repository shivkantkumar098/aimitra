import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";
import FileDrop from "../shared/FileDrop";

const LANGUAGES = ["Auto-detect","JavaScript","TypeScript","Python","Java","C#","C++","Go","Rust","Ruby","PHP","Swift","Kotlin","SQL","Shell/Bash"];

export default function DebugFix({ config }) {
  const [errorMsg, setErrorMsg] = useState("");
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("Auto-detect");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Debug & Fix", mode: "debug", view: "devtools" });

  const handle = async () => {
    if (!errorMsg.trim() && !code.trim()) return;
    const langHint = lang !== "Auto-detect" ? `Language: ${lang}\n` : "";
    const errorPart = errorMsg.trim() ? `Error / Stack Trace:\n\`\`\`\n${errorMsg}\n\`\`\`\n\n` : "";
    const codePart  = code.trim()     ? `Code:\n\`\`\`\n${code}\n\`\`\`` : "";
    await query(
      `You are an expert debugger. Diagnose errors precisely, explain the root cause clearly, provide a complete fix, and explain why the fix works. Format your response with clear sections.`,
      `${langHint}${errorPart}${codePart}\n\nProvide:\n1. **Root Cause** — what exactly caused this error\n2. **Fixed Code** — the corrected code with comments on changes\n3. **Explanation** — why this fix works\n4. **Prevention** — how to avoid this in the future`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">🚨 Error / Stack Trace</span>
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-red-500">
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <textarea value={errorMsg} onChange={e => setErrorMsg(e.target.value)} rows={5}
          placeholder="TypeError: Cannot read properties of undefined (reading 'map')\n  at Component (App.jsx:42:18)\n  ..."
          className="w-full bg-[#0d1117] text-red-300 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📋 Problematic Code <span className="text-gray-500 font-normal text-xs">(optional but recommended)</span></span>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} rows={8}
          placeholder="// Paste the code that's causing the error..."
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
        <div className="px-4 pb-3"><FileDrop onLoad={(c) => setCode(c)} label="Or drop a code file here" /></div>
      </div>

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || (!errorMsg.trim() && !code.trim())}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Diagnosing...</> : "🐞 Debug & Fix"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}
      <ResultPanel result={result} title="🔧 Diagnosis & Fix" titleColor="text-white" toolName="debug-fix" onClear={clear} maxHeight="600px" />
    </div>
  );
}
