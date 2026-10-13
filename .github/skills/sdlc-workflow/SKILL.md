---
name: sdlc-workflow
description: "Run the complete AiMitra SDLC from requirements through a reviewed implementation and GitHub pull request. Use the SDLC Orchestrator for end-to-end delivery."
---
# SDLC Workflow

Use the specialist agents in this strict, sequential order:

1. Requirements Analyst → measurable acceptance criteria and open questions.
2. SDLC Planner → ordered implementation and validation plan.
3. Solution Architect → component and contract decisions.
4. Solution Designer → implementation-ready behavior and edge cases.
5. Implementation Worker → scoped changes and validation results.
6. Code Reviewer → independent `PASS` or actionable `CHANGES_REQUIRED`.
7. PR Creator → create the GitHub PR only after `PASS` and safe worktree/branch verification.

Pass the original request and relevant previous handoffs at every stage. Do not proceed past blocking questions. If review requires changes, delegate fixes and request another independent review; stop after two unsuccessful fix-and-review cycles. Never create a PR after unresolved findings or include unrelated user changes.

The workflow diagram and safety rules are in [docs/sdlc/copilot-agent-workflow.md](../../../docs/sdlc/copilot-agent-workflow.md).
