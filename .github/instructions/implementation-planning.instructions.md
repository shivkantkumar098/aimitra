---
name: Implementation Planning Instructions
description: Defines storage and integrity rules for implementation plans.
applyTo: ".github/AgentOutput/**/*.md"
---

# Rules
- Save the plan to `.github/AgentOutput/<JIRA_ISSUE_KEY>/impl-plan.md`.
- Use the validated Jira key from workflow context or approved artifacts.
- Base the plan on approved requirements, architecture, and design review.
- Order tasks according to dependencies, not just priority.
- Identify blocked tasks and their unblocking conditions.
- Preserve existing files and unrelated content.
- Do not include secrets, API keys, tokens, or `.env` values.
- Verify the saved artifact before reporting success.
- Do not implement code or commit/push changes.