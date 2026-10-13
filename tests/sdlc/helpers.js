'use strict';
// Builds artifact text that satisfies each stage contract (test fixtures only).
const { STAGES } = require('../../scripts/sdlc/lib/stages');

const SECTION_TITLES = {
  'requirements.md': ['Jira issue key and source link', 'Problem statement and business objective', 'Functional requirements', 'Non-functional requirements', 'Acceptance criteria', 'Positive and negative scenarios', 'Validation and error-handling requirements', 'Security requirements', 'Assumptions, dependencies, and out-of-scope items', 'Unresolved questions'],
  'architecture.md': ['Context and goals', 'Component architecture', 'Data flow', 'Component responsibilities', 'Integration boundaries', 'Error handling', 'Security considerations', 'Technology decisions and alternatives', 'Testing strategy'],
  'implementation-summary.md': ['Files changed', 'Tasks completed', 'Decisions', 'Deviations from plan', 'Checks run'],
  'code-review.md': ['Review outcome'],
  'verification-report.md': ['Requirement-to-test traceability', 'Commands executed', 'Test results', 'Documentation consistency', 'Unexecuted checks', 'Known limitations', 'Final verification status'],
  'pr-draft.md': ['Proposed commit message', 'Summary', 'Jira Reference', 'Changes Made', 'Agent Execution Summary', 'Test Evidence', 'Documentation Sync Results', 'Known Limitations', 'Human Approval Record', 'Reviewer Checklist'],
};

function fullArtifact(name) {
  if (name === 'impl-plan.md') {
    return '# Plan\n\n| Task ID | Dependencies | Expected files or components | Acceptance criteria | Validation steps |\n|---|---|---|---|---|\n| T1 | none | a.py | works | run tests |\n\nBlocked tasks and blockers: none\n';
  }
  if (name === 'design-review.md') {
    return '# Design review\n\n| Finding ID | Severity | Description | Impact | Recommendation | Resolution status |\n|---|---|---|---|---|---|\n| DR-1 | Low | d | i | r | Resolved |\n';
  }
  if (name === 'code-review.md') {
    return '# Code review\n\n| Severity | Location | Evidence | Recommended fix | Status |\n|---|---|---|---|---|\n| Low | a.py:1 | e | f | Open |\n\n## Review outcome\nPASS_PENDING_HUMAN\n';
  }
  const titles = SECTION_TITLES[name];
  if (!titles) return `# ${name}\ncontent\n`;
  let body = `# ${name}\n\n`;
  for (const t of titles) body += `## ${t}\ncontent for ${t}\n\n`;
  if (name === 'architecture.md') body += '```mermaid\nflowchart TD\n A-->B\n```\n';
  return body;
}

const ALL_ARTIFACTS = [...new Set(STAGES.flatMap((s) => s.artifacts))];

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) {
      v = v.slice(1, -1).split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else if (/^(true|false)$/.test(v)) v = v === 'true';
    else v = v.replace(/^['"]|['"]$/g, '');
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

function mkRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-test-'));
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' });
  checkoutBranch(root, 'main');
  return root;
}

function checkoutBranch(root, name) {
  execFileSync('git', ['symbolic-ref', 'HEAD', `refs/heads/${name}`], { cwd: root, stdio: 'ignore' });
}

function writeFile(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

// Drives a real (temp-dir) run through every stage with the CLI. SIMULATED: no Jira, GitHub or Git is touched.
function driveRun(main, root, key, { upTo = 'pr_creation', finalApprove = true } = {}) {
  main(['init', '--key', key, '--source', 'pasted'], root);
  writeFile(root, 'backend/feature.py', 'print(1)\n');
  for (const st of STAGES) {
    if (st.id === 'implementation') checkoutBranch(root, `${key}/test-feature`);
    main(['start', st.id, '--key', key], root);
    for (const a of st.artifacts) writeFile(root, `docs/sdlc/${key}/${a}`, fullArtifact(a));
    main(['submit', st.id, '--key', key, ...(st.id === 'implementation' ? ['--files', 'backend/feature.py'] : [])], root);
    if (st.id === upTo && !finalApprove) return;
    main(['approve', st.id, '--key', key, '--by', 'tester', '--text', `approved ${st.id}`], root);
    if (st.id === upTo) return;
  }
}

module.exports = { fullArtifact, ALL_ARTIFACTS, parseFrontmatter, mkRoot, checkoutBranch, writeFile, driveRun };
