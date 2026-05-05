import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const DIALECTS = ["PostgreSQL","MySQL","SQLite","Microsoft SQL Server","Oracle","BigQuery","Snowflake","Redshift","MongoDB (aggregation)"];
const MODES = [
  { id: "generate", label: "✍️ Generate SQL" },
  { id: "optimize", label: "⚡ Optimize Query" },
  { id: "explain",  label: "🔍 Explain Query" },
  { id: "schema",   label: "🗄️ Design Schema" },
];

export default function SqlHelper({ config }) {
  const [mode, setMode] = useState("generate");
  const [input, setInput] = useState("");
  const [schema, setSchema] = useState("");
  const [dialect, setDialect] = useState("PostgreSQL");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "SQL Helper", mode: "sql", view: "devtools" });

  const placeholders = {
    generate: "e.g. Get the top 10 customers by total order value in the last 30 days, including their email and number of orders",
    optimize: "Paste the slow SQL query here...",
    explain:  "Paste the SQL query you want explained...",
    schema:   "e.g. Design a schema for a multi-tenant SaaS app with users, organizations, subscriptions, and audit logs",
  };

  const handle = async () => {
    if (!input.trim()) return;
    const schemaPart = schema.trim() ? `\n\nDatabase schema context:\n\`\`\`sql\n${schema}\n\`\`\`` : "";
    const prompts = {
      generate: `Generate a ${dialect} SQL query for: ${input}${schemaPart}\n\nProvide:\n1. **SQL Query** in a code block\n2. **Explanation** of each clause\n3. **Indexes** to add for performance\n4. **Alternative approaches** if applicable`,
      optimize: `Optimize this ${dialect} SQL query:${schemaPart}\n\n\`\`\`sql\n${input}\n\`\`\`\n\nProvide:\n1. **Issues Found** — what's slow and why\n2. **Optimized Query** in a code block\n3. **Optimizations Explained** — what changed and why\n4. **Indexes to Add** for best performance`,
      explain:  `Explain this ${dialect} SQL query in detail:${schemaPart}\n\n\`\`\`sql\n${input}\n\`\`\`\n\nProvide:\n1. **What it does** — plain English summary\n2. **Clause by clause** breakdown\n3. **Performance characteristics** — complexity, potential bottlenecks\n4. **What could go wrong** — edge cases, NULLs, empty sets`,
      schema:   `Design a ${dialect} database schema for: ${input}\n\nProvide:\n1. **CREATE TABLE statements** with appropriate data types, constraints, and indexes\n2. **Relationships** — foreign keys and cardinality\n3. **Design decisions** explained\n4. **Sample queries** for common operations`,
    };
    await query(
      `You are a database expert specializing in ${dialect}. Write production-quality SQL with proper indexing, constraints, and explanations. Always use best practices for the specific dialect.`,
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

      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-white">
            {mode === "generate" ? "💬 Describe Your Query" :
             mode === "optimize" ? "🐌 Slow Query" :
             mode === "explain"  ? "❓ Query to Explain" :
                                   "🏗️ Schema Requirements"}
          </label>
          <select value={dialect} onChange={e => setDialect(e.target.value)}
            className="bg-[#0d1117] text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-violet-500">
            {DIALECTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={mode === "generate" ? 4 : 8}
          placeholder={placeholders[mode]}
          className={`w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600 ${
            (mode === "optimize" || mode === "explain") ? "font-mono" : ""
          }`} />

        {(mode === "generate" || mode === "schema") && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Schema Context <span className="font-normal text-gray-600">(optional — paste relevant CREATE TABLE statements)</span>
            </label>
            <textarea value={schema} onChange={e => setSchema(e.target.value)} rows={4}
              placeholder={"CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE...)"}
              className="w-full bg-[#0d1117] text-gray-300 text-xs font-mono rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600" />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handle} disabled={isLoading || !input.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2">
          {isLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Processing...</> : "🗄️ Run SQL Helper"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📋 Result</span>
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
