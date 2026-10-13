'use strict';
// Single source of truth for the SDLC stage order, artifact contracts and agent ownership.
// Agents, docs and tests are all checked against this file (tests/sdlc/assets.test.js).

const heading = (name, pattern) => ({ name, pattern, kind: 'heading' });
const text = (name, pattern) => ({ name, pattern, kind: 'text' });

const STAGES = [
  {
    id: 'requirements',
    order: 1,
    agent: 'requirements-analysis-agent',
    skill: 'jira-requirements-analysis',
    artifacts: ['requirements.md'],
    contract: {
      'requirements.md': [
        heading('Jira issue key and source link', /jira issue|issue key|source link/i),
        heading('Problem statement and business objective', /problem statement/i),
        heading('Functional requirements', /^#+\s*(\d+[.)]?\s*)?functional requirements/im),
        heading('Non-functional requirements', /non-?functional requirements/i),
        heading('Acceptance criteria', /acceptance criteria/i),
        heading('Positive and negative scenarios', /positive and negative scenarios|scenarios/i),
        heading('Validation and error-handling requirements', /validation and error/i),
        heading('Security requirements', /security requirements/i),
        heading('Assumptions, dependencies, and out-of-scope items', /assumptions/i),
        heading('Unresolved questions', /unresolved questions/i),
      ],
    },
  },
  {
    id: 'planning',
    order: 2,
    agent: 'planning-agent',
    skill: 'sdlc-planning',
    artifacts: ['impl-plan.md'],
    contract: {
      'impl-plan.md': [
        text('Task ID', /task id/i),
        text('Dependencies', /dependenc/i),
        text('Expected files or components', /expected files|files or components|affected files/i),
        text('Acceptance criteria', /acceptance criteria|completion criteria/i),
        text('Validation steps', /validation/i),
        text('Blocked tasks and blockers', /blocked|blocker/i),
      ],
    },
  },
  {
    id: 'architecture',
    order: 3,
    agent: 'architecture-agent',
    skill: 'architecture-mermaid',
    artifacts: ['architecture.md'],
    contract: {
      'architecture.md': [
        heading('Context and goals', /context and goals/i),
        heading('Component architecture', /component architecture/i),
        text('Mermaid diagram', /```mermaid/i),
        heading('Data flow', /data flow/i),
        heading('Component responsibilities', /component responsibilities/i),
        heading('Integration boundaries', /integration boundaries/i),
        heading('Error handling', /error handling/i),
        heading('Security considerations', /security considerations/i),
        heading('Technology decisions and alternatives', /technology decisions|alternatives/i),
        heading('Testing strategy', /testing strategy/i),
      ],
    },
  },
  {
    id: 'design_review',
    order: 4,
    agent: 'design-review-agent',
    skill: 'design-review',
    artifacts: ['design-review.md', 'architecture.md'],
    rebases: ['architecture'],
    contract: {
      'design-review.md': [
        text('Finding ID', /finding id/i),
        text('Severity', /severity/i),
        text('Description', /description/i),
        text('Impact', /impact/i),
        text('Recommendation', /recommendation/i),
        text('Resolution status', /resolution status/i),
      ],
    },
  },
  {
    id: 'implementation',
    order: 5,
    startsFeatureBranch: true,
    agent: 'implementation-agent',
    skill: 'safe-implementation-doc-sync',
    artifacts: ['implementation-summary.md'],
    tracksFiles: true,
    contract: {
      'implementation-summary.md': [
        heading('Files changed', /files changed/i),
        heading('Tasks completed', /tasks? (completed|status)/i),
        heading('Decisions', /decisions/i),
        heading('Deviations from plan', /deviations/i),
        heading('Checks run', /checks run|test results|validation results/i),
      ],
    },
  },
  {
    id: 'code_review',
    requiresFeatureBranch: true,
    order: 6,
    agent: 'code-review-agent',
    skill: 'evidence-based-code-review',
    artifacts: ['code-review.md'],
    inheritsFilesFrom: 'implementation',
    rebases: ['implementation'],
    contract: {
      'code-review.md': [
        text('Severity', /severity/i),
        text('Affected file and location', /location|file/i),
        text('Evidence', /evidence/i),
        text('Recommended fix', /recommended fix|recommendation/i),
        text('Status', /status/i),
        heading('Review outcome', /review outcome|verdict/i),
      ],
    },
  },
  {
    id: 'verification',
    requiresFeatureBranch: true,
    order: 7,
    agent: 'verification-agent',
    skill: 'test-and-doc-verification',
    artifacts: ['verification-report.md'],
    inheritsFilesFrom: 'code_review',
    rebases: ['code_review', 'implementation'],
    contract: {
      'verification-report.md': [
        heading('Requirement-to-test traceability', /traceability/i),
        heading('Commands executed', /commands executed/i),
        heading('Test results', /test results|actual results/i),
        heading('Documentation consistency', /documentation consistency/i),
        heading('Unexecuted checks', /unexecuted|not run/i),
        heading('Known limitations', /known limitations/i),
        heading('Final verification status', /final verification status/i),
      ],
    },
  },
  {
    id: 'pr_creation',
    requiresFeatureBranch: true,
    order: 8,
    agent: 'pr-creation-agent',
    skill: 'commit-and-pr-preparation',
    artifacts: ['pr-draft.md'],
    inheritsFilesFrom: 'verification',
    freezeInheritedFiles: true,
    contract: {
      'pr-draft.md': [
        heading('Proposed commit message', /proposed commit message/i),
        heading('Summary', /^#+\s*(\d+[.)]?\s*)?summary/im),
        heading('Jira Reference', /jira reference/i),
        heading('Changes Made', /changes made/i),
        heading('Agent Execution Summary', /agent execution summary/i),
        heading('Test Evidence', /test evidence/i),
        heading('Documentation Sync Results', /documentation sync results/i),
        heading('Known Limitations', /known limitations/i),
        heading('Human Approval Record', /human approval record/i),
        heading('Reviewer Checklist', /reviewer checklist/i),
      ],
    },
  },
];

const WORKER_AGENTS = STAGES.map((s) => s.agent);
const ORCHESTRATOR = 'sdlc-orchestrator';
const STAGE_IDS = STAGES.map((s) => s.id);
const stageById = (id) => STAGES.find((s) => s.id === id);

module.exports = {
  STAGES,
  STAGE_IDS,
  WORKER_AGENTS,
  ORCHESTRATOR,
  stageById,
};
