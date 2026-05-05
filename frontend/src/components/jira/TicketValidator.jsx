import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";
import TicketLoader from "./TicketLoader";
import { postComment } from "../../services/jiraService";
import { DEFAULT_VALIDATOR_FORMAT } from "../../hooks/useJiraTemplates";
import TemplatePrompt from "./TemplatePrompt";
import TemplateBadge from "./TemplateBadge";

const CHECK_OPTIONS = [
  { id: "bva",          label: "Boundary Value Analysis", icon: "📐", desc: "Identify boundary conditions & edge cases" },
  { id: "ac",           label: "Acceptance Criteria",     icon: "✅", desc: "Check ACs are complete, testable, unambiguous" },
  { id: "missing",      label: "Missing Information",     icon: "❓", desc: "Flag vague or missing requirements" },
  { id: "negative",     label: "Negative Test Cases",     icon: "❌", desc: "Scenarios not covered" },
  { id: "data",         label: "Test Data Requirements",  icon: "🗄️", desc: "What test data is needed" },
  { id: "dependencies", label: "Dependencies & Risks",    icon: "🔗", desc: "Upstream/downstream risks" },
];

export default function TicketValidator({ config, template, onSaveTemplate, getHeaders }) {
  const effectiveFormat = template || DEFAULT_VALIDATOR_FORMAT;
  const [templateConfirmed, setTemplateConfirmed] = useState(!!template);
  const [ticketContent, setTicketContent] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [selectedChecks, setSelectedChecks] = useState(["bva", "ac", "missing", "negative"]);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);
  const [postError, setPostError] = useState(null);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Ticket Validator", mode: "jira_validate", view: "jira" });

  const toggleCheck = (id) =>
    setSelectedChecks((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const handleTicketLoaded = (ticket) => {
    setTicketId(ticket.key);
    const content = [
      `Summary: ${ticket.summary}`,
      `Type: ${ticket.issueType}  |  Status: ${ticket.status}  |  Priority: ${ticket.priority}`,
      ticket.description ? `\nDescription:\n${ticket.description}` : "",
    ].filter(Boolean).join("\n");
    setTicketContent(content);
  };

  const handleResetFormat = () => onSaveTemplate("validatorFormat", "");

  const handleValidate = async () => {
    if (!ticketContent.trim()) return;
    const selectedLabels = CHECK_OPTIONS
      .filter((c) => selectedChecks.includes(c.id))
      .map((c) => `- ${c.label}: ${c.desc}`).join("\n");

    const systemPrompt = `You are a senior QA engineer. Validate this JIRA ticket and produce a structured report.

Focus on:
${selectedLabels}

Structure your response following this exact format:
${effectiveFormat.replace("[TICKET-ID]", ticketId || "[TICKET-ID]")}`;

    await query(systemPrompt, `Validate this ticket${ticketId ? ` (${ticketId})` : ""}:\n\n${ticketContent}`);
    setPostResult(null);
  };

  const handlePostComment = async () => {
    if (!result || !ticketId) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await postComment(ticketId, result, getHeaders());
      setPostResult(res);
    } catch (e) {
      setPostError(e.response?.data?.detail || e.message);
    } finally {
      setPosting(false);
    }
  };

  if (!templateConfirmed) {
    return (
      <TemplatePrompt
        question="What format should I use for the ticket validation report?"
        defaultTemplate={DEFAULT_VALIDATOR_FORMAT}
        onSave={(val) => { onSaveTemplate("validatorFormat", val); setTemplateConfirmed(true); }}
        onUseDefault={() => setTemplateConfirmed(true)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <TemplateBadge
        label="📐 Report Format"
        effectiveTemplate={effectiveFormat}
        customSaved={!!template}
        onSave={(val) => onSaveTemplate("validatorFormat", val)}
        onReset={handleResetFormat}
      />

      {/* Load from JIRA */}
      <div className="bg-[#1a1f2e] border border-blue-700/30 rounded-xl p-4">
        <label className="block text-xs font-semibold text-blue-300 mb-2">📥 Load Ticket from JIRA</label>
        <TicketLoader getHeaders={getHeaders} onTicketLoaded={handleTicketLoaded} />
      </div>

      {/* Manual input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-2">🎫 Ticket Content</label>
        <textarea value={ticketContent} onChange={(e) => setTicketContent(e.target.value)} rows={6}
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
          placeholder="Ticket auto-fills from JIRA, or paste manually here..." />
      </div>

      {/* Checks */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-3">🔍 Validation Checks</label>
        <div className="grid grid-cols-2 gap-2">
          {CHECK_OPTIONS.map((check) => (
            <button key={check.id} onClick={() => toggleCheck(check.id)}
              className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                selectedChecks.includes(check.id)
                  ? "bg-violet-600/20 border-violet-600/40 text-violet-300"
                  : "bg-[#0d1117] border-gray-700 text-gray-400 hover:border-gray-600"
              }`}>
              <span className="text-base mt-0.5">{check.icon}</span>
              <div>
                <div className="text-xs font-medium">{check.label}</div>
                <div className="text-xs opacity-60 mt-0.5 leading-tight">{check.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleValidate} disabled={isLoading || !ticketContent.trim()}
        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
        {isLoading
          ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Validating...</>
          : "✅ Validate Ticket"}
      </button>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📊 Validation Report{ticketId && <span className="text-violet-400 ml-1">— {ticketId}</span>}</span>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
              <button onClick={clear} className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg">Clear</button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto max-h-80 markdown-content text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
          {ticketId && (
            <div className="px-4 pb-4 border-t border-gray-700 pt-3">
              <div className="flex items-center gap-3">
                <button onClick={handlePostComment} disabled={posting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                  {posting
                    ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Posting...</>
                    : `💬 Post as Comment on ${ticketId}`}
                </button>
                {postResult && <span className="text-emerald-400 text-sm">✓ Comment posted!</span>}
              </div>
              {postError && <p className="mt-1 text-red-400 text-xs">⚠ {postError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
