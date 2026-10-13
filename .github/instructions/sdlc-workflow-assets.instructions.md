---
description: "Rules for editing SDLC agents, skills, hooks, workflow scripts, and their tests."
applyTo: ".github/agents/**,.github/skills/**,.github/hooks/**,scripts/sdlc/**,tests/sdlc/**"
---
- One orchestrator plus eight workers. Only the orchestrator is `user-invocable: true`; only `pr-creation-agent` may carry a GitHub MCP tool.
- Keep shared rules in `.github/copilot-instructions.md`; agent files hold only role-specific content.
- Skills must contain: Purpose, When to use, Required inputs, Procedure, Expected outputs, Quality checks, Failure handling, Human approval.
- Hooks must fail safely, never auto-approve, publish, or merge, and must be documented in `docs/agent-skill-hook-mapping.md`.
- Do not add unsupported frontmatter properties, hook events, or MCP tool names. Keep agents, skills, hooks, `stages.js`, and docs consistent; `node --test tests/sdlc` enforces it.
- Tests that use fakes must say they are SIMULATED and never imply real Jira or GitHub actions.
