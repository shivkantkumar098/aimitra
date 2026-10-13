---
name: code-review
description: "Independently review a proposed change for concrete defects, regressions, security issues, and missing validation before PR creation."
---
# Code Review

1. Inspect the actual diff and compare it with the requirement, design, and acceptance criteria.
2. Trace affected behavior through relevant call sites and error paths; check compatibility and privacy/security implications.
3. Report only actionable defects introduced by the change or tightly coupled to it. Do not edit files.
4. For each finding, include severity (`critical`, `high`, `medium`, `low`), confidence (1-10), exact file and line, impact, and a concise fix direction.
5. Check that validation claimed by implementation is plausible and that important criteria are covered.
6. Return `CHANGES_REQUIRED` if actionable findings exist; otherwise return `PASS` and explicitly state that no actionable findings were found.
