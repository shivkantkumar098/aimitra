import { useState } from "react";
import { useAiQuery } from "../../hooks/useAiQuery";
import ResultPanel from "../shared/ResultPanel";

const FRAMEWORKS = [
  { id: "all",        label: "All Frameworks",  desc: "CSS, XPath, Playwright, Cypress, Selenium" },
  { id: "playwright", label: "Playwright",       desc: "getByRole, getByText, locator()" },
  { id: "cypress",    label: "Cypress",          desc: "cy.get(), cy.contains(), cy.findByRole()" },
  { id: "selenium",   label: "Selenium",         desc: "By.id, By.xpath, By.cssSelector" },
  { id: "css",        label: "CSS Only",         desc: "Pure CSS selectors" },
  { id: "xpath",      label: "XPath Only",       desc: "Absolute & relative XPath" },
];

const SYSTEM_PROMPT = `You are a senior test automation engineer specializing in DOM locator strategies.

When given HTML, analyze each interactive or significant element and generate robust, maintainable locators.

For each element provide:
1. A short label describing the element (e.g. "Login Button", "Email Input")
2. Locators in the requested framework(s), prioritized from most stable to least stable:
   - ID-based (most stable)
   - data-testid / data-cy / aria attributes
   - Role + accessible name (Playwright: getByRole, Cypress: findByRole)
   - CSS selector (specific but not brittle)
   - XPath (as last resort, keep relative)
3. A stability note (Good / Fragile / Avoid) with one-line reason

Format output as clean markdown with a table or code block per element.
Never generate locators based on position (nth-child) unless no other option exists.
Flag any elements that have no stable locator and suggest adding a data-testid.`;

export default function DomLocatorGenerator({ config }) {
  const [html, setHtml] = useState("");
  const [framework, setFramework] = useState("all");
  const { result, isLoading, error, query, clear } = useAiQuery(config, {
    label: "DOM Locator Generator",
    mode: "dom_locator",
    view: "devtools",
  });

  const handle = async () => {
    if (!html.trim()) return;
    const fw = FRAMEWORKS.find((f) => f.id === framework);
    await query(
      SYSTEM_PROMPT,
      `Generate DOM locators for the following HTML.

Framework: ${fw.label} (${fw.desc})

HTML:
\`\`\`html
${html}
\`\`\`

For every interactive element (buttons, inputs, links, selects, checkboxes) and important containers:
- Generate the best locators for the selected framework
- Mark each as: ✅ Stable / ⚠ Fragile / ❌ Avoid
- If no stable locator exists, suggest a data-testid to add`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Framework selector */}
      <div className="grid grid-cols-3 gap-2">
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw.id}
            onClick={() => { setFramework(fw.id); clear(); }}
            title={fw.desc}
            className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs transition-all ${
              framework === fw.id
                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                : "bg-[#1a1f2e] border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
            }`}
          >
            <span className="font-semibold text-center leading-tight">{fw.label}</span>
            <span className="text-center text-gray-500 leading-tight">{fw.desc}</span>
          </button>
        ))}
      </div>

      {/* HTML input */}
      <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">🧩 Paste HTML</span>
          <span className="text-xs text-gray-500">Paste the HTML snippet containing the elements to locate</span>
        </div>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          placeholder={`<form class="login-form">\n  <input type="email" name="email" placeholder="Email" />\n  <input type="password" name="password" placeholder="Password" />\n  <button type="submit" class="btn-primary">Login</button>\n  <a href="/forgot-password">Forgot password?</a>\n</form>`}
          className="w-full bg-[#0d1117] text-gray-200 text-sm font-mono px-4 py-3 focus:outline-none resize-none placeholder-gray-600"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handle}
          disabled={isLoading || !html.trim()}
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
          ) : "🎯 Generate Locators"}
        </button>
        {result && <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-300 px-2">Clear</button>}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">⚠ {error}</div>
      )}

      <ResultPanel
        result={result}
        title="🎯 Generated Locators"
        titleColor="text-violet-300"
        toolName="dom-locator-generator"
        onClear={clear}
        maxHeight="600px"
      />
    </div>
  );
}
