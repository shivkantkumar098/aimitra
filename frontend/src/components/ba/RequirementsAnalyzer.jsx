import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const SYSTEM_PROMPT = `You are a senior Business Analyst and requirements engineer. Analyze requirements critically to ensure completeness, consistency, clarity, and testability. Be specific with examples from the provided text.`;

export default function RequirementsAnalyzer({ config }) {
  const [requirements, setRequirements] = useState("");
  const [gaps, setGaps]               = useState(true);
  const [ambiguities, setAmbiguities] = useState(true);
  const [conflicts, setConflicts]     = useState(true);
  const [testability, setTestability] = useState(true);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Requirements Analyzer", mode: "ba_requirements", view: "ba" });

  const handle = async () => {
    if (!requirements.trim()) return;
    const types = [
      gaps         && "gaps",
      ambiguities  && "ambiguities",
      conflicts    && "conflicts",
      testability  && "testability issues",
    ].filter(Boolean);
    if (types.length === 0) return;
    await query(
      SYSTEM_PROMPT,
      `Analyze these requirements for: ${types.join(", ")}.\n\nRequirements:\n${requirements}\n\nFor each issue found, cite the specific requirement text, explain the problem, and suggest an improvement.`
    );
  };

  const TOGGLES = [
    { key: "gaps",        label: "Gaps",          value: gaps,        set: setGaps },
    { key: "ambiguities", label: "Ambiguities",   value: ambiguities, set: setAmbiguities },
    { key: "conflicts",   label: "Conflicts",     value: conflicts,   set: setConflicts },
    { key: "testability", label: "Testability",   value: testability, set: setTestability },
  ];

  const anySelected = gaps || ambiguities || conflicts || testability;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">🔎 Requirements Text</span>
        </div>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          rows={8}
          placeholder={`Paste your requirements here, e.g.:\n\nREQ-001: The system shall allow users to login.\nREQ-002: The system should respond quickly.\nREQ-003: The admin can manage user accounts and the system must be secure.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">Analysis Types</label>
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
          disabled={isLoading || !requirements.trim() || !anySelected}
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
          ) : "🔎 Analyze Requirements"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="🔎 Analysis Results" titleColor="text-amber-300" toolName="requirements-analysis" onClear={clear} maxHeight="600px" />
    </div>
  );
}
