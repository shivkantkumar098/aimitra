import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";
import { createTicket, fetchProjects } from "../../services/jiraService";

const PLACEHOLDER_FORMAT = `Summary: [Brief description of the bug]
Environment: [Dev/QA/Staging/Prod]
Browser/OS:
Build Version:

Steps to Reproduce:
1.
2.
3.

Expected Result:

Actual Result:

Severity: [Critical/High/Medium/Low]
Priority: [P1/P2/P3/P4]
Attachments: [Screenshots/Logs]`;

export default function BugCreator({ config, template, onSaveTemplate, getHeaders, jiraDomain }) {
  const [bugDescription, setBugDescription] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(!template);
  const [draftTemplate, setDraftTemplate] = useState(template || PLACEHOLDER_FORMAT);
  const [projectKey, setProjectKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [createError, setCreateError] = useState(null);
  const { result, isLoading, error, query, clear } = useAiQuery(config);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const list = await fetchProjects(getHeaders());
      setProjects(list);
      if (list.length > 0) setProjectKey(list[0].key);
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!draftTemplate.trim()) return;
    onSaveTemplate("bugFormat", draftTemplate.trim());
    setEditingTemplate(false);
  };

  const handleGenerate = async () => {
    if (!bugDescription.trim()) return;
    const systemPrompt = `You are a senior QA engineer. Create a detailed JIRA bug ticket using EXACTLY this format:

--- COMPANY BUG FORMAT ---
${template}
--- END FORMAT ---

Rules: Follow field names exactly. Mark assumed info with [assumed]. Output ONLY the filled ticket, no extra text.`;
    await query(systemPrompt, `Create a JIRA bug ticket for:\n\n${bugDescription}`);
    setCreatedTicket(null);
  };

  const handleCreateInJira = async () => {
    if (!result || !projectKey) return;
    setCreating(true);
    setCreateError(null);

    // Extract summary from first line of result
    const lines = result.trim().split("\n");
    const summaryLine = lines.find(l => l.toLowerCase().includes("summary:")) || lines[0];
    const summary = summaryLine.replace(/^summary:\s*/i, "").trim() || bugDescription.slice(0, 100);

    try {
      const ticket = await createTicket(
        { project_key: projectKey, issue_type: "Bug", summary, description: result, priority: "Medium" },
        getHeaders()
      );
      setCreatedTicket(ticket);
    } catch (e) {
      setCreateError(e.response?.data?.detail || e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Template */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">🏢 Company Bug Format</span>
            {template && !editingTemplate && <span className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2 py-0.5 rounded-full">✓ Saved</span>}
          </div>
          <button onClick={() => setEditingTemplate(!editingTemplate)} className="text-xs text-violet-400 hover:text-violet-300">
            {editingTemplate ? "Cancel" : "Edit"}
          </button>
        </div>
        {editingTemplate ? (
          <div className="p-4">
            <p className="text-xs text-gray-400 mb-2">Paste your company's exact bug format. AI always uses this structure.</p>
            <textarea value={draftTemplate} onChange={(e) => setDraftTemplate(e.target.value)} rows={9}
              className="w-full bg-[#0d1117] text-gray-300 text-sm font-mono rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none" />
            <button onClick={handleSaveTemplate} disabled={!draftTemplate.trim()}
              className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors">
              Save Format
            </button>
          </div>
        ) : template ? (
          <pre className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-28 overflow-y-auto">{template}</pre>
        ) : (
          <div className="px-4 py-3 text-sm text-amber-400">⚠ No template saved. Click "Edit" to add your format.</div>
        )}
      </div>

      {/* Bug Description */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-2">🐛 Describe the Bug</label>
        <textarea value={bugDescription} onChange={(e) => setBugDescription(e.target.value)} rows={5}
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
          placeholder="Describe the bug. e.g. 'Login button doesn't respond on Chrome when password has special characters...'" />
        <div className="flex items-center gap-3 mt-3">
          <button onClick={handleGenerate} disabled={isLoading || !bugDescription.trim() || !template}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
            {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</> : "✨ Generate Bug Ticket"}
          </button>
          {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Generated Bug Ticket</span>
            <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
          </div>
          <div className="p-4 overflow-y-auto max-h-64 markdown-content text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>

          {/* Create in JIRA */}
          <div className="px-4 pb-4 border-t border-gray-700 pt-3">
            <p className="text-xs font-semibold text-white mb-2">🚀 Create in JIRA</p>
            <div className="flex gap-2 items-center">
              {projects.length === 0 ? (
                <button onClick={loadProjects} disabled={loadingProjects}
                  className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg transition-colors">
                  {loadingProjects ? "Loading projects..." : "Load Projects"}
                </button>
              ) : (
                <>
                  <select value={projectKey} onChange={(e) => setProjectKey(e.target.value)}
                    className="bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500">
                    {projects.map((p) => <option key={p.key} value={p.key}>{p.key} — {p.name}</option>)}
                  </select>
                  <button onClick={handleCreateInJira} disabled={creating || !projectKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                    {creating ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Creating...</> : "🔵 Create in JIRA"}
                  </button>
                </>
              )}
            </div>
            {createdTicket && (
              <div className="mt-2 flex items-center gap-2 text-emerald-400 text-sm">
                <span>✓ Created</span>
                <a href={createdTicket.url} target="_blank" rel="noreferrer"
                  className="font-semibold underline hover:text-emerald-300">{createdTicket.key} ↗</a>
              </div>
            )}
            {createError && <p className="mt-2 text-red-400 text-xs">⚠ {createError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
