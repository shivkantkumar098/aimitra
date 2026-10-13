---
description: "Use when creating or editing the AiMitra SDLC agents, skills, hooks, or workflow documentation."
applyTo: ".github/agents/**, .github/skills/**, .github/hooks/**, docs/sdlc/**"
---
# SDLC Customization Guidelines

- Keep each worker focused on one stage and return a concise, structured handoff to the orchestrator.
- Preserve the ordered pipeline: requirements, planning, architecture, design, implementation, independent code review, then PR creation.
- Use the paired skill in `.github/skills/<stage>/SKILL.md` as the detailed procedure for each agent.
- Hooks must stay deterministic, brief, and limited to their owning agent. Do not use hooks to make unreviewed edits or publish changes.
- Do not create or commit analysis artifacts unless the user asks for them; pass stage results through agent handoffs.
- The PR worker must inspect branch and worktree state, exclude unrelated changes, and stop for user input if it cannot safely isolate the requested change.
