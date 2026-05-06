import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const SYSTEM_PROMPT = `You are a Business Analyst expert in change management and impact analysis. Provide thorough, practical impact assessments that help organizations understand the full scope of changes before implementation.`;

export default function ImpactAnalysis({ config }) {
  const [change, setChange]       = useState("");
  const [people, setPeople]       = useState(true);
  const [process, setProcess]     = useState(true);
  const [technology, setTechnology] = useState(true);
  const [data, setData]           = useState(true);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Impact Analysis", mode: "ba_impact", view: "ba" });

  const handle = async () => {
    if (!change.trim()) return;
    const scopes = [
      people     && "people",
      process    && "process",
      technology && "technology",
      data       && "data",
    ].filter(Boolean);
    if (scopes.length === 0) return;
    await query(
      SYSTEM_PROMPT,
      `Analyze the impact of this change: ${change}.\n\nAssess impact across: ${scopes.join(", ")}.\n\nFor each area, provide: Impact Level (High/Medium/Low), Affected Groups/Systems, Specific Changes Required, Risks, Mitigation Strategies. Include an overall risk score and recommended change management approach.`
    );
  };

  const TOGGLES = [
    { key: "people",     label: "People",     value: people,     set: setPeople },
    { key: "process",    label: "Process",    value: process,    set: setProcess },
    { key: "technology", label: "Technology", value: technology, set: setTechnology },
    { key: "data",       label: "Data",       value: data,       set: setData },
  ];

  const anySelected = people || process || technology || data;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">💥 Proposed Change</span>
        </div>
        <textarea
          value={change}
          onChange={(e) => setChange(e.target.value)}
          rows={8}
          placeholder={`Describe the proposed change, e.g.:\n\nMigrating from the legacy on-premise CRM system to Salesforce cloud. All customer data, interaction history, and sales pipelines will be migrated. Sales team (120 users) will need to transition to the new platform, including training and workflow changes.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">Impact Scope</label>
        <div className="flex flex-wrap gap-2">
          {TOGGLES.map(({ key, label, value, set }) => (
            <button
              key={key}
              onClick={() => set(!value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                value
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {value ? "✓ " : ""}{label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !change.trim() || !anySelected}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating...
            </>
          ) : "💥 Analyze Impact"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-amber-300">💥 Impact Analysis</span>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
              <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>
            </div>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[600px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
