import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const FRAMEWORKS = [
  { id: "cucumber-java",  label: "Cucumber (Java)" },
  { id: "behave",         label: "Behave (Python)" },
  { id: "specflow",       label: "SpecFlow (.NET)" },
  { id: "pytest-bdd",     label: "Pytest-BDD" },
  { id: "cucumber-js",    label: "Cucumber.js" },
];

const SCENARIOS = [
  { id: "happy",    label: "Happy path only" },
  { id: "edge",     label: "Happy + Edge cases" },
  { id: "full",     label: "Full suite (all scenarios)" },
];

const SYSTEM_PROMPT = `You are a senior BDD (Behavior-Driven Development) expert. You write clean, precise Gherkin feature files that follow best practices:
- Use clear, business-readable language in Given/When/Then steps
- Keep steps atomic and reusable
- Group related scenarios with tags
- Use Scenario Outline with Examples for data-driven tests
- Include Background when steps are shared across scenarios
- Add meaningful tags like @smoke, @regression, @negative
Output complete .feature file content ready to use.`;

export default function BddGenerator({ config }) {
  const [story, setStory] = useState("");
  const [framework, setFramework] = useState("cucumber-java");
  const [scenarioType, setScenarioType] = useState("edge");
  const { result, isLoading, error, query, clear } = useAiQuery(config, { label: "BDD Generator", mode: "bdd", view: "devtools" });

  const handle = async () => {
    if (!story.trim()) return;
    const fw = FRAMEWORKS.find((f) => f.id === framework)?.label || framework;
    const sc = SCENARIOS.find((s) => s.id === scenarioType)?.label || scenarioType;
    await query(
      SYSTEM_PROMPT,
      `Generate a complete Gherkin feature file for the following user story/feature:

${story}

Requirements:
- Framework: ${fw}
- Scenarios to include: ${sc}
- Include a Feature description, tags, and all relevant scenarios
- Add step definition stubs as comments below the feature file (showing the method signatures for ${fw})
- Use Scenario Outline with Examples table where multiple data sets make sense`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-semibold text-white">📖 User Story / Feature Description</span>
        </div>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={8}
          placeholder={`Paste your user story or feature description here, e.g.:\n\nAs a registered user\nI want to log into my account\nSo that I can access my dashboard\n\nAcceptance criteria:\n- Valid credentials → redirect to dashboard\n- Invalid password → show error message\n- Locked account → show account locked message`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Framework</label>
          <div className="flex flex-col gap-1.5">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFramework(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  framework === f.id
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-3">
          <label className="block text-xs text-gray-400 mb-2">Scenarios to Generate</label>
          <div className="flex flex-col gap-1.5">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenarioType(s.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  scenarioType === s.id
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !story.trim()}
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
          ) : "🥒 Generate Feature File"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}
      <ResultPanel result={result} title="🥒 BDD Feature File" titleColor="text-emerald-300" toolName="bdd-generator" onClear={clear} maxHeight="600px" />
    </div>
  );
}
