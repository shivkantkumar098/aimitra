import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const PROCESS_TYPES = [
  { id: "as-is", label: "AS-IS (Current)" },
  { id: "to-be", label: "TO-BE (Future)" },
  { id: "both",  label: "Both AS-IS & TO-BE" },
];

const SYSTEM_PROMPT = `You are a Business Analyst expert in documenting business processes. Create clear, complete process flow documentation that can be used to create diagrams. Include all decision points, parallel paths, and exception handling.`;

export default function ProcessFlowGen({ config }) {
  const [process, setProcess]         = useState("");
  const [processType, setProcessType] = useState("to-be");
  const [swimlane, setSwimlane]       = useState(false);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Process Flow Generator", mode: "ba_process_flow", view: "ba" });

  const handle = async () => {
    if (!process.trim()) return;
    const swimlaneNote = swimlane
      ? "Include swim lanes identifying which role/system performs each step."
      : "";
    await query(
      SYSTEM_PROMPT,
      `Create a ${processType} process flow for: ${process}. ${swimlaneNote} Format as: numbered steps, decision points marked with ◆, swim lanes with role labels (if applicable), Start/End points clearly marked.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">🔄 Process Description</span>
        </div>
        <textarea
          value={process}
          onChange={(e) => setProcess(e.target.value)}
          rows={8}
          placeholder={`Describe the business process, e.g.:\n\nEmployee expense reimbursement process: Employee submits expense report with receipts, manager reviews and approves/rejects, Finance processes payment, and employee receives reimbursement within 5 business days.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Process Type</label>
          <div className="flex flex-col gap-1.5">
            {PROCESS_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setProcessType(t.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  processType === t.id
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Options</label>
          <button
            onClick={() => setSwimlane(!swimlane)}
            className={`w-full text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
              swimlane
                ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
            }`}
          >
            {swimlane ? "✓ " : ""}Include Swim Lanes
          </button>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Swim lanes identify which role or system is responsible for each step in the process.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !process.trim()}
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
          ) : "🔄 Generate Process Flow"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="🔄 Process Flow" titleColor="text-amber-300" toolName="process-flow" onClear={clear} maxHeight="600px" />
    </div>
  );
}
