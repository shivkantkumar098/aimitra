import { useState } from "react";

/**
 * TemplateBadge — compact header bar shown at the top of each JIRA tool
 * after the user has confirmed their template choice.
 *
 * States:
 *   collapsed — shows label + badge + View / Edit buttons
 *   view      — expands to show the template text (read-only)
 *   edit      — expands to show editable textarea + Save button
 */
export default function TemplateBadge({ label, effectiveTemplate, customSaved, onSave, onReset }) {
  const [mode, setMode] = useState("collapsed");
  const [draft, setDraft] = useState(effectiveTemplate);

  const openEdit = () => { setDraft(effectiveTemplate); setMode("edit"); };

  return (
    <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
      {/* Header row — always visible */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          {customSaved
            ? <span className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2 py-0.5 rounded-full">✓ Custom</span>
            : <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded-full">Default</span>
          }
        </div>

        <div className="flex items-center gap-2">
          {/* Reset — only when custom is saved and not editing */}
          {customSaved && mode === "collapsed" && (
            <button
              onClick={onReset}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Reset
            </button>
          )}

          {mode === "collapsed" && (
            <>
              <button
                onClick={() => setMode("view")}
                className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
              >
                View
              </button>
              <button
                onClick={openEdit}
                className="text-xs px-2.5 py-1 bg-violet-900/30 hover:bg-violet-900/50 text-violet-400 hover:text-violet-300 border border-violet-700/30 rounded-lg transition-colors"
              >
                Edit
              </button>
            </>
          )}

          {mode !== "collapsed" && (
            <button
              onClick={() => setMode("collapsed")}
              className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* View mode */}
      {mode === "view" && (
        <pre className="px-4 pb-4 pt-1 text-xs text-gray-400 font-mono whitespace-pre-wrap border-t border-gray-700/50 max-h-52 overflow-y-auto">
          {effectiveTemplate}
        </pre>
      )}

      {/* Edit mode */}
      {mode === "edit" && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 mb-2">Edit the template — AI always follows this structure.</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={9}
            className="w-full bg-[#0d1117] text-gray-300 text-sm font-mono rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { if (draft.trim()) { onSave(draft.trim()); setMode("collapsed"); } }}
              disabled={!draft.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setMode("collapsed")}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-400 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
