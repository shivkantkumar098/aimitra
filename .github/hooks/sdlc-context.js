const stage = process.argv[2];

const messages = {
  "requirements": "You are the requirements-analysis worker. Load .github/skills/requirements-analysis/SKILL.md, inspect the request and relevant project context, and return acceptance criteria and open questions without editing files.",
  "planning": "You are the planning worker. Load .github/skills/sdlc-planning/SKILL.md and return a sequenced, testable plan based on the requirements handoff without editing files.",
  "architecture": "You are the architecture worker. Load .github/skills/architecture-design/SKILL.md and return the smallest sound architecture decision set without editing files.",
  "design": "You are the design worker. Load .github/skills/solution-design/SKILL.md and return implementation-ready behavior, interface, and edge-case details without editing files.",
  "implementation": "You are the implementation worker. Load .github/skills/implementation/SKILL.md, follow the approved handoffs, make focused changes, and run relevant checks.",
  "code-review": "You are the independent code-review worker. Load .github/skills/code-review/SKILL.md and report actionable findings; do not edit files.",
  "pr-creation": "You are the PR worker. Load .github/skills/pr-creation/SKILL.md, verify review passed, and never publish unrelated or uncommitted user changes.",
  "orchestrator": "You are the SDLC orchestrator. Load .github/skills/sdlc-workflow/SKILL.md, run the specialist workers sequentially, capture and validate each handoff, and pass it to the next stage."
};

if (!Object.prototype.hasOwnProperty.call(messages, stage)) {
  process.stderr.write(`Unknown SDLC hook stage: ${stage || "(missing)"}\n`);
  process.exitCode = 2;
} else {
  process.stdout.write(`${JSON.stringify({ systemMessage: messages[stage] })}\n`);
}
