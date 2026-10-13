---
name: architecture-mermaid
description: "Designs a solution that fits the existing FastAPI and React stack and documents it with Mermaid diagrams in architecture.md. Use when the architecture stage starts or a design decision needs components, data flow and trade-offs written down."
---
# Architecture and Mermaid Diagrams

**Used by:** architecture-agent

## Purpose
Define how the approved requirements will be built inside the current repository, in a document a reviewer can challenge and an implementer can follow.

## When to use
- Stage 3 (`architecture`), after `impl-plan.md` is APPROVED.
- Design review requires an approved revision of `architecture.md` (revise only after the human approves the resolution).

## Required inputs
- Approved `requirements.md` and `impl-plan.md`.
- Current architecture: `ARCHITECTURE.md`, `backend/` (FastAPI routes and services), `frontend/` (React hooks and components), `scripts/`.
- Integration facts verified at run time (Jira MCP, GitHub MCP, Git); note which tools you actually confirmed.

## Procedure
1. Read the existing code and docs; describe the current structure from evidence, not memory.
2. State context and goals, and what is out of scope.
3. Choose the smallest design that fits the existing stack and conventions. Reuse existing modules before adding new ones.
4. Define components, responsibilities, interfaces (inputs, outputs, error shapes), and integration boundaries (Jira, GitHub, file system, Git).
5. Draw at least one Mermaid diagram in a fenced block: a `flowchart` for components and a `sequenceDiagram` for the main data flow. Keep labels short; verify it parses (no unquoted special characters).
6. Describe data flow end to end, including how documentation updates are validated.
7. Document error handling and recovery, security considerations (secrets, input validation, least privilege), and the testing strategy mapped to plan tasks.
8. Record technology decisions with at least one rejected alternative and the reason.
9. Write `docs/sdlc/<ISSUE-KEY>/architecture.md`.

## Expected outputs
`architecture.md` with: Context and goals; Component architecture (with a Mermaid diagram); Data flow; Component responsibilities; Integration boundaries; Error handling; Security considerations; Technology decisions and alternatives; Testing strategy.

## Quality checks
- Every requirement and plan task is addressed by a named component.
- Diagrams match the prose; component names are identical in both.
- No new dependency is introduced without a stated reason.
- No claim about existing code lacks a file reference.

## Failure handling
- Requirement conflicts with the existing stack: record the conflict and options; do not decide silently.
- A needed integration is unavailable: describe the limitation and the safe alternative; never design around a fabricated capability.
- Cannot inspect the repository: report it; mark the stage BLOCKED.

## Human approval
Present the architecture, key decisions and risks, then wait. Design review begins only after the orchestrator records the human's explicit approval of `architecture.md`.
