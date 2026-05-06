import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const CATEGORIES = [
  { id: "process",    label: "Process" },
  { id: "technology", label: "Technology" },
  { id: "people",     label: "People" },
  { id: "all",        label: "All Categories" },
];

const SYSTEM_PROMPT = `You are a Business Analyst expert at conducting thorough gap analyses. Identify and categorize gaps systematically. Provide actionable recommendations with effort estimates (High/Medium/Low) and priority.`;

export default function GapAnalysis({ config }) {
  const [currentState, setCurrentState]   = useState("");
  const [desiredState, setDesiredState]   = useState("");
  const [category, setCategory]           = useState("all");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Gap Analysis", mode: "ba_gap", view: "ba" });

  const handle = async () => {
    if (!currentState.trim() || !desiredState.trim()) return;
    await query(
      SYSTEM_PROMPT,
      `Perform a ${category} gap analysis.\n\nCurrent State (AS-IS):\n${currentState}\n\nDesired State (TO-BE):\n${desiredState}\n\nFormat output as: Executive Summary, Gap Table (Gap | Category | Impact | Priority | Recommendation), Implementation Roadmap with phases.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">📍 Current State (AS-IS)</span>
        </div>
        <textarea
          value={currentState}
          onChange={(e) => setCurrentState(e.target.value)}
          rows={7}
          placeholder={`Describe the current state, e.g.:\n\nOrders are manually processed via email. Staff use spreadsheets to track inventory. Customer inquiries take 48+ hours to resolve. No integration between sales and fulfillment systems.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">🎯 Desired State (TO-BE)</span>
        </div>
        <textarea
          value={desiredState}
          onChange={(e) => setDesiredState(e.target.value)}
          rows={7}
          placeholder={`Describe the desired future state, e.g.:\n\nAutomated order processing with real-time inventory updates. Customer self-service portal resolving 80% of inquiries. Full integration between CRM, ERP, and fulfillment. Same-day order confirmation and tracking.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">Analysis Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                category === c.id
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !currentState.trim() || !desiredState.trim()}
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
          ) : "📊 Analyze Gaps"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="📊 Gap Analysis" titleColor="text-amber-300" toolName="gap-analysis" onClear={clear} maxHeight="600px" />
    </div>
  );
}
