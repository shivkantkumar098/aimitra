import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import TicketLoader from "./TicketLoader";
import { postComment } from "../../services/jiraService";
import { DEFAULT_COMMENT_FORMAT } from "../../hooks/useJiraTemplates";
import TemplatePrompt from "./TemplatePrompt";
import TemplateBadge from "./TemplateBadge";

const STATUSES = ["Pass ✅", "Fail ❌", "Partial Pass ⚠️", "Blocked 🚫", "In Progress 🔄"];

export default function CommentGenerator({ config, template, onSaveTemplate, getHeaders }) {
  const effectiveTemplate = template || DEFAULT_COMMENT_FORMAT;
  const [templateConfirmed, setTemplateConfirmed] = useState(!!template);
  const [ticketId, setTicketId] = useState("");
  const [validationNotes, setValidationNotes] = useState("");
  const [status, setStatus] = useState("Pass ✅");
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);
  const [postError, setPostError] = useState(null);
  const { result, isLoading, error, query, clear } = useAiQuery(config);

  const handleTicketLoaded = (ticket) => setTicketId(ticket.key);

  const handleResetTemplate = () => onSaveTemplate("commentFormat", "");

  const handleGenerate = async () => {
    if (!validationNotes.trim()) return;
    const systemPrompt = `You are a QA engineer writing a professional JIRA comment. Use EXACTLY this format:

--- COMMENT FORMAT ---
${effectiveTemplate}
--- END FORMAT ---

Rules: Follow structure exactly. Use plain text (not markdown). Today: ${new Date().toLocaleDateString("en-GB")}.`;

    await query(systemPrompt, `Ticket: ${ticketId || "N/A"}\nStatus: ${status}\nMy notes: ${validationNotes}`);
    setPostResult(null);
  };

  const handlePost = async () => {
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
        question="What comment format should I use for your JIRA validations?"
        defaultTemplate={DEFAULT_COMMENT_FORMAT}
        onSave={(val) => { onSaveTemplate("commentFormat", val); setTemplateConfirmed(true); }}
        onUseDefault={() => setTemplateConfirmed(true)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <TemplateBadge
        label="🏢 Comment Format"
        effectiveTemplate={effectiveTemplate}
        customSaved={!!template}
        onSave={(val) => onSaveTemplate("commentFormat", val)}
        onReset={handleResetTemplate}
      />

      {/* Load ticket */}
      <div className="bg-[#1a1f2e] border border-blue-700/30 rounded-xl p-4">
        <label className="block text-xs font-semibold text-blue-300 mb-2">📥 Load Ticket from JIRA (optional)</label>
        <TicketLoader getHeaders={getHeaders} onTicketLoaded={handleTicketLoaded} label="Load Ticket" />
      </div>

      {/* Input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ticket ID</label>
            <input value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="QA-123"
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <label className="block text-sm font-semibold text-white mb-2">💬 Your Validation Notes</label>
        <textarea
          value={validationNotes}
          onChange={(e) => setValidationNotes(e.target.value)}
          rows={4}
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
          placeholder="e.g. Tested login on Chrome/Safari, all ACs passed. Found issue with special chars - raised BUG-789. Build 2.3.1 on QA env."
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !validationNotes.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</>
              : "✨ Generate Comment"}
          </button>
          {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Comment{ticketId && <span className="text-violet-400 ml-1">— {ticketId}</span>}</span>
            <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
          </div>
          <pre className="p-4 text-sm text-gray-200 whitespace-pre-wrap font-sans overflow-y-auto max-h-56">{result}</pre>
          {ticketId && (
            <div className="px-4 pb-4 border-t border-gray-700 pt-3">
              <div className="flex items-center gap-3">
                <button onClick={handlePost} disabled={posting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg flex items-center gap-2">
                  {posting
                    ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Posting...</>
                    : `🔵 Post to ${ticketId}`}
                </button>
                {postResult && <span className="text-emerald-400 text-sm">✓ Posted to JIRA!</span>}
              </div>
              {postError && <p className="mt-1 text-red-400 text-xs">⚠ {postError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
