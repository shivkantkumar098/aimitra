import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const AUDIENCES = [
  { id: "executive",     label: "Executive" },
  { id: "technical",     label: "Technical Team" },
  { id: "end-users",     label: "End Users" },
  { id: "project-team",  label: "Project Team" },
];

const TONES = [
  { id: "formal",          label: "Formal" },
  { id: "conversational",  label: "Conversational" },
];

const SYSTEM_PROMPT = `You are an expert Business Analyst and professional communicator. Write clear, concise, and impactful stakeholder communications tailored to the audience's level of technical knowledge and interests.`;

export default function StakeholderUpdate({ config }) {
  const [update, setUpdate]     = useState("");
  const [audience, setAudience] = useState("executive");
  const [tone, setTone]         = useState("formal");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Stakeholder Update", mode: "ba_stakeholder", view: "ba" });

  const handle = async () => {
    if (!update.trim()) return;
    await query(
      SYSTEM_PROMPT,
      `Write a ${tone} stakeholder update for ${audience} audience about: ${update}. Include: Subject line, Opening summary (2-3 sentences), Key points/changes, Impact to stakeholders, Next steps/actions required, Timeline, and a professional closing.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">📧 What to Communicate</span>
        </div>
        <textarea
          value={update}
          onChange={(e) => setUpdate(e.target.value)}
          rows={8}
          placeholder={`Describe what needs to be communicated, e.g.:\n\nThe project go-live date has been moved from June 1 to July 15 due to additional security testing requirements identified during UAT. The extra 6 weeks will be used to address 3 critical security findings and re-run regression tests.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Audience</label>
          <div className="flex flex-col gap-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAudience(a.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  audience === a.id
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Tone</label>
          <div className="flex flex-col gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  tone === t.id
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !update.trim()}
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
          ) : "📧 Generate Update"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-amber-300">📧 Stakeholder Communication</span>
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
