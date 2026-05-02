import { useState, useCallback } from "react";

const STORAGE_KEY = "qa_assistant_config";

const defaultConfig = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  apiKey: "",
  temperature: 0.7,
  streaming: true,
};

export function useConfig() {
  const [config, setConfigState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const updateConfig = useCallback((updates) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full — ignore */
      }
      return next;
    });
  }, []);

  return { config, updateConfig };
}
