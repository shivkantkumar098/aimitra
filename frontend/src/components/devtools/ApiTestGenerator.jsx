import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const OUTPUT_FORMATS = [
  { id: "pytest",    label: "pytest + requests",    desc: "Python test suite" },
  { id: "postman",   label: "Postman Collection",   desc: "JSON v2.1 collection" },
  { id: "rest-assured", label: "REST-Assured",      desc: "Java test suite" },
  { id: "k6",        label: "k6 Load Test",         desc: "JavaScript load test" },
  { id: "playwright",label: "Playwright API",       desc: "TypeScript API tests" },
];

const AUTH_TYPES = ["None", "Bearer Token", "API Key Header", "Basic Auth", "OAuth2"];

const SYSTEM_PROMPT = `You are a senior API test automation engineer. You write thorough, production-ready API test suites that cover:
- Success scenarios (2xx responses with correct payload validation)
- Client error scenarios (4xx — invalid input, missing fields, unauthorized, not found)
- Server error handling
- Edge cases (empty values, max length, special characters, boundary values)
- Authentication and authorization checks
- Response schema validation
- Response time assertions

Generate complete, runnable code with proper imports, configuration, and test data.`;

export default function ApiTestGenerator({ config }) {
  const [spec, setSpec] = useState("");
  const [outputFormat, setOutputFormat] = useState("pytest");
  const [authType, setAuthType] = useState("Bearer Token");
  const [baseUrl, setBaseUrl] = useState("");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "API Test Generator", mode: "api_test", view: "devtools" });

  const handle = async () => {
    if (!spec.trim()) return;
    const fmt = OUTPUT_FORMATS.find((f) => f.id === outputFormat);
    await query(
      SYSTEM_PROMPT,
      `Generate a complete API test suite for the following specification:

\`\`\`
${spec}
\`\`\`

Output Format: ${fmt?.label} (${fmt?.desc})
Authentication: ${authType}
${baseUrl ? `Base URL: ${baseUrl}` : ""}

Include:
1. Complete test file with all imports and configuration
2. Test cases for every endpoint/operation in the spec
3. Positive tests (valid requests → expected 2xx responses)
4. Negative tests (invalid input, missing required fields, wrong auth)
5. Schema/response body assertions
6. Reusable fixtures or setup functions
7. Comments explaining each test group`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📋 API Specification</span>
          <span className="text-xs text-gray-500">OpenAPI / Swagger YAML or JSON, or plain endpoint descriptions</span>
        </div>
        <textarea
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          rows={10}
          placeholder={`Paste OpenAPI/Swagger spec, or describe endpoints, e.g.:\n\nPOST /api/users\nBody: { name: string, email: string, role: "admin"|"user" }\nReturns: 201 { id, name, email } or 400 { error }\n\nGET /api/users/{id}\nReturns: 200 user object or 404\n\nDELETE /api/users/{id}\nRequires: Admin role\nReturns: 204 or 403`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Output Format</label>
          <div className="flex flex-col gap-1.5">
            {OUTPUT_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setOutputFormat(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  outputFormat === f.id
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className="font-medium">{f.label}</span>
                <span className="ml-1 opacity-60">— {f.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Authentication</label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
              className="w-full bg-[#0d1117] text-gray-300 text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500"
            >
              {AUTH_TYPES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Base URL (optional)</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full bg-[#0d1117] text-gray-300 text-xs rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !spec.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating...
            </>
          ) : "🔌 Generate Tests"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="🔌 API Tests" titleColor="text-white" toolName="api-test-generator" onClear={clear} maxHeight="600px" />
    </div>
  );
}
