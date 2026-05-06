import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const FORMATS = [
  { id: "gherkin",   label: "Gherkin (Given/When/Then)" },
  { id: "checklist", label: "Numbered Checklist" },
  { id: "both",      label: "Both Formats" },
];

const SYSTEM_PROMPT = `You are a Business Analyst expert in writing comprehensive, testable acceptance criteria. Write criteria that are: specific and measurable, testable by QA, free of ambiguity, and cover happy paths, edge cases, and negative scenarios.`;

export default function AcceptanceCriteria({ config }) {
  const [story, setStory]   = useState("");
  const [format, setFormat] = useState("gherkin");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Acceptance Criteria", mode: "ba_acceptance", view: "ba" });

  const handle = async () => {
    if (!story.trim()) return;
    const formatNote =
      format === "gherkin"
        ? "Use Given/When/Then format."
        : format === "checklist"
        ? "Use a numbered checklist."
        : "Provide both Gherkin (Given/When/Then) and numbered checklist formats.";
    await query(
      SYSTEM_PROMPT,
      `Generate acceptance criteria for: ${story}\nFormat: ${format}. ${formatNote}`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">✅ User Story</span>
        </div>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={8}
          placeholder={`Paste your user story here, e.g.:\n\nAs a registered user\nI want to reset my password via email\nSo that I can regain access to my account if I forget my password`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">Output Format</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                format === f.id
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !story.trim()}
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
          ) : "✅ Generate Acceptance Criteria"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="✅ Acceptance Criteria" titleColor="text-amber-300" toolName="acceptance-criteria" onClear={clear} maxHeight="600px" />
    </div>
  );
}
