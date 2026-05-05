import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";
import { DEFAULT_TEST_PLAN_FORMAT } from "../../hooks/useJiraTemplates";
import TemplatePrompt from "./TemplatePrompt";
import TemplateBadge from "./TemplateBadge";

export default function TestPlanReviewer({ config, template, onSaveTemplate }) {
  const effectiveFormat = template || DEFAULT_TEST_PLAN_FORMAT;
  const [templateConfirmed, setTemplateConfirmed] = useState(!!template);
  const [testPlan, setTestPlan] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [includeTicket, setIncludeTicket] = useState(false);
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "Test Plan Review", mode: "jira_plan", view: "jira" });

  const handleResetFormat = () => onSaveTemplate("testPlanFormat", "");

  const handleReview = async () => {
    if (!testPlan.trim()) return;

    const systemPrompt = `You are a senior QA lead and test planning expert with 10+ years of experience.
Review the provided test plan thoroughly and give structured, actionable feedback.

Your review must cover:
1. **Coverage Analysis** — Are all functional areas covered? What's missing?
2. **Test Types** — Are functional, regression, integration, E2E, performance, security tests included where needed?
3. **Acceptance Criteria Alignment** — Does the plan cover all stated ACs? (if ticket provided)
4. **Boundary Value Analysis** — Are boundary conditions and edge cases addressed?
5. **Risk Assessment** — High-risk areas that need more coverage
6. **Test Data** — Is test data strategy mentioned? What's missing?
7. **Entry/Exit Criteria** — Are they defined and realistic?
8. **Improvements** — Specific, prioritized recommendations

Structure your response following this exact format:
${effectiveFormat}`;

    const userMessage = includeTicket && ticketDescription.trim()
      ? `Review this test plan against the JIRA ticket requirements:\n\n--- JIRA TICKET ---\n${ticketDescription}\n--- END TICKET ---\n\n--- TEST PLAN ---\n${testPlan}\n--- END TEST PLAN ---`
      : `Review this test plan for completeness and quality:\n\n${testPlan}`;

    await query(systemPrompt, userMessage);
  };

  if (!templateConfirmed) {
    return (
      <TemplatePrompt
        question="What format should I use for the test plan review report?"
        defaultTemplate={DEFAULT_TEST_PLAN_FORMAT}
        onSave={(val) => { onSaveTemplate("testPlanFormat", val); setTemplateConfirmed(true); }}
        onUseDefault={() => setTemplateConfirmed(true)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <TemplateBadge
        label="📐 Review Format"
        effectiveTemplate={effectiveFormat}
        customSaved={!!template}
        onSave={(val) => onSaveTemplate("testPlanFormat", val)}
        onReset={handleResetFormat}
      />

      {/* Toggle: include ticket */}
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={() => setIncludeTicket(!includeTicket)}
          className={`relative w-10 h-5 rounded-full transition-colors ${includeTicket ? "bg-violet-600" : "bg-gray-700"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${includeTicket ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
        <span className="text-sm text-gray-400">Include JIRA ticket for alignment review</span>
      </div>

      {/* Ticket Description (optional) */}
      {includeTicket && (
        <div className="bg-[#1a1f2e] border border-violet-700/40 rounded-xl p-4">
          <label className="block text-sm font-semibold text-violet-300 mb-2">🎫 JIRA Ticket Description / Acceptance Criteria</label>
          <textarea
            value={ticketDescription}
            onChange={(e) => setTicketDescription(e.target.value)}
            rows={4}
            className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
            placeholder="Paste the JIRA ticket description, user story, and acceptance criteria here..."
          />
        </div>
      )}

      {/* Test Plan Input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-4">
        <label className="block text-sm font-semibold text-white mb-2">📋 Test Plan</label>
        <textarea
          value={testPlan}
          onChange={(e) => setTestPlan(e.target.value)}
          rows={8}
          className="w-full bg-[#0d1117] text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 resize-none placeholder-gray-600"
          placeholder="Paste your test plan here. Include test scenarios, test cases, test types, scope, etc..."
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleReview}
            disabled={isLoading || !testPlan.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8H4z"/></svg>Reviewing...</>
              : "🔍 Review Test Plan"}
          </button>
          {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>}
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>}

      {result && (
        <div className="flex-1 bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="text-sm font-semibold text-white">📊 Review Report</span>
            <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Copy</button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[28rem] markdown-content text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
