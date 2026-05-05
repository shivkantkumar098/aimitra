/**
 * useJiraTemplates — stores per-tool format templates in localStorage.
 *
 * Templates saved:
 *   bugFormat     — user's company bug ticket format
 *   commentFormat — user's company comment format
 *
 * These are injected into the AI system prompt so the AI always
 * follows the user's company-specific structure.
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "qa_jira_templates";

const defaultTemplates = {
  bugFormat: "",     // e.g. "Summary:\nSteps to Reproduce:\n1.\nExpected:\nActual:\nSeverity:"
  commentFormat: "", // e.g. "Validation Status: [Pass/Fail]\nTested By:\nComments:\nDate:"
};

export function useJiraTemplates() {
  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultTemplates, ...JSON.parse(saved) } : defaultTemplates;
    } catch {
      return defaultTemplates;
    }
  });

  const saveTemplate = useCallback((key, value) => {
    setTemplates((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearTemplate = useCallback((key) => {
    saveTemplate(key, "");
  }, [saveTemplate]);

  return { templates, saveTemplate, clearTemplate };
}
