/**
 * TicketLoader — reusable component to fetch a JIRA ticket by ID.
 * Used by multiple JIRA tools to load real ticket data.
 * Shows a compact inline field + button that returns ticket data to parent.
 */

import { useState } from "react";
import { fetchTicket } from "../../services/jiraService";

export default function TicketLoader({ getHeaders, onTicketLoaded, label = "Load from JIRA" }) {
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);

  const handleLoad = async () => {
    if (!ticketId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ticket = await fetchTicket(ticketId.trim(), getHeaders());
      setLoadedKey(ticket.key);
      onTicketLoaded(ticket);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <input
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          placeholder="e.g. QA-123, PROJ-456"
          className="flex-1 bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600"
        />
        <button
          onClick={handleLoad}
          disabled={loading || !ticketId.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          {loading ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : "📥"} {label}
        </button>
      </div>
      {loadedKey && !error && (
        <p className="text-xs text-emerald-400">✓ Loaded {loadedKey}</p>
      )}
      {error && <p className="text-xs text-red-400">⚠ {error}</p>}
    </div>
  );
}
