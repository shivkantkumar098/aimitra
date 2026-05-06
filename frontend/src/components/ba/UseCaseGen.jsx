import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const COMPLEXITIES = [
  { id: "simple",   label: "Simple" },
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
];

const SYSTEM_PROMPT = `You are a Business Analyst expert in writing formal use cases following industry standards. Create complete use case documents with all required sections. Use clear, unambiguous language.`;

export default function UseCaseGen({ config }) {
  const [description, setDescription] = useState("");
  const [actors, setActors]           = useState("");
  const [complexity, setComplexity]   = useState("standard");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Use Case Generator", mode: "ba_use_case", view: "ba" });

  const handle = async () => {
    if (!description.trim()) return;
    await query(
      SYSTEM_PROMPT,
      `Generate a ${complexity} use case for: ${description}. Actors involved: ${actors || "Not specified"}. Include: Use Case ID, Name, Description, Actors (Primary/Secondary), Preconditions, Postconditions, Main Success Scenario (numbered steps), Alternative Flows, Exception Flows, Business Rules, Non-Functional Requirements.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">🎭 Feature Description</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder={`Describe the feature or system functionality, e.g.:\n\nOnline banking transfer: A user initiates a fund transfer from their account to another bank account, selecting the amount, destination account, and scheduling the transfer date.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">👥 Actors</span>
        </div>
        <input
          type="text"
          value={actors}
          onChange={(e) => setActors(e.target.value)}
          placeholder="e.g. User, Admin, System, Payment Gateway"
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">Use Case Complexity</label>
        <div className="flex flex-wrap gap-2">
          {COMPLEXITIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setComplexity(c.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                complexity === c.id
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
          disabled={isLoading || !description.trim()}
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
          ) : "🎭 Generate Use Case"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="🎭 Use Case" titleColor="text-amber-300" toolName="use-case" onClear={clear} maxHeight="600px" />
    </div>
  );
}
