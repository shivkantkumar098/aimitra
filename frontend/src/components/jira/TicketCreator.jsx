import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";
import { fetchTicket, createTicket, fetchProjects } from "../../services/jiraService";
import TemplatePrompt from "./TemplatePrompt";
import TemplateBadge from "./TemplateBadge";

const BUILT_IN_FORMATS = {
  story: `Summary: [User story title]
Type: Story
Priority: [High/Medium/Low]
Story Points: [1/2/3/5/8]

User Story:
As a [user type], I want [goal] so that [benefit].

Acceptance Criteria:
- [ ] Given [context], when [action], then [result]
- [ ] ...

Definition of Done:
- [ ] Code reviewed
- [ ] Unit tests written
- [ ] Documentation updated`,

  bug: `Summary: [Bug title]
Type: Bug
Priority: [Critical/High/Medium/Low]
Environment: [Dev/QA/Staging/Prod]
Browser/OS: [Browser + version / OS]
Build Version: [x.x.x]

Description:
[What went wrong]

Steps to Reproduce:
1.
2.
3.

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Severity: [S1/S2/S3/S4]`,

  task: `Summary: [Task title]
Type: Task
Priority: [High/Medium/Low]
Story Points: [1/2/3/5/8]
Assignee: [Name or TBD]

Description:
[What needs to be done and why]

Sub-tasks:
- [ ]
- [ ]

Acceptance Criteria:
- [ ]

Dependencies: [Ticket IDs or None]`,

  epic: `Summary: [Epic title]
Type: Epic
Priority: [High/Medium/Low]
Target Quarter: [Q1/Q2/Q3/Q4 YYYY]

Epic Goal:
[What business outcome this epic achieves]

Scope — In:
- [Feature / capability 1]
- [Feature / capability 2]

Scope — Out:
- [What is explicitly excluded]

Success Metrics:
- [Measurable outcome 1]
- [Measurable outcome 2]

Child Stories (initial):
- [ ]
- [ ]`,
};

export default function TicketCreator({ config, template, onSaveTemplate, getHeaders, jiraDomain }) {
  const [templateConfirmed, setTemplateConfirmed] = useState(!!template);
  const [inputMode, setInputMode] = useState("template"); // "template" | "sample"
  const [ticketType, setTicketType] = useState("story");
  const [customFormat, setCustomFormat] = useState(template || "");
  const [sampleTicketId, setSampleTicketId] = useState("");
  const [sampleContent, setSampleContent] = useState("");
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState(null);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [description, setDescription] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [createError, setCreateError] = useState(null);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Ticket Creator", mode: "jira_create", view: "jira" });

  const activeFormat =
    inputMode === "template"
      ? customFormat.trim() || BUILT_IN_FORMATS[ticketType]
      : sampleContent;

  const loadSampleTicket = async () => {
    if (!sampleTicketId.trim()) return;
    setLoadingSample(true);
    setSampleError(null);
    setSampleLoaded(false);
    try {
      const ticket = await fetchTicket(sampleTicketId.trim(), getHeaders());
      const formatted = [
        `Summary: ${ticket.summary}`,
        `Type: ${ticket.issue_type || "Task"}`,
        `Priority: ${ticket.priority || "Medium"}`,
        `Status: ${ticket.status || "Open"}`,
        "",
        "Description:",
        ticket.description || "(no description)",
      ].join("\n");
      setSampleContent(formatted);
      setSampleLoaded(true);
    } catch (e) {
      setSampleError(
        e.response?.data?.detail ||
          "Could not load ticket. Check the ticket ID and JIRA connection."
      );
    } finally {
      setLoadingSample(false);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const list = await fetchProjects(getHeaders());
      setProjects(list);
      if (list.length > 0) setProjectKey(list[0].key);
    } catch {
      /* handled silently — user sees empty dropdown */
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim() || !activeFormat) return;
    const systemPrompt = `You are Rovo, Atlassian's AI assistant. Create a professional, complete JIRA ticket following the exact format below.

TICKET FORMAT:
---
${activeFormat}
---

Rules:
- Fill every field in the format — mark assumed values with [assumed]
- Acceptance criteria must be testable and specific
- Output ONLY the completed ticket — no extra explanation`;

    await query(systemPrompt, `Create a JIRA ticket for the following:\n\n${description}`);
    setCreatedTicket(null);
    setCreateError(null);
  };

  const handleCreateInJira = async () => {
    if (!result || !projectKey) return;
    setCreating(true);
    setCreateError(null);
    const lines = result.trim().split("\n");
    const summaryLine =
      lines.find((l) => l.toLowerCase().startsWith("summary:")) || lines[0];
    const summary =
      summaryLine.replace(/^summary:\s*/i, "").trim() ||
      description.slice(0, 100);
    const typeMatch = result.match(/^type:\s*(\w+)/im);
    const issueType = typeMatch ? typeMatch[1] : "Task";
    try {
      const ticket = await createTicket(
        {
          project_key: projectKey,
          issue_type: issueType,
          summary,
          description: result,
          priority: "Medium",
        },
        getHeaders()
      );
      setCreatedTicket(ticket);
    } catch (e) {
      setCreateError(e.response?.data?.detail || e.message);
    } finally {
      setCreating(false);
    }
  };

  if (!templateConfirmed) {
    return (
      <TemplatePrompt
        question="What ticket format should I use for your company?"
        defaultTemplate={BUILT_IN_FORMATS.story}
        onSave={(val) => { onSaveTemplate("ticketFormat", val); setCustomFormat(val); setTemplateConfirmed(true); }}
        onUseDefault={() => setTemplateConfirmed(true)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-gray-800/60 p-1 gap-1">
        <button
          onClick={() => { setInputMode("template"); clear(); }}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${
            inputMode === "template"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          📝 From Template
        </button>
        <button
          onClick={() => { setInputMode("sample"); clear(); }}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${
            inputMode === "sample"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          🎫 From Sample Ticket
        </button>
      </div>

      {/* Template mode */}
      {inputMode === "template" && (
        <div className="flex flex-col gap-2">
          <TemplateBadge
            label="🗂 Ticket Format"
            effectiveTemplate={activeFormat}
            customSaved={!!customFormat.trim()}
            onSave={(val) => { onSaveTemplate("ticketFormat", val); setCustomFormat(val); }}
            onReset={() => { onSaveTemplate("ticketFormat", ""); setCustomFormat(""); }}
          />
          {!customFormat.trim() && (
            <div className="flex gap-1 px-1">
              {["story", "bug", "task", "epic"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTicketType(t)}
                  className={`text-xs px-3 py-1 rounded-lg capitalize transition-colors ${
                    ticketType === t
                      ? "bg-blue-600/30 text-blue-300 border border-blue-600/40"
                      : "text-gray-400 hover:text-gray-200 bg-gray-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sample ticket mode */}
      {inputMode === "sample" && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-semibold text-white mb-3">
              🎫 Load Sample Ticket
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Enter a ticket number and Rovo will mimic its structure and style when creating new tickets.
            </p>
            <div className="flex gap-2">
              <input
                value={sampleTicketId}
                onChange={(e) => setSampleTicketId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && loadSampleTicket()}
                placeholder="e.g. PROJ-123"
                className="flex-1 bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600 font-mono"
              />
              <button
                onClick={loadSampleTicket}
                disabled={loadingSample || !sampleTicketId.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                {loadingSample ? "Loading..." : "Load"}
              </button>
            </div>
            {sampleError && (
              <p className="text-xs text-red-400 mt-2">⚠ {sampleError}</p>
            )}
            {sampleLoaded && (
              <p className="text-xs text-emerald-400 mt-2">
                ✓ Sample loaded from {sampleTicketId}
              </p>
            )}
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-400 mb-2">
              {sampleLoaded
                ? "Sample ticket content (AI will mimic this structure):"
                : "Or paste sample ticket content manually:"}
            </p>
            <textarea
              value={sampleContent}
              onChange={(e) => setSampleContent(e.target.value)}
              rows={8}
              placeholder="Paste a sample ticket here, or load one above..."
              className="w-full bg-[#0d1117] text-gray-300 text-sm font-mono rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Describe what you want */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-2">
          💬 Describe the Ticket
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe what you want the ticket to be about. e.g. 'User should be able to reset their password via email link. It should expire after 24 hours...'"
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleGenerate}
            disabled={
              isLoading ||
              !description.trim() ||
              (inputMode === "sample" && !sampleContent.trim())
            }
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating...
              </>
            ) : (
              "✨ Ask Rovo to Create"
            )}
          </button>
          {result && (
            <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300">
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Generated result */}
      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">🎫 Generated Ticket</span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-72 markdown-content text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>

          {/* Create in JIRA */}
          <div className="px-4 pb-4 border-t border-gray-700 pt-3">
            <p className="text-xs font-semibold text-white mb-2">🚀 Create in JIRA</p>
            <div className="flex gap-2 items-center flex-wrap">
              {projects.length === 0 ? (
                <button
                  onClick={loadProjects}
                  disabled={loadingProjects}
                  className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg transition-colors"
                >
                  {loadingProjects ? "Loading projects..." : "Load Projects"}
                </button>
              ) : (
                <>
                  <select
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value)}
                    className="bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
                  >
                    {projects.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.key} — {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateInJira}
                    disabled={creating || !projectKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      "🔵 Create in JIRA"
                    )}
                  </button>
                </>
              )}
            </div>
            {createdTicket && (
              <div className="mt-2 flex items-center gap-2 text-emerald-400 text-sm">
                <span>✓ Created</span>
                <a
                  href={createdTicket.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline hover:text-emerald-300"
                >
                  {createdTicket.key} ↗
                </a>
              </div>
            )}
            {createError && (
              <p className="mt-2 text-red-400 text-xs">⚠ {createError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
