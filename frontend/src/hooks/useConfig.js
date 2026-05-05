/**
 * useConfig — manages provider/model/API key configuration.
 *
 * Keys are stored PER PROVIDER in localStorage so switching providers
 * never loses a previously entered key.
 *
 * Storage key: "qa_assistant_config"
 * Storage shape: { provider, model, apiKeys: {groq, gemini, anthropic, openai, mistral, deepseek, xai, together, perplexity, cerebras, openrouter, fireworks, cohere}, temperature, streaming }
 *
 * Exposed API:
 *   config      — full config object (provider, model, apiKeys, temperature, streaming)
 *   updateConfig(updates) — deep-merges updates and saves to localStorage
 *   apiKey      — shortcut: config.apiKeys[config.provider] (current active key)
 *   setApiKey   — saves key only for the current provider
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "qa_assistant_config";

// Defaults used for first-time visitors or after localStorage.clear()
const defaultConfig = {
  provider: "groq",
  model: "llama-3.3-70b-versatile",
  apiKeys: {
    groq: "", gemini: "", anthropic: "",
    openai: "", mistral: "", deepseek: "", xai: "",
    together: "", perplexity: "", cerebras: "",
    openrouter: "", fireworks: "", cohere: "",
  },
  temperature: 0.7,
  streaming: true,
};

export function useConfig() {
  const [config, setConfigState] = useState(() => {
    // Read saved config from localStorage on first render
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old format (single apiKey string) to new per-provider apiKeys object
        if (parsed.apiKey && !parsed.apiKeys) {
          parsed.apiKeys = {
            groq: "", gemini: "", anthropic: "",
            openai: "", mistral: "", deepseek: "", xai: "",
            together: "", perplexity: "", cerebras: "",
            openrouter: "", fireworks: "", cohere: "",
          };
          parsed.apiKeys[parsed.provider || "groq"] = parsed.apiKey;
          delete parsed.apiKey;
        }
        // Merge with defaults so new keys added in future updates don't break
        return { ...defaultConfig, ...parsed, apiKeys: { ...defaultConfig.apiKeys, ...parsed.apiKeys } };
      }
    } catch { /* corrupted storage — use defaults */ }
    return defaultConfig;
  });

  const updateConfig = useCallback((updates) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates };
      // Deep-merge apiKeys so patching one provider doesn't wipe others
      if (updates.apiKeys) {
        next.apiKeys = { ...prev.apiKeys, ...updates.apiKeys };
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage full — silently ignore */ }
      return next;
    });
  }, []);

  // Derived value: always returns the key for the currently selected provider
  const apiKey = config.apiKeys[config.provider] || "";

  // Saves key only for the current provider — other providers' keys untouched
  const setApiKey = useCallback((key) => {
    updateConfig({ apiKeys: { [config.provider]: key } });
  }, [config.provider, updateConfig]);

  return { config, updateConfig, apiKey, setApiKey };
}
