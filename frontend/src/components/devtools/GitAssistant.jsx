import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const COMMIT_TYPES = ["feat","fix","chore","docs","refactor","test","style","perf","ci","build","revert"];
const MODES = [
  { id: "commit",  label: "💬 Commit Message" },
  { id: "pr",      label: "📋 PR Description" },
  { id: "changelog", label: "📝 Changelog" },
  { id: "gitignore", label: "🚫 .gitignore" },
];

export default function GitAssistant({ config }) {
  const [mode, setMode] = useState("commit");
  const [diff, setDiff] = useState("");
  const [commitType, setCommitType] = useState("feat");
  const [scope, setScope] = useState("");
  const [techStack, setTechStack] = useState("");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Git Assistant", mode: "git", view: "devtools" });

  const handle = async () => {
    if (mode !== "gitignore" && !diff.trim()) return;
    if (mode === "gitignore" && !techStack.trim()) return;

    const prompts = {
      commit: `Generate a conventional commit message for this change.\n\nCommit type: ${commitType}\nScope: ${scope || "not specified"}\n\nGit diff / change description:\n${diff}\n\nProvide:\n1. **Primary commit message** following Conventional Commits spec: \`${commitType}${scope ? `(${scope})` : ""}: <description>\`\n2. **Extended body** (optional, for complex changes)\n3. **Footer** (breaking changes, issue references if mentioned)\n4. **2-3 alternative messages** with slightly different wording`,
      pr: `Write a professional GitHub Pull Request description for these changes:\n\n${diff}\n\nProvide a complete PR description with:\n1. **Title** — concise, imperative mood\n2. **Summary** — what changed and why (3-5 bullet points)\n3. **Type of Change** — checkboxes (bug fix / new feature / breaking change / docs)\n4. **How to Test** — step-by-step testing instructions\n5. **Screenshots / Notes** — placeholder section\n6. **Checklist** — pre-merge checklist`,
      changelog: `Generate a user-facing changelog entry for these changes:\n\n${diff}\n\nWrite in the style of Keep a Changelog (https://keepachangelog.com). Include sections for: Added / Changed / Deprecated / Removed / Fixed / Security as applicable. Write for end-users, not developers.`,
      gitignore: `Generate a comprehensive .gitignore file for: ${techStack}\n\nInclude patterns for:\n- Build artifacts and compiled output\n- IDE and editor files (VS Code, IntelliJ, vim, etc.)\n- OS files (.DS_Store, Thumbs.db)\n- Dependencies and package manager caches\n- Environment and secret files\n- Logs and temporary files\n- Testing and coverage output\n\nOrganize with clear section comments.`,
    };

    await query(
      `You are a senior engineer expert in git workflows and developer tooling. Write clear, professional git artifacts following industry best practices.`,
      prompts[mode]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode */}
      <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); clear(); }}
            className={`flex-1 py-2 text-xs rounded-lg font-medium transition-all ${
              mode === m.id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Options for commit mode */}
      {mode === "commit" && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4 flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Commit Type</label>
            <select value={commitType} onChange={e => setCommitType(e.target.value)}
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500">
              {COMMIT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Scope <span className="text-gray-600">(optional)</span></label>
            <input value={scope} onChange={e => setScope(e.target.value)} placeholder="auth, api, ui..."
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600" />
          </div>
        </div>
      )}

      {/* gitignore: tech stack input */}
      {mode === "gitignore" ? (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
          <label className="block text-sm font-semibold text-white mb-2">🛠️ Tech Stack</label>
          <input value={techStack} onChange={e => setTechStack(e.target.value)}
            placeholder="e.g. Node.js, React, Python, Docker, VS Code"
            className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600" />
        </div>
      ) : (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">
              {mode === "commit"  ? "📂 Git Diff or Change Description" :
               mode === "pr"      ? "📂 Diff or Summary of Changes" :
                                    "📂 What Changed (description or diff)"}
            </span>
          </div>
          <textarea value={diff} onChange={e => setDiff(e.target.value)} rows={10}
            placeholder={mode === "commit"
              ? "Paste `git diff` output or describe what you changed...\n\nExample:\n- Added JWT authentication to /api/auth endpoint\n- Removed legacy password hashing function\n- Updated user model to include refresh token field"
              : "Paste the git diff or describe the pull request changes in detail..."}
            className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600" />
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || (mode !== "gitignore" ? !diff.trim() : !techStack.trim())}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</> : "⚡ Generate"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Result</span>
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[600px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
