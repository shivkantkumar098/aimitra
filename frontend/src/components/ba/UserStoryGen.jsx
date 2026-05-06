import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const ROLES = ["User", "Admin", "Manager", "Customer", "Developer"];
const STORY_TYPES = [
  { id: "standard", label: "Standard Story" },
  { id: "epic",     label: "Epic" },
  { id: "spike",    label: "Spike" },
];

const SYSTEM_PROMPT = `You are a senior Business Analyst expert in Agile methodologies. Write clear, well-structured user stories following industry best practices. Always include: Title, User Story (As a... I want... So that...), Acceptance Criteria (numbered list), Definition of Done, Story Points estimate (Fibonacci: 1,2,3,5,8,13), and Dependencies/Assumptions.`;

export default function UserStoryGen({ config }) {
  const [feature, setFeature]     = useState("");
  const [role, setRole]           = useState("User");
  const [storyType, setStoryType] = useState("standard");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "User Story Generator", mode: "ba_user_story", view: "ba" });

  const handle = async () => {
    if (!feature.trim()) return;
    await query(
      SYSTEM_PROMPT,
      `Generate a user story for: ${feature}\nWith role: ${role}, type: ${storyType}`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">📖 Feature / Requirement Description</span>
        </div>
        <textarea
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          rows={8}
          placeholder={`Describe the feature or requirement, e.g.:\n\nUsers need to be able to reset their password via email link.\nThe link should expire after 24 hours and can only be used once.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">User Role</label>
          <div className="flex flex-col gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  role === r
                    ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Story Type</label>
          <div className="flex flex-col gap-1.5">
            {STORY_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setStoryType(t.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  storyType === t.id
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
          disabled={isLoading || !feature.trim()}
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
          ) : "📖 Generate User Story"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-amber-300">📖 User Story</span>
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
