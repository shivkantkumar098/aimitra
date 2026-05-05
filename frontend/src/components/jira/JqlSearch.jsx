import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import { searchIssues } from "../../services/jiraService";

const EXAMPLES = [
  "Open bugs assigned to me in the current sprint",
  "All high priority unresolved issues in project QA",
  "Issues created in the last 7 days by my team",
  "Tickets updated today with status In Progress",
  "All stories without acceptance criteria in epic QA-45",
];

export default function JqlSearch({ config, getHeaders }) {
  const [naturalQuery, setNaturalQuery] = useState("");
  const [jqlResult, setJqlResult] = useState("");
  const [runningJql, setRunningJql] = useState("");
  const [jqlIssues, setJqlIssues] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [searching, setSearching] = useState(false);
  const { result, isLoading, error, query, clear } = useAiQuery(config);

  const SYSTEM = `You are a Jira Query Language (JQL) expert. Convert natural language requests into precise, optimized JQL queries.

Always respond in this exact format:
**JQL Query:**
\`\`\`jql
<the JQL query here>
\`\`\`

**Explanation:**
<brief explanation of each clause>

**Alternatives (if applicable):**
<1-2 alternative queries>`;

  const handleGenerate = async () => {
    if (!naturalQuery.trim()) return;
    setJqlResult("");
    setJqlIssues(null);
    setSearchError(null);
    await query(SYSTEM, naturalQuery);
  };

  // Extract the raw JQL from the AI result for running
  const extractJql = (text) => {
    const match = text.match(/```(?:jql)?\s*\n?([\s\S]*?)```/);
    return match ? match[1].trim() : text.split("\n")[0].replace(/^\*\*JQL Query:\*\*\s*/i, "").trim();
  };

  const handleRunJql = async () => {
    const jql = extractJql(result);
    if (!jql) return;
    setRunningJql(jql);
    setSearching(true);
    setSearchError(null);
    setJqlIssues(null);
    try {
      const issues = await searchIssues(jql, getHeaders(), 15);
      setJqlIssues(issues);
    } catch (e) {
      setSearchError(e.response?.data?.detail || "Failed to run JQL. Check your JIRA connection.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-1">
          🔍 Describe what you want to find
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Write in plain English — Rovo will generate the JQL for you.
        </p>
        <textarea
          value={naturalQuery}
          onChange={(e) => setNaturalQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
          }}
          rows={3}
          placeholder="e.g. Show me all open bugs assigned to me that are high priority in the current sprint"
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !naturalQuery.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating JQL...
              </>
            ) : (
              "⚡ Generate JQL"
            )}
          </button>
          <span className="text-xs text-gray-600">or Ctrl+Enter</span>
          {result && (
            <button onClick={() => { clear(); setJqlIssues(null); }} className="text-xs text-gray-500 hover:text-gray-300 ml-auto">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick examples */}
      {!result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Quick Examples
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setNaturalQuery(ex)}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors text-left"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* JQL result */}
      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Generated JQL</span>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(extractJql(result))}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Copy JQL
              </button>
              <button
                onClick={handleRunJql}
                disabled={searching}
                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {searching ? "Running..." : "▶ Run in JIRA"}
              </button>
            </div>
          </div>
          <div className="p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
            {result}
          </div>
        </div>
      )}

      {searchError && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
          ⚠ {searchError}
        </div>
      )}

      {/* JQL run results */}
      {jqlIssues !== null && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              🔵 Results ({jqlIssues.length})
            </span>
            <span className="text-xs text-gray-500 font-mono">{runningJql}</span>
          </div>
          {jqlIssues.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">No issues found.</p>
          ) : (
            <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
              {jqlIssues.map((issue) => (
                <div key={issue.key} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-800/40 transition-colors">
                  <span className="text-xs font-mono text-blue-400 mt-0.5 whitespace-nowrap flex-shrink-0">
                    {issue.key}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{issue.summary}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {issue.status && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                          {issue.status}
                        </span>
                      )}
                      {issue.priority && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                          {issue.priority}
                        </span>
                      )}
                      {issue.assignee && (
                        <span className="text-xs text-gray-500">{issue.assignee}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
