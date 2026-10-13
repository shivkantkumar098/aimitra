---
name: jira-requirements-analysis
description: "Retrieves a Jira issue through the connected Jira MCP, clarifies gaps one question at a time and writes requirements.md. Use when starting the requirements stage of the SDLC workflow or turning a Jira story into structured, testable requirements."
---
# Jira Requirements Analysis

**Used by:** requirements-analysis-agent

## Purpose
Turn one Jira issue into a complete, traceable `requirements.md` without inventing or silently resolving anything the issue does not state.

## When to use
- Stage 1 (`requirements`) of the workflow, after the orchestrator has run `start requirements`.
- A requirements document must be refreshed because the Jira issue or its comments changed.

## Required inputs
- A Jira issue key, or a pasted story if Jira cannot be reached. If neither is known, ask the human to choose an issue; do not guess.
- The target folder `docs/sdlc/<ISSUE-KEY>/`.
- Read access to the repository for context (README.md, ARCHITECTURE.md, relevant source).

## Procedure
1. Discover the available Jira tools at run time (the server in `.vscode/mcp.json` is named `Atlassian-MCP`). Do not assume tool names; list what is offered and use only what exists.
2. Fetch the issue: summary, description, acceptance criteria, status, comments, and linked issues or pages. Record the issue key and canonical URL.
3. If retrieval worked, the source type is `jira`. If it did not (tools missing, auth failure, issue not found), say so plainly and ask whether to continue from a pasted story; that source type is `pasted`, as in `docs/sdlc/DOC-SYNC-001/user-story.md`. Never present pasted text as retrieved from Jira.
4. List ambiguities, missing acceptance criteria, edge cases, security and non-functional needs. Ask clarifying questions ONE at a time and wait for each answer before asking the next.
5. Record every answer verbatim as an assumption or requirement with its source (Jira field, comment, or human answer). Unanswered items go under Unresolved questions; do not decide them yourself.
6. Write `docs/sdlc/<ISSUE-KEY>/requirements.md`. Use no Jira write tools (no edits, transitions, or comments).

## Expected outputs
`requirements.md` with these non-empty sections: Jira issue key and source link; Problem statement and business objective; Functional requirements; Non-functional requirements; Acceptance criteria; Positive and negative scenarios; Validation and error-handling requirements; Security requirements; Assumptions, dependencies, and out-of-scope items; Unresolved questions.

## Quality checks
- Every requirement traces to the issue, a comment, a link, or a recorded human answer.
- Acceptance criteria are observable and testable; negative scenarios exist for each validation rule.
- Secrets, tokens and personal data are absent from the document.
- Unresolved questions are listed, not buried inside assumptions.

## Failure handling
- Jira MCP unavailable or unauthorised: report the exact error, do not fabricate issue content, and offer the `pasted` alternative clearly labelled as such.
- Issue missing description or acceptance criteria: ask the human; if unanswered, list under Unresolved questions.
- Unrecoverable problem: tell the orchestrator the stage is BLOCKED, with evidence.

## Human approval
Present the document and the unresolved questions, then wait. The orchestrator records approval only from the human's explicit reply; completing the draft is not approval, and planning cannot begin without it.
