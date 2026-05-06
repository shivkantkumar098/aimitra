import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const MEETING_TYPES = [
  { id: "requirements", label: "Requirements" },
  { id: "sprint",       label: "Sprint / Agile" },
  { id: "stakeholder",  label: "Stakeholder" },
  { id: "general",      label: "General" },
];

const SYSTEM_PROMPT = `You are an expert at analyzing meeting discussions and creating structured summaries. Extract the most important information, decisions, and action items. Be concise but comprehensive.`;

export default function MeetingSummarizer({ config }) {
  const [notes, setNotes]           = useState("");
  const [meetingType, setMeetingType] = useState("requirements");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Meeting Summarizer", mode: "ba_meeting", view: "ba" });

  const handle = async () => {
    if (!notes.trim()) return;
    await query(
      SYSTEM_PROMPT,
      `Summarize this ${meetingType} meeting.\n\nMeeting notes:\n${notes}\n\nFormat output as: Meeting Summary, Attendees (if mentioned), Key Decisions (numbered), Discussion Points, Action Items (table: Action | Owner | Due Date | Priority), Open Issues/Parking Lot, Next Meeting/Follow-up.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">📝 Meeting Notes</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder={`Paste your meeting notes here, e.g.:\n\nAttendees: John (PM), Sarah (Dev Lead), Mike (BA), Lisa (QA)\nDiscussed login feature requirements. John confirmed OAuth2 is mandatory. Sarah said 2 week estimate. Mike to draft acceptance criteria by Friday. Lisa raised concern about test environment access - blocking UAT. Next meeting Thursday 2pm.`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
        <label className="block text-xs text-gray-400 mb-2">Meeting Type</label>
        <div className="flex flex-wrap gap-2">
          {MEETING_TYPES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMeetingType(m.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                meetingType === m.id
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !notes.trim()}
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
          ) : "📝 Summarize Meeting"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-amber-300">📝 Meeting Summary</span>
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
