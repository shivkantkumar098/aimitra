const has = (text, ...words) => words.some(w => text.includes(w));

const TEST_KEYWORDS = ["test", "assert", "expect", "selenium", "playwright", "cypress", "webdriver", "bdd", "gherkin", "locator", "xpath", "selector", "scenario", "spec", "automation", "e2e"];
const CODE_KEYWORDS = ["function", "class", "variable", "code", "script", "import", "export", "bug", "error", "exception", "fix", "debug", "compile", "syntax", "api", "database", "server"];
const GENERAL_QUESTION = (t) => has(t, "what is", "what are", "who is", "why does", "why is", "why are", "explain ", "how does", "how do", "tell me", "difference between", "define ", "meaning of", "can you help", "i need help");

const isStackTrace = (t) =>
  has(t,
    "exception in thread", "nullpointerexception", "stackoverflowexception",
    "arrayindexoutofboundsexception", "classnotfoundexception", "illegalargumentexception",
    "traceback (most recent call last)", "syntaxerror:", "typeerror:", "valueerror:",
    "referenceerror:", "attributeerror:", "importerror:", "runtimeerror:",
    "java.lang.", "java.io.", "java.util.", "java.net.",
    "cannot read propert", "undefined is not", "is not a function", "is not defined",
    "segmentation fault", "core dumped", "fatal error:",
    "unhandled exception", "error: cannot", "panic:", "runtime error"
  ) || /\bat\s+[\w$.]+\s*\([\w$.]+\.(?:java|kt|scala|cs|py|js|ts):\d+\)/i.test(t);

export function detectBetterMode(text, activeMode) {
  const t = text.toLowerCase();

  // ── Global: stack trace / error in any non-debug mode → suggest Code Debugging
  if (activeMode !== "debug" && isStackTrace(t)) {
    return {
      type: "mode",
      mode: "debug",
      view: "chat",
      icon: "🐛",
      label: "Code Debugging",
      hint: "This looks like an error or stack trace. Code Debugging mode will analyse the root cause and suggest a fix.",
    };
  }

  // ── From general chat → specific tool ────────────────────────────────────
  if (activeMode === "text_generation") {

    // Web/current events → Web Search mode
    if (has(t, "latest news", "current events", "today", "this week", "this month", "right now", "recent", "trending", "what happened", "news about", "live ", "real-time")) {
      return { type: "mode", mode: "web_search", view: "chat", icon: "🔍", label: "Web Search" };
    }
    // Image generation
    if (has(t, "generate image", "create image", "draw ", "make a picture", "make an image", "visualize", "dall-e", "stable diffusion", "create a logo", "generate a logo")) {
      return { type: "mode", mode: "image_generation", view: "chat", icon: "🎨", label: "Image Generation" };
    }
    // BDD / Gherkin
    if (has(t, "bdd", "gherkin", "feature file", "given when then", "given that", "scenario outline", "cucumber")) {
      return { type: "mode", mode: "bdd", view: "devtools", icon: "🥒", label: "BDD Generator" };
    }
    // API testing
    if (has(t, "api test", "api testing", "postman", "rest api test", "endpoint test", "http test", "swagger test")) {
      return { type: "mode", mode: "api_test", view: "devtools", icon: "🔌", label: "API Test Generator" };
    }
    // Test plan
    if (has(t, "test plan", "test strategy", "testing strategy", "test approach", "qa plan")) {
      return { type: "mode", mode: "test_plan", view: "chat", icon: "📋", label: "Test Plan Generator" };
    }
    // DOM locator
    if (has(t, "xpath", "css selector", "find element", "locator for", "selector for", "dom selector", "find locator", "element locator")) {
      return { type: "mode", mode: "dom_locator", view: "chat", icon: "🎯", label: "DOM Locator Generator" };
    }
    // Test cases
    if (has(t, "test case", "test cases", "write test", "unit test", "integration test", "test scenario", "test scenarios", "generate test", "test script")) {
      return { type: "mode", mode: "test_generation", view: "chat", icon: "🧪", label: "Test Case Generator" };
    }

    // Model suggestions ──────────────────────────────────────────────────────
    // Reasoning / math / logic → DeepSeek R1 or o3-mini
    if (has(t, "solve ", "calculate", "proof ", "prove ", "reasoning", "logic puzzle", "math problem", "equation", "derive ", "theorem", "step by step math", "logical deduction")) {
      return { type: "model", icon: "🧠", label: "DeepSeek R1 or o3-mini", hint: "These reasoning models think step-by-step and excel at math, logic, and complex problem solving." };
    }
    // Code generation / review → Claude Sonnet or GPT-4o
    if (has(t, "write code", "generate code", "code for", "implement ", "refactor", "code review", "review this code", "optimize code", "write a function", "write a class")) {
      return { type: "model", icon: "💻", label: "Claude Sonnet or GPT-4o", hint: "These models produce the highest quality code with strong reasoning about architecture and edge cases." };
    }
    // Long document / large context → Claude
    if (has(t, "summarize this", "analyse this document", "analyze this document", "read this", "long document", "entire file", "whole codebase", "large context")) {
      return { type: "model", icon: "📄", label: "Claude Sonnet", hint: "Claude has a large context window, making it ideal for analyzing long documents and codebases." };
    }
    // Fast / simple → Groq or Cerebras
    if (has(t, "quick answer", "quick question", "simple question", "short answer", "fast response", "brief answer")) {
      return { type: "model", icon: "⚡", label: "Groq (Llama 3.3 70B)", hint: "Groq delivers ultra-fast responses for free — perfect for quick questions." };
    }
  }

  // ── Test Case Generator — off-topic → suggest correct mode ────────────────
  if (activeMode === "test_generation") {
    const isAboutTesting = TEST_KEYWORDS.some(w => t.includes(w));
    if (GENERAL_QUESTION(t) && !isAboutTesting) {
      return { type: "mode", mode: "text_generation", view: "chat", icon: "💬", label: "General Chat", hint: "This mode is optimised for writing test cases. For general questions, General Chat gives better answers." };
    }
  }

  // ── Test Plan Generator — off-topic ───────────────────────────────────────
  if (activeMode === "test_plan") {
    const isAboutPlanning = has(t, "plan", "strategy", "approach", "scope", "risk", "coverage", "milestone", "resource", "schedule", "phase", "qa", "test");
    if (GENERAL_QUESTION(t) && !isAboutPlanning) {
      return { type: "mode", mode: "text_generation", view: "chat", icon: "💬", label: "General Chat", hint: "This mode is for creating test plans. Switch to General Chat for broader questions." };
    }
  }

  // ── DOM Locator Generator — off-topic ─────────────────────────────────────
  if (activeMode === "dom_locator") {
    const isAboutSelectors = has(t, "xpath", "css", "selector", "locator", "element", "dom", "id", "class", "attribute", "find");
    if (GENERAL_QUESTION(t) && !isAboutSelectors) {
      return { type: "mode", mode: "text_generation", view: "chat", icon: "💬", label: "General Chat", hint: "DOM Locator mode is for generating XPath/CSS selectors. Use General Chat for other questions." };
    }
  }

  // ── Debug mode — off-topic ────────────────────────────────────────────────
  if (activeMode === "debug") {
    const isAboutDebugging = has(t, "error", "bug", "exception", "crash", "fix", "issue", "problem", "trace", "undefined", "null", "fail", "broken", "not working");
    if (GENERAL_QUESTION(t) && !isAboutDebugging && !CODE_KEYWORDS.some(w => t.includes(w))) {
      return { type: "mode", mode: "text_generation", view: "chat", icon: "💬", label: "General Chat", hint: "Debug mode is for fixing code errors. Switch to General Chat for other topics." };
    }
  }

  // ── Web Search mode — offline / static question ───────────────────────────
  if (activeMode === "web_search") {
    const needsLiveData = has(t, "latest", "today", "current", "recent", "news", "now", "this week", "live", "trending", "price of", "stock", "weather");
    if (!needsLiveData && (GENERAL_QUESTION(t) || CODE_KEYWORDS.some(w => t.includes(w)) || TEST_KEYWORDS.some(w => t.includes(w)))) {
      return { type: "mode", mode: "text_generation", view: "chat", icon: "💬", label: "General Chat", hint: "Web Search is for live data. For coding or testing questions, General Chat gives better structured answers." };
    }
  }

  // ── Image Generation — non-image question ────────────────────────────────
  if (activeMode === "image_generation") {
    const isAboutImages = has(t, "image", "picture", "photo", "draw", "generate", "create", "logo", "icon", "illustration", "visual", "design", "art");
    if (!isAboutImages && (GENERAL_QUESTION(t) || CODE_KEYWORDS.some(w => t.includes(w)) || TEST_KEYWORDS.some(w => t.includes(w)))) {
      return { type: "mode", mode: "text_generation", view: "chat", icon: "💬", label: "General Chat", hint: "Image Generation is for creating visuals. For text, code, or testing questions, switch to General Chat." };
    }
  }

  return null;
}
