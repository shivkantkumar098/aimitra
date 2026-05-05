import { useState } from "react";

/**
 * TemplatePrompt — shown at the top of each JIRA tool when no custom template
 * is saved yet. Asks the user for their format before generation starts.
 *
 * Props:
 *   question        — headline question shown to the user
 *   defaultTemplate — pre-fills the textarea so users can see what default looks like
 *   onSave(value)   — user saved a custom template
 *   onUseDefault()  — user chose to proceed with the built-in default
 */
export default function TemplatePrompt({ question, defaultTemplate, onSave, onUseDefault }) {
  const [value, setValue] = useState(defaultTemplate);

  return (
    <div className="bg-[#1a1f2e] border border-violet-600/40 rounded-xl overflow-hidden">
      {/* AI header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-violet-600/30 bg-violet-900/10">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{question}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Edit the template below to match your company's format and save it — or click{" "}
            <span className="text-gray-300 font-medium">Use Default</span> to proceed with the built-in template.
          </p>
        </div>
      </div>

      {/* Editable template */}
      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          className="w-full bg-[#0d1117] text-gray-300 text-sm font-mono rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none"
        />
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => { if (value.trim()) onSave(value.trim()); }}
            disabled={!value.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            💾 Save as My Template
          </button>
          <button
            onClick={onUseDefault}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Use Default →
          </button>
        </div>
      </div>
    </div>
  );
}
