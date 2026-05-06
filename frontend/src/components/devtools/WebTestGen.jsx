import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiQuery } from "../../hooks/useAiQuery";

const API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

const FRAMEWORKS = [
  { id: "playwright",  label: "Playwright" },
  { id: "selenium",    label: "Selenium" },
  { id: "cypress",     label: "Cypress" },
  { id: "webdriverio", label: "WebdriverIO" },
];
const PATTERNS = [
  { id: "pom",    label: "POM" },
  { id: "bdd",    label: "BDD / Gherkin" },
  { id: "simple", label: "Simple" },
];
const LANGUAGES = [
  { id: "python",     label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "java",       label: "Java" },
];

const TOOL_META = { label: "Web Test Generator", mode: "web_test_gen", view: "devtools" };

function OptBtn({ active, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
        active
          ? "bg-violet-600/20 border-violet-500/60 text-violet-300"
          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-violet-500/40 hover:text-gray-200"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function buildSystemPrompt(framework, pattern, language, isSpa) {
  const fw = {
    playwright:  { python: "Playwright for Python (playwright-pytest)", javascript: "@playwright/test", typescript: "@playwright/test (TypeScript)", java: "Playwright for Java" },
    selenium:    { python: "Selenium 4 + pytest", javascript: "selenium-webdriver + Mocha", typescript: "selenium-webdriver + Mocha (TS)", java: "Selenium 4 + JUnit 5" },
    cypress:     { javascript: "Cypress 13", typescript: "Cypress 13 (TypeScript)" },
    webdriverio: { javascript: "WebdriverIO v8", typescript: "WebdriverIO v8 (TypeScript)" },
  }[framework]?.[language] || `${framework} (${language})`;

  const spaNote = isSpa ? `
IMPORTANT — SPA / Dynamic App:
- The page is a JavaScript Single-Page Application (React/Vue/Angular etc.)
- Static HTML parsing could not detect rendered elements — you MUST infer realistic elements from the app title/URL context
- Use SPA-friendly locators: getByRole(), getByText(), getByPlaceholder(), getByTestId(), data-testid, aria-label, role attributes
- Assume elements render AFTER JavaScript executes — always wait for elements before interacting
- Generate at least 6–8 meaningful test cases covering the app's likely features` : "";

  const patternInstructions = {
    pom: `Generate a COMPLETE, production-ready Page Object Model implementation.
MUST include:
1. A PageObject class — locators as properties (use provided CSS selectors/XPath or infer from context), action methods (navigate, fill*, click*, verify*, waitFor*)
2. A test file importing the page object — minimum 6 independent test cases: page load, core feature interactions, form submit, navigation, validation, negative/error case
3. Proper setup/teardown, explicit waits (ZERO hardcoded sleeps), and meaningful assertion messages
4. Full working imports and all necessary configuration${spaNote}`,

    bdd: `Generate a COMPLETE BDD / Gherkin test suite.
MUST include:
1. A .feature file — Feature + description, Background if applicable, minimum 5 Scenarios (happy path + edge cases + error states), one Scenario Outline with Examples table
2. Step definitions file — implement every step using element locators (provided or inferred), Before/After hooks
3. Any needed page helper classes with realistic locators${spaNote}`,

    simple: `Generate a COMPLETE function-based test suite (no POM classes).
MUST include:
1. Setup and teardown
2. Minimum 6 test functions: page load/title, core feature flows, form interactions, button clicks, input validation, error/negative state
3. Clear assertion messages; tests must be independent${spaNote}`,
  };

  return `You are a senior QA automation engineer expert in ${fw}.
Task: ${patternInstructions[pattern]}

Rules:
- Use ONLY ${fw} — no mixing with other libraries
- Prefer CSS selectors or framework-specific locators; use XPath as fallback
- All imports at top; code must be copy-paste runnable without modification
- Add concise inline comments explaining test intent
- Tests must be independent of each other
- If element data is missing, use realistic locator patterns that would work in the given app context
- Output code ONLY inside markdown code blocks — include ALL files needed to run the tests`;
}

function buildUserPrompt(pageData, framework, pattern, language) {
  const { url, title, headings, forms, inputs, buttons, links, is_js_heavy } = pageData;

  const noElements = !forms?.length && !inputs?.length && !buttons?.length && !links?.length;

  const elStr = [
    ...(inputs || []).slice(0, 12),
    ...(buttons || []).slice(0, 10),
  ].map(el => {
    const attrs = [
      el.text        && `text="${el.text}"`,
      el.placeholder && `placeholder="${el.placeholder}"`,
      el.ariaLabel   && `aria-label="${el.ariaLabel}"`,
      `css="${el.cssSelector}"`,
      `xpath="${el.xpath}"`,
    ].filter(Boolean).join(", ");
    return `  <${el.tag}${el.type ? ` type="${el.type}"` : ""}> ${attrs}`;
  }).join("\n");

  const formStr = (forms || []).map((f, i) => {
    const fields = (f.fields || []).map(fi => `${fi.type || fi.tag}${fi.name ? `[name=${fi.name}]` : ""}`).join(", ");
    return `  Form ${i + 1}${f.id ? `#${f.id}` : ""} [${f.method}${f.action ? ` → ${f.action}` : ""}]: ${fields}`;
  }).join("\n");

  const linkStr = (links || []).slice(0, 8)
    .map(l => `  <a> text="${l.text}" href="${l.href || "#"}"`)
    .join("\n");

  const spaInstructions = (is_js_heavy && noElements) ? `
⚠ SPA DETECTED — NO STATIC ELEMENTS FOUND
This is a JavaScript Single-Page Application. The HTML was rendered server-side with no content visible to static parsers (typical React/Vue/Angular app).

You MUST generate comprehensive tests by inferring the UI from the app title and URL:
- App Title: "${title}"
- URL: ${url}

Infer and generate tests for likely features based on the app name/title. For example if it's a "QA Assistant":
  • Chat / message input and send button
  • Provider / model selector
  • Sidebar navigation and tool list
  • Settings panel
  • Authentication (login/logout) if applicable
  • Copy/download result actions
  • Response display area

Use these SPA-friendly locator strategies:
  • getByRole('button', { name: /send/i })
  • getByPlaceholder('Ask something...')
  • getByLabel('Provider')
  • locator('[data-testid="..."]')
  • locator('.classname') for visible UI classes

Generate AT LEAST 8 realistic, meaningful test cases that thoroughly test the app's core functionality.
Do NOT generate trivial title-only tests — generate real feature tests.` : "";

  return `=== PAGE DATA ===
URL:      ${url}
Title:    "${title}"
${headings?.length ? `Headings: ${headings.join(" | ")}` : ""}
${spaInstructions}

FORMS:
${formStr || "  (none detected)"}

INTERACTIVE ELEMENTS (inputs / buttons):
${elStr || "  (none detected)"}

NAVIGATION LINKS:
${linkStr || "  (none)"}

=== TASK ===
Generate complete, production-ready ${pattern.toUpperCase()} tests for this page using ${framework} (${language}).
${noElements ? "Since no elements were statically detected, infer the UI from the app context above and generate comprehensive realistic tests." : ""}`;
}

export default function WebTestGen({ config }) {
  const [url, setUrl] = useState("");
  const [pageData, setPageData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [framework, setFramework] = useState("playwright");
  const [pattern, setPattern] = useState("pom");
  const [language, setLanguage] = useState("python");
  const [copied, setCopied] = useState(false);

  const { result, isLoading, error: genError, query, clear } = useAiQuery(config, TOOL_META);

  const isJsOnly = ["cypress", "webdriverio"].includes(framework);

  const handleFramework = (fw) => {
    setFramework(fw);
    if (["cypress", "webdriverio"].includes(fw) && !["javascript", "typescript"].includes(language)) {
      setLanguage("javascript");
    }
  };

  const analyzeUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setPageData(null);
    clear();
    try {
      const res = await fetch(`${API_BASE}/api/analyze-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setPageData(data);
    } catch (e) {
      setAnalyzeError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generate = () => {
    if (!pageData) return;
    const isSpa = pageData.is_js_heavy && !pageData.forms?.length && !pageData.inputs?.length && !pageData.buttons?.length;
    query(buildSystemPrompt(framework, pattern, language, isSpa), buildUserPrompt(pageData, framework, pattern, language));
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResult = () => {
    const ext = { python: "py", javascript: "js", typescript: "ts", java: "java" }[language] || "txt";
    const filename = `${pattern}_${framework}_test.${ext}`;
    const blob = new Blob([result], { type: "text/plain" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* URL input */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Webpage URL
        </label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyzeUrl()}
            placeholder="https://example.com  or  http://localhost:3000/login"
            className="flex-1 bg-gray-800/60 text-gray-100 text-sm rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600 transition-colors"
          />
          <button
            onClick={analyzeUrl}
            disabled={analyzing || !url.trim()}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl border border-gray-600 transition-all flex items-center gap-2"
          >
            {analyzing ? (
              <><span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />Analyzing…</>
            ) : "🔍 Analyze"}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          Works with any URL — public sites, localhost, internal apps. JS-heavy SPAs may have limited element detection.
        </p>
      </div>

      {/* Analyze error */}
      {analyzeError && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300">
          <span>⚠</span><span>{analyzeError}</span>
        </div>
      )}

      {/* Page summary */}
      {pageData && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white truncate">{pageData.title || "Untitled page"}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{pageData.url}</p>
            </div>
            <span className="flex-shrink-0 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/30 px-2 py-1 rounded-lg">✓ Analyzed</span>
          </div>

          {pageData.is_js_heavy && (
            <div className="flex items-center gap-2 bg-amber-900/15 border border-amber-700/30 rounded-lg px-3 py-2 text-xs text-amber-300">
              <span>⚠</span>
              <span>JS-heavy SPA detected — static HTML was parsed. Dynamic elements may not appear below. The AI will still generate useful tests based on what was found.</span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Forms",   val: pageData.forms?.length },
              { label: "Inputs",  val: pageData.inputs?.length },
              { label: "Buttons", val: pageData.buttons?.length },
              { label: "Links",   val: pageData.links?.length },
            ].map(({ label, val }) => (
              <div key={label} className="text-center bg-violet-900/10 border border-violet-700/20 rounded-lg py-2">
                <p className="text-lg font-bold text-violet-300">{val ?? 0}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options — only show once URL is analyzed */}
      {pageData && (
        <>
          {/* Framework */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Framework</label>
            <div className="flex flex-wrap gap-2">
              {FRAMEWORKS.map(f => (
                <OptBtn key={f.id} active={framework === f.id} onClick={() => handleFramework(f.id)}>
                  {f.label}
                </OptBtn>
              ))}
            </div>
          </div>

          {/* Pattern */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pattern</label>
            <div className="flex flex-wrap gap-2">
              {PATTERNS.map(p => (
                <OptBtn key={p.id} active={pattern === p.id} onClick={() => setPattern(p.id)}>
                  {p.label}
                </OptBtn>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(l => (
                <OptBtn
                  key={l.id}
                  active={language === l.id}
                  disabled={isJsOnly && !["javascript", "typescript"].includes(l.id)}
                  onClick={() => setLanguage(l.id)}
                >
                  {l.label}
                </OptBtn>
              ))}
            </div>
            {isJsOnly && (
              <p className="text-xs text-amber-400 mt-1.5">⚠ {framework === "cypress" ? "Cypress" : "WebdriverIO"} only supports JavaScript / TypeScript.</p>
            )}
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
            ) : "⚡ Generate Test Code"}
          </button>
        </>
      )}

      {/* Gen error */}
      {genError && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300">
          <span>⚠</span><span>{genError}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Generated Code</span>
            <div className="flex gap-2">
              <button onClick={copyResult} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-emerald-400 border border-gray-700 rounded-lg transition-colors">
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
              <button onClick={downloadResult} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-blue-400 border border-gray-700 rounded-lg transition-colors">
                💾 Download
              </button>
            </div>
          </div>
          <div className="bg-[#0a0a15] border border-gray-700/50 rounded-xl p-4 text-sm overflow-x-auto prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
}
