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
];

export const MODELS = [
  // ── OpenAI ───────────────────────────────────────────────────────────────
  { id: "gpt-4o",             name: "GPT-4o",              provider: "openai", logoProvider: "openai" },
  { id: "gpt-4o-mini",        name: "GPT-4o Mini",         provider: "openai", logoProvider: "openai" },
  { id: "gpt-4-turbo",        name: "GPT-4 Turbo",         provider: "openai", logoProvider: "openai" },
  { id: "o3-mini",            name: "o3 Mini (Reasoning)", provider: "openai", logoProvider: "openai" },
  { id: "o1",                 name: "o1 (Reasoning)",      provider: "openai", logoProvider: "openai" },

  // ── Anthropic (direct) ───────────────────────────────────────────────────
  { id: "claude-opus-4-7",            name: "Claude Opus 4.7",     provider: "anthropic", logoProvider: "anthropic" },
  { id: "claude-sonnet-4-6",          name: "Claude Sonnet 4.6",   provider: "anthropic", logoProvider: "anthropic" },
  { id: "claude-haiku-4-5-20251001",  name: "Claude Haiku 4.5",    provider: "anthropic", logoProvider: "anthropic" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet",   provider: "anthropic", logoProvider: "anthropic" },
  { id: "claude-3-opus-20240229",     name: "Claude 3 Opus",       provider: "anthropic", logoProvider: "anthropic" },

  // ── Google Gemini (direct) ───────────────────────────────────────────────
  { id: "gemini-2.0-flash",        name: "Gemini 2.0 Flash",      provider: "gemini", logoProvider: "google" },
  { id: "gemini-2.0-flash-lite",   name: "Gemini 2.0 Flash Lite", provider: "gemini", logoProvider: "google" },
  { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash",      provider: "gemini", logoProvider: "google" },
  { id: "gemma-3-27b-it",          name: "Gemma 3 27B",           provider: "gemini", logoProvider: "google" },
  { id: "gemma-3-12b-it",          name: "Gemma 3 12B",           provider: "gemini", logoProvider: "google" },

  // ── Groq ─────────────────────────────────────────────────────────────────
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B",        provider: "groq", logoProvider: "meta"    },
  { id: "llama-3.1-8b-instant",    name: "Llama 3.1 8B Instant", provider: "groq", logoProvider: "meta"    },
  { id: "mixtral-8x7b-32768",      name: "Mixtral 8x7B",         provider: "groq", logoProvider: "mistral" },
  { id: "gemma2-9b-it",            name: "Gemma 2 9B",           provider: "groq", logoProvider: "google"  },

  // ── Mistral AI ────────────────────────────────────────────────────────────
  { id: "mistral-large-latest",  name: "Mistral Large",    provider: "mistral", logoProvider: "mistral" },
  { id: "mistral-small-latest",  name: "Mistral Small",    provider: "mistral", logoProvider: "mistral" },
  { id: "codestral-latest",      name: "Codestral",        provider: "mistral", logoProvider: "mistral" },
  { id: "mistral-nemo",          name: "Mistral Nemo 12B", provider: "mistral", logoProvider: "mistral" },

  // ── DeepSeek ─────────────────────────────────────────────────────────────
  { id: "deepseek-chat",      name: "DeepSeek V3",       provider: "deepseek", logoProvider: "deepseek" },
  { id: "deepseek-reasoner",  name: "DeepSeek R1 (Thinking)", provider: "deepseek", logoProvider: "deepseek" },

  // ── xAI (Grok) ───────────────────────────────────────────────────────────
  { id: "grok-3-latest",       name: "Grok 3",      provider: "xai", logoProvider: "xai" },
  { id: "grok-3-mini-latest",  name: "Grok 3 Mini", provider: "xai", logoProvider: "xai" },
  { id: "grok-2-1212",         name: "Grok 2",      provider: "xai", logoProvider: "xai" },

  // ── Together AI ──────────────────────────────────────────────────────────
  { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",   name: "Llama 3.3 70B Turbo",  provider: "together", logoProvider: "meta"    },
  { id: "meta-llama/Llama-3.1-8B-Instruct-Turbo",    name: "Llama 3.1 8B Turbo",   provider: "together", logoProvider: "meta"    },
  { id: "Qwen/Qwen2.5-72B-Instruct-Turbo",            name: "Qwen 2.5 72B",         provider: "together", logoProvider: "qwen"    },
  { id: "deepseek-ai/DeepSeek-R1",                    name: "DeepSeek R1 (Together)",provider: "together", logoProvider: "deepseek"},
  { id: "mistralai/Mixtral-8x22B-Instruct-v0.1",      name: "Mixtral 8x22B",        provider: "together", logoProvider: "mistral" },

  // ── Perplexity ────────────────────────────────────────────────────────────
  { id: "sonar-pro",   name: "Sonar Pro (Search)",  provider: "perplexity", logoProvider: "perplexity" },
  { id: "sonar",       name: "Sonar (Search)",      provider: "perplexity", logoProvider: "perplexity" },
  { id: "r1-1776",     name: "R1-1776",             provider: "perplexity", logoProvider: "perplexity" },

  // ── Cerebras (ultra-fast inference) ──────────────────────────────────────
  { id: "llama-3.3-70b",  name: "Llama 3.3 70B (Fast)", provider: "cerebras", logoProvider: "meta"  },
  { id: "llama-3.1-8b",   name: "Llama 3.1 8B (Fast)",  provider: "cerebras", logoProvider: "meta"  },
  { id: "qwen-3-32b",     name: "Qwen 3 32B (Fast)",     provider: "cerebras", logoProvider: "qwen"  },

  // ── OpenRouter (access to 200+ models via one key) ───────────────────────
  { id: "openai/gpt-4o",                             name: "GPT-4o (via OR)",          provider: "openrouter", logoProvider: "openai"    },
  { id: "anthropic/claude-3.5-sonnet",               name: "Claude 3.5 Sonnet (via OR)",provider: "openrouter", logoProvider: "anthropic" },
  { id: "google/gemini-2.0-flash-exp:free",          name: "Gemini 2.0 Flash Free",    provider: "openrouter", logoProvider: "google"    },
  { id: "meta-llama/llama-3.3-70b-instruct:free",    name: "Llama 3.3 70B Free",       provider: "openrouter", logoProvider: "meta"      },
  { id: "deepseek/deepseek-r1:free",                 name: "DeepSeek R1 Free",         provider: "openrouter", logoProvider: "deepseek"  },
  { id: "microsoft/phi-4",                           name: "Phi-4",                    provider: "openrouter", logoProvider: "microsoft" },

  // ── Fireworks AI ──────────────────────────────────────────────────────────
  { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3 70B",   provider: "fireworks", logoProvider: "meta"     },
  { id: "accounts/fireworks/models/deepseek-r1",             name: "DeepSeek R1",      provider: "fireworks", logoProvider: "deepseek" },
  { id: "accounts/fireworks/models/qwen2p5-72b-instruct",    name: "Qwen 2.5 72B",     provider: "fireworks", logoProvider: "qwen"     },

  // ── Cohere ────────────────────────────────────────────────────────────────
  { id: "command-r-plus-08-2024", name: "Command R+",  provider: "cohere", logoProvider: "cohere" },
  { id: "command-r-08-2024",      name: "Command R",   provider: "cohere", logoProvider: "cohere" },
];

// Models that use chain-of-thought reasoning — may not follow strict structured output
const REASONING_MODELS = new Set([
  "o1", "o3-mini", "deepseek-reasoner",
  "deepseek-ai/DeepSeek-R1", "accounts/fireworks/models/deepseek-r1",
  "deepseek/deepseek-r1:free", "r1-1776",
]);

// Very small / lightweight models — may struggle with complex structured tasks
const SMALL_MODELS = new Set([
  "llama-3.1-8b-instant", "llama-3.1-8b",
  "meta-llama/Llama-3.1-8B-Instruct-Turbo",
  "gemma-3-12b-it", "gemma2-9b-it",
  "gemini-2.0-flash-lite",
  "mistral-nemo",
]);

// Modes that produce structured or formatted output (JIRA, BDD, test plans, etc.)
const STRUCTURED_MODES = new Set([
  "jira_bug", "jira_create", "jira_rovo", "jira_jql", "jira_plan", "jira_validate", "jira_comment",
  "ba_user_story", "ba_acceptance", "ba_use_case", "ba_requirements", "ba_process_flow",
  "ba_brd", "ba_gap", "ba_stakeholder", "ba_meeting", "ba_impact",
  "bdd", "test_generation", "test_plan", "dom_locator", "api_test",
]);

// Modes where heavy reasoning adds no value but hurts structured output
const REASONING_POOR_MODES = STRUCTURED_MODES;

/**
 * Returns a warning object { level: "warning"|"error", message: string }
 * or null when the model+mode combo is fine.
 */
export function getCapabilityWarning(modelId, provider, modeId) {
  if (!modelId || !modeId) return null;

  // Web Search — only Perplexity supports real-time search
  if (modeId === "web_search" && provider !== "perplexity") {
    return {
      level: "warning",
      message: "This model does not support real-time web search. Responses will be based on training data only. Switch to a Perplexity model for live results.",
    };
  }

  // Reasoning models + structured output modes
  if (REASONING_MODELS.has(modelId) && REASONING_POOR_MODES.has(modeId)) {
    return {
      level: "warning",
      message: "Reasoning models think step-by-step and may not follow structured output formats reliably. For best results, use a standard chat model (e.g. GPT-4o, Claude Sonnet).",
    };
  }

  // Small models + complex structured modes
  if (SMALL_MODELS.has(modelId) && STRUCTURED_MODES.has(modeId)) {
    return {
      level: "warning",
      message: "This lightweight model may produce incomplete or low-quality output for complex structured tasks. Consider upgrading to a larger model.",
    };
  }

  // Codestral is code-only — poor for JIRA / BA / natural-language modes
  if (modelId === "codestral-latest") {
    const nonCodeModes = new Set([
      "jira_bug", "jira_create", "jira_rovo", "jira_jql", "jira_plan", "jira_validate", "jira_comment",
      "ba_user_story", "ba_acceptance", "ba_use_case", "ba_requirements", "ba_process_flow",
      "ba_brd", "ba_gap", "ba_stakeholder", "ba_meeting", "ba_impact",
      "text_generation",
    ]);
    if (nonCodeModes.has(modeId)) {
      return {
        level: "warning",
        message: "Codestral is a code-specialized model. It may produce poor results for non-coding tasks. Switch to Mistral Large or another general model.",
      };
    }
  }

  return null;
}
