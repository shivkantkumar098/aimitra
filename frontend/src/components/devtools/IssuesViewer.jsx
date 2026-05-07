import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "";

function ScreenshotThumb({ filename }) {
  const [open, setOpen] = useState(false);
  if (!filename || filename === "—") return <span className="text-xs text-gray-600">no screenshot</span>;
  const src = `${API_BASE}/api/issues/screenshot/${filename}`;
  return (
    <>
      <img
        src={src}
        alt="screenshot"
        onClick={() => setOpen(true)}
        className="h-14 rounded-lg border border-gray-700 cursor-pointer hover:border-violet-500 object-cover transition-colors"
      />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <img src={src} alt="screenshot full" className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl" />
          <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white text-2xl leading-none">✕</button>
        </div>
      )}
    </>
  );
}

export default function IssuesViewer() {
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/issues`);
      setIssues(res.data.issues || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      setError("Failed to load issues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIssues(); }, []);

  const download = () => {
    window.open(`${API_BASE}/api/issues/download`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gradient-to-r from-rose-900/30 to-orange-900/20 border border-rose-700/40 rounded-xl px-4 py-3">
        <p className="text-sm text-rose-200 font-medium mb-0.5">🐛 Reported Issues</p>
        <p className="text-xs text-gray-400">All issues submitted via the "Report an Issue" button.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={fetchIssues}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : "↻"} Refresh
        </button>
        {total > 0 && (
          <button
            onClick={download}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg transition-colors"
          >
            ⬇ Download Excel
          </button>
        )}
        {total > 0 && (
          <span className="ml-auto text-xs text-gray-500">{total} issue{total !== 1 ? "s" : ""} total</span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!loading && issues.length === 0 && !error && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl px-4 py-8 text-center">
          <p className="text-gray-500 text-sm">No issues reported yet.</p>
        </div>
      )}

      {issues.length > 0 && (
        <div className="flex flex-col gap-3">
          {issues.map((issue, i) => (
            <div key={i} className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-[#111827]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-rose-400">#{issue["#"]}</span>
                  <span className="text-xs text-gray-500">{issue["Timestamp (UTC)"]}</span>
                  {issue["Reporter Email"] && issue["Reporter Email"] !== "—" && (
                    <span className="text-xs text-violet-400">{issue["Reporter Email"]}</span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 flex gap-4">
                <div className="flex-1 min-w-0">
                  {issue["Page / Context"] && issue["Page / Context"] !== "—" && (
                    <p className="text-xs text-gray-600 mb-2 truncate">📍 {issue["Page / Context"]}</p>
                  )}
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{issue["Description"]}</p>
                </div>
                <div className="flex-shrink-0">
                  <ScreenshotThumb filename={issue["Screenshot File"]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
