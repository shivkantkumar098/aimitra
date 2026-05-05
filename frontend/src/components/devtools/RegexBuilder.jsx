import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const QUICK = [
  { label: "Email",       desc: "Valid email address" },
  { label: "URL",         desc: "HTTP/HTTPS URL" },
  { label: "Phone",       desc: "International phone number" },
  { label: "IP Address",  desc: "IPv4 address" },
  { label: "Date",        desc: "Date in MM/DD/YYYY format" },
  { label: "Password",    desc: "Strong password (8+ chars, upper, lower, digit, special)" },
  { label: "Credit Card", desc: "16-digit credit card number" },
  { label: "Hex Color",   desc: "Hex color code like #ff0000" },
];

export default function RegexBuilder({ config }) {
  const [description, setDescription] = useState("");
  const [testString, setTestString] = useState("");
  const [flavor, setFlavor] = useState("JavaScript");
  const [extractedRegex, setExtractedRegex] = useState("");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Regex Builder", mode: "regex", view: "devtools" });

  const handle = async (desc) => {
    const d = desc || description;
    if (!d.trim()) return;
    const testPart = testString.trim() ? `\n\nTest against these strings:\n${testString}` : "";
    const res = await query(
      `You are a regex expert. Generate precise, well-tested regular expressions. Always explain each part of the pattern and provide real-world usage examples. Target flavor: ${flavor}.`,
      `Generate a regex for: ${d}${testPart}\n\nProvide:\n1. **Regex Pattern** — in a code block\n2. **Flags** — which flags to use and why (e.g. /i, /g, /m)\n3. **Pattern Breakdown** — explain each part\n4. **Usage Example** — code snippet in ${flavor}\n5. **Edge Cases** — what it matches and doesn't match`
    );
    // Try to auto-extract the first code block content as the regex
    const match = (res || "").match(/```[a-z]*\n([^\n`]+)/);
    if (match) setExtractedRegex(match[1].trim());
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Quick picks */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Patterns</p>
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q.label} onClick={() => { setDescription(q.desc); handle(q.desc); }}
              className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-white">✏️ Describe Your Pattern</label>
          <select value={flavor} onChange={e => setFlavor(e.target.value)}
            className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500">
            {["JavaScript","Python","Java","C#","Go","Ruby","PHP","PCRE"].map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handle(); }}
          rows={3} placeholder="e.g. Match a valid email address that allows + in the local part..."
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600 mb-3" />

        <label className="block text-xs font-semibold text-gray-400 mb-1">
          🧪 Test Strings <span className="font-normal text-gray-600">(one per line, optional)</span>
        </label>
        <textarea value={testString} onChange={e => setTestString(e.target.value)} rows={3}
          placeholder={"user@example.com\ninvalid-email\ntest+filter@company.co.uk"}
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600" />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => handle()} disabled={isLoading || !description.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</> : "📝 Generate Regex"}
        </button>
        {extractedRegex && (
          <div className="flex items-center gap-2 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-0">
            <code className="text-violet-300 text-sm truncate flex-1">{extractedRegex}</code>
            <button onClick={() => navigator.clipboard.writeText(extractedRegex)}
              className="text-xs text-gray-500 hover:text-gray-300 flex-shrink-0">Copy</button>
          </div>
        )}
        {result && <button onClick={() => { clear(); setExtractedRegex(""); }} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Pattern Details</span>
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy All</button>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[500px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
