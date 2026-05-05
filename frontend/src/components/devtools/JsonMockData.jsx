import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const MODES = [
  { id: "mock",   label: "🎲 Generate Mock Data" },
  { id: "schema", label: "📐 JSON Schema" },
  { id: "api",    label: "🔌 API Response" },
  { id: "format", label: "🔧 Format / Validate" },
];

const QUICK_MOCKS = [
  "10 users with name, email, avatar, role",
  "5 products with id, name, price, category, stock",
  "20 blog posts with title, author, date, tags, excerpt",
  "8 transactions with id, amount, currency, status, timestamp",
  "15 employees with department, salary, skills, manager",
];

export default function JsonMockData({ config }) {
  const [mode, setMode] = useState("mock");
  const [input, setInput] = useState("");
  const [count, setCount] = useState(5);
  const [locale, setLocale] = useState("en-US");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "JSON & Mock Data", mode: "json", view: "devtools" });

  const handle = async (desc) => {
    const d = desc || input;
    if (!d.trim()) return;
    const prompts = {
      mock:   `Generate ${count} realistic mock data records for: ${d}\n\nLocale: ${locale}\n\nRequirements:\n- Use realistic values (real-looking names, valid email formats, plausible dates)\n- Consistent data types across records\n- Include variety (don't repeat the same values)\n- Output ONLY a valid JSON array, no explanation before the JSON\n- After the JSON, add a brief schema summary`,
      schema: `Generate a JSON Schema (draft-07) for: ${d}\n\nInclude:\n1. **JSON Schema** in a code block\n2. **Example valid document** matching the schema\n3. **Key constraints** explained`,
      api:    `Design a REST API response structure for: ${d}\n\nProvide:\n1. **Success response** (200) with realistic data\n2. **Paginated list response** (if applicable)\n3. **Error response** examples (400, 401, 404, 500)\n4. **Response headers** recommendations`,
      format: `Format, validate and analyze this JSON:\n\n${d}\n\nProvide:\n1. **Formatted JSON** (pretty-printed)\n2. **Validation** — is it valid JSON? Any issues?\n3. **Schema inference** — what data structure is this?\n4. **Suggestions** — improvements or potential issues`,
    };
    await query(
      `You are a data engineer and API design expert. Generate accurate, realistic JSON data and schemas. For mock data, use Faker-like realistic values.`,
      prompts[mode]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode */}
      <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); clear(); }}
            className={`flex-1 py-2 text-xs rounded-lg font-medium transition-all ${
              mode === m.id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Quick picks for mock mode */}
      {mode === "mock" && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Generate</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_MOCKS.map(q => (
              <button key={q} onClick={() => { setInput(q); handle(q); }}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-white">
            {mode === "mock"   ? "📝 Describe Your Data"  :
             mode === "schema" ? "📝 Describe Your Schema" :
             mode === "api"    ? "📝 Describe Your API"    :
                                 "📋 Paste JSON to Format"}
          </label>
          {mode === "mock" && (
            <div className="flex items-center gap-2">
              <select value={locale} onChange={e => setLocale(e.target.value)}
                className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none">
                {["en-US","en-GB","de-DE","fr-FR","ja-JP","zh-CN","es-ES"].map(l => <option key={l}>{l}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-400">Count:</label>
                <input type="number" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))}
                  className="w-14 bg-[#0d1117] text-gray-200 text-xs text-center rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500" />
              </div>
            </div>
          )}
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          rows={mode === "format" ? 10 : 4}
          placeholder={
            mode === "mock"   ? "e.g. E-commerce orders with product details, customer info, shipping address, and payment status" :
            mode === "schema" ? "e.g. A blog post with title, author, publication date, tags array, and nested sections" :
            mode === "api"    ? "e.g. GET /api/users/{id} — returns a user profile with their recent activity and preferences" :
                                "Paste JSON here to format, validate, or analyze..."
          }
          className={`w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600 ${mode === "format" ? "font-mono" : ""}`} />
      </div>

      <div className="flex gap-3">
        <button onClick={() => handle()} disabled={isLoading || !input.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Generating...</> : "⚡ Generate"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Output</span>
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[600px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
