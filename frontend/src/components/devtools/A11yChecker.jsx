import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const WCAG_LEVELS = [
  { id: "A",   label: "WCAG Level A",   desc: "Minimum accessibility" },
  { id: "AA",  label: "WCAG Level AA",  desc: "Standard compliance (most regulations)" },
  { id: "AAA", label: "WCAG Level AAA", desc: "Highest standard" },
];

const DEPTHS = [
  { id: "quick",    label: "Quick Scan",          desc: "Top violations only" },
  { id: "detailed", label: "Detailed + Fixes",    desc: "Each issue with corrected code" },
  { id: "full",     label: "Full Audit",           desc: "Complete report with examples" },
];

const SYSTEM_PROMPT = `You are a WCAG accessibility expert and web accessibility auditor. You analyze HTML code for accessibility violations and provide:
1. Clear identification of each violation with the specific WCAG criterion it violates (e.g., WCAG 2.1 SC 1.1.1)
2. Severity level: 🔴 Critical (blocks users), 🟠 Serious, 🟡 Moderate, 🟢 Minor
3. The exact problematic code snippet
4. A corrected code snippet that fixes the violation
5. Plain-language explanation of why it matters and which users are affected
6. Total violation count and an overall accessibility score estimate (0-100)

Be thorough, technical, and actionable. Prioritize violations by severity.`;

export default function A11yChecker({ config }) {
  const [html, setHtml] = useState("");
  const [wcagLevel, setWcagLevel] = useState("AA");
  const [depth, setDepth] = useState("detailed");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "A11y Checker", mode: "a11y", view: "devtools" });

  const handle = async () => {
    if (!html.trim()) return;
    const level = WCAG_LEVELS.find((l) => l.id === wcagLevel)?.label;
    const dp = DEPTHS.find((d) => d.id === depth)?.label;
    await query(
      SYSTEM_PROMPT,
      `Perform a ${dp} accessibility audit of the following HTML against ${level} (${dp}).

HTML to audit:
\`\`\`html
${html}
\`\`\`

Check for violations including but not limited to:
- Missing or inadequate alt text on images (SC 1.1.1)
- Insufficient color contrast (SC 1.4.3 / 1.4.6)
- Missing form labels (SC 1.3.1, 3.3.2)
- Missing ARIA roles or landmark regions (SC 1.3.6)
- Keyboard navigation issues (SC 2.1.1)
- Missing focus indicators (SC 2.4.7)
- Missing page language (SC 3.1.1)
- Empty links or buttons without accessible names (SC 4.1.2)
- Missing heading hierarchy (SC 1.3.1)
- Missing skip navigation (SC 2.4.1)

For each violation: show the bad code, the fixed code, and explain the impact.
End with a summary table and overall accessibility score.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">🌐 HTML to Audit</span>
          <span className="text-xs text-gray-500">Paste a component, page section, or full page</span>
        </div>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          placeholder={`<form>\n  <input type="text" placeholder="Enter email">\n  <img src="logo.png">\n  <button style="color: #aaa; background: #bbb">Submit</button>\n</form>`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">WCAG Standard</label>
          <div className="flex flex-col gap-1.5">
            {WCAG_LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setWcagLevel(l.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  wcagLevel === l.id
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className="font-medium">{l.label}</span>
                <span className="ml-1 opacity-60">— {l.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Audit Depth</label>
          <div className="flex flex-col gap-1.5">
            {DEPTHS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDepth(d.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  depth === d.id
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className="font-medium">{d.label}</span>
                <span className="ml-1 opacity-60">— {d.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !html.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Auditing...
            </>
          ) : "♿ Run Accessibility Audit"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">♿ Accessibility Report</span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
            >
              Copy
            </button>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[600px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
