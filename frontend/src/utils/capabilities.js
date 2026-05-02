export const CAPABILITIES = [
  {
    id: "text_generation",
    label: "Text / Code Generation",
    icon: "💬",
    description: "Generate text, code, and technical content",
    examples: ["Write a Python function", "Explain REST APIs", "Create a SQL query"],
  },
  {
    id: "dom_locator",
    label: "DOM Locator Generator",
    icon: "🔍",
    description: "Generate XPath and CSS selectors for web elements",
    examples: ["Login button XPath", "CSS for nav items", "Input field selector"],
  },
  {
    id: "test_generation",
    label: "Test Case Generator",
    icon: "🧪",
    description: "Generate Selenium / Playwright test cases",
    examples: ["Login page tests", "API endpoint tests", "Form validation tests"],
  },
  {
    id: "test_plan",
    label: "Test Plan Generator",
    icon: "📋",
    description: "Create comprehensive QA test plans",
    examples: ["E-commerce checkout plan", "Mobile app test plan"],
  },
  {
    id: "debug",
    label: "Code Debugging",
    icon: "🐛",
    description: "Analyze and fix bugs in your code",
    examples: ["Fix this Python script", "Debug async function", "Find memory leak"],
  },
  {
    id: "web_search",
    label: "Web Search",
    icon: "🌐",
    description: "Research technical topics and documentation",
    examples: ["Latest Playwright docs", "React hooks best practices"],
  },
  {
    id: "image_generation",
    label: "Image Generation",
    icon: "🎨",
    description: "Generate image prompts and descriptions",
    examples: ["Dark UI mockup", "System architecture diagram"],
  },
  {
    id: "jira",
    label: "Jira Integration",
    icon: "🔵",
    description: "Create structured Jira tickets and user stories",
    examples: ["Login feature ticket", "Bug report for crash"],
  },
  {
    id: "jql",
    label: "JQL Search",
    icon: "🤖",
    description: "Generate Jira Query Language (JQL) queries",
    examples: ["Open bugs this sprint", "My unresolved tickets"],
  },
];

export const MODELS = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Recommended)" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
  { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro" },
];
