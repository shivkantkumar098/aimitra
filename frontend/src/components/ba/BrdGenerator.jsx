import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const SECTIONS = [
  { id: "full",          label: "Full BRD" },
  { id: "scope",         label: "Scope & Objectives" },
  { id: "functional",    label: "Functional Requirements" },
  { id: "non-functional", label: "Non-Functional Requirements" },
  { id: "constraints",   label: "Constraints & Assumptions" },
];

const SYSTEM_PROMPT = `You are a senior Business Analyst expert in writing professional Business Requirements Documents (BRDs). Write formal, complete, and precise BRD content following industry standards. Use professional language appropriate for executive stakeholders.`;

export default function BrdGenerator({ config }) {
  const [project, setProject] = useState("");
  const [section, setSection] = useState("full");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "BRD Generator", mode: "ba_brd", view: "ba" });

  const handle = async () => {
    if (!project.trim()) return;
    await query(
      SYSTEM_PROMPT,
      `Generate the ${section} section(s) of a BRD for: ${project}. Include all standard subsections, numbered requirements (REQ-001 format), priority levels (Must Have/Should Have/Could Have/Won't Have), and rationale for each requirement.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">📄 Project / Feature Description</span>
        </div>
        <textarea
          value={project}
          onChange={(e) => setProject(e.target.value)}
          rows={8}
          placeholder={`Describe your project or feature, e.g.:\n\nCustomer Self-Service Portal: A web portal enabling customers to view their account details, submit service requests, track order status, download invoices, and manage their contact preferences without needing to contact customer support.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">BRD Section</label>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                section === s.id
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !project.trim()}
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
          ) : "📄 Generate BRD"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-amber-300">📄 BRD Section</span>
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
