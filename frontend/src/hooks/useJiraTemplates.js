import { useState, useCallback } from "react";

const STORAGE_KEY = "qa_jira_templates";

export const DEFAULT_BUG_FORMAT = `Summary: [Brief description of the bug]
Environment: [Dev/QA/Staging/Prod]
Browser/OS: [Browser + version / OS]
Build Version: [x.x.x]

Steps to Reproduce:
1.
2.
3.

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Severity: [Critical/High/Medium/Low]
Priority: [P1/P2/P3/P4]
Attachments: [Screenshots/Logs or None]`;

export const DEFAULT_COMMENT_FORMAT = `Validation Status: [Pass / Fail / Partial Pass]
Tested By: [Your Name]
Test Date: [DD/MM/YYYY]
Environment: [Dev / QA / Staging]
Build Version: [version]

Test Summary:
[What was tested]

Findings:
[Issues found or "No issues found"]

Defects Raised: [Ticket numbers or "None"]

Sign-off: [Approved / Pending fixes / Blocked]`;

export const DEFAULT_TEST_PLAN_FORMAT = `## Test Plan Review Report

### 1. Coverage Analysis
[Which features/flows are covered vs. missing]

### 2. Test Types
[Functional / Regression / Integration / E2E / Performance / Security]

### 3. AC Alignment
[Does each AC have corresponding test cases? Gaps?]

### 4. Boundary Value Analysis
[Edge cases and boundary conditions covered?]

### 5. Risk Assessment
| Risk Area | Severity | Current Coverage |
|-----------|----------|-----------------|

### 6. Test Data Strategy
[Is test data defined? What's missing?]

### 7. Entry / Exit Criteria
[Defined and realistic?]

### 8. Improvements
1. [Top priority improvement]
2.
3.

**Overall Score: X/10**`;

export const DEFAULT_VALIDATOR_FORMAT = `## Ticket Validation Report — [TICKET-ID]

### ✅ What's Good
[Strengths of the ticket]

### ⚠️ Issues Found
[Problems and gaps]

### 📐 Boundary Value Analysis
| Field | Min | Max | Edge Cases |
|-------|-----|-----|------------|

### ❌ Missing Negative Scenarios
[Test scenarios not covered]

### ❓ Clarifications Needed
[Questions for the BA/PO]

### 📋 Recommended Test Scenarios
1.
2.

### 🎯 Verdict: [Ready to Test / Needs Clarification / Blocked]
**Quality Score: X/10**`;

const defaultTemplates = {
  bugFormat:      "",
  commentFormat:  "",
  testPlanFormat: "",
  validatorFormat:"",
  ticketFormat:   "",
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
