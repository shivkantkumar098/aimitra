import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const EXAMPLES = [
  "I have a UI screenshot and want to write automated tests",
  "I need to write test cases for a login form",
  "I want to check if my HTML is accessible",
  "I have a Swagger spec and need API tests",
  "I need to create a Jira bug ticket for a crash I found",
  "I want to understand what a piece of code does",
  "I need to write tests in BDD style for a user story",
  "I'm getting a 500 error in my Python script",
];

const SYSTEM_PROMPT = `You are a helpful assistant inside AiMitra, an AI-powered QA and development tool.
Your job is to guide users to the right tool for their task. Here is the complete list of available tools:

## 💬 CHAT (AI Chat tab)
- **Text / Code Generation** — Write code, explain concepts, generate SQL, answer general questions
- **DOM Locator Generator** — Generate XPath and CSS selectors for web elements
- **Test Case Generator** — Generate Selenium / Playwright test cases from a description
- **Test Plan Generator** — Create comprehensive QA test plans for a feature or product
- **Code Debugging** — Analyze and fix bugs by pasting code into chat
- **Web Search** — Research technical topics and get up-to-date documentation

## ⚡ MORE TOOLS tab

### Code Tools
- **Code Explainer** — Paste code to get a plain-English explanation of what it does
- **Code Review** — Get a thorough review for bugs, security, performance, style
- **Debug & Fix** — Paste broken code + error message to get a fixed version
- **Code Converter** — Convert code between languages (Python ↔ JS ↔ Java etc.)
- **Regex Builder** — Describe a pattern in plain English, get a working regex
- **SQL Helper** — Write, optimize, or explain SQL queries
- **Git Assistant** — Generate commit messages, PR descriptions, git commands
- **DevOps Generator** — Create Dockerfiles, CI/CD pipelines, Kubernetes configs
- **JSON & Mock Data** — Generate realistic fake/mock data in JSON format

### QA Tools
- **Screenshot → Tests** — Upload a UI screenshot → get locators + automated test code (needs Gemini/Claude/GPT-4o)
- **BDD Generator** — Turn a user story into a Gherkin .feature file (Cucumber, Behave, SpecFlow, Pytest-BDD)
- **API Test Generator** — Paste an OpenAPI spec → get pytest, Postman, REST-Assured, or k6 tests
- **A11y Checker** — Paste HTML → get WCAG accessibility violations with fixes

## 🔵 JIRA tab (requires Jira connection)
- **Ask Rovo** — Ask questions about your Jira project using AI
- **Ticket Creator** — Create a well-structured Jira ticket from a description
- **Bug Creator** — Create a detailed bug report ticket with steps to reproduce
- **JQL Search** — Search and load Jira tickets using JQL
- **Test Plan Review** — AI review of your existing test plan ticket
- **Ticket Validator** — Check if a ticket has all required fields
- **Comment Generator** — Generate professional Jira comments

---
When the user describes their situation, recommend the 1–3 most relevant tools.
Format your answer as:
1. **Best match**: [Tool Name] (which tab to find it in) — one sentence on why it fits
2. (If relevant) **Also consider**: [Tool Name] — one sentence
3. A brief "How to use it" tip for the top recommendation.
Keep responses concise and actionable. If the situation is unclear, ask one clarifying question.`;

export default function ToolHelper({ config }) {
  const [situation, setSituation] = useState("");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Tool Helper", mode: "tool_helper", view: "devtools" });

  const handle = async (text) => {
    const input = text ?? situation;
    if (!input.trim()) return;
    setSituation(input);
    await query(SYSTEM_PROMPT, `My situation: ${input}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-violet-900/30 to-fuchsia-900/20 border border-violet-700/40 rounded-xl px-4 py-3">
        <p className="text-sm text-violet-200 font-medium mb-1">🧭 Not sure which tool to use?</p>
        <p className="text-xs text-gray-400">
          Describe what you're trying to do and I'll point you to the right tool — whether it's in Chat, More Tools, or Jira.
        </p>
      </div>

      {/* Input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">📝 Describe your situation</span>
        </div>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handle(); }}
          rows={4}
          placeholder="e.g. I have a UI screenshot and I want to generate automated tests for it..."
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      {/* Quick examples */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Or try an example</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => handle(ex)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-violet-500/50 text-gray-400 hover:text-gray-200 rounded-lg transition-all disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handle()}
          disabled={isLoading || !situation.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Finding the right tool...
            </>
          ) : "🧭 Find My Tool"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      {result && (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">💡 Recommendation</span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
            >
              Copy
            </button>
          </div>
          <div className="p-4 markdown-content text-sm max-h-[500px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
