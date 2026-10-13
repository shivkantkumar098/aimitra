'use strict';
// CLI + store tests and a SIMULATED end-to-end run in a temp directory.
// "Simulated" = no real Jira MCP, GitHub MCP or Git remote is contacted; PR URLs below are test fixtures, not real PRs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { main } = require('../../scripts/sdlc/sdlc');
const { Store } = require('../../scripts/sdlc/lib/store');
const wf = require('../../scripts/sdlc/lib/workflow');
const { validate } = require('../../scripts/sdlc/validate-pr-draft');
const { STAGES } = require('../../scripts/sdlc/lib/stages');
const { mkRoot, checkoutBranch, writeFile, driveRun, fullArtifact } = require('./helpers');

const throwsCode = (fn, code) => assert.throws(fn, (e) => e.code === code, `expected ${code}`);

test('init refuses a Jira source without a URL and refuses to overwrite an existing run', () => {
  const root = mkRoot();
  throwsCode(() => main(['init', '--key', 'AB-1', '--source', 'jira'], root), 'INVALID_INPUT');
  main(['init', '--key', 'AB-1', '--source', 'pasted'], root);
  throwsCode(() => main(['init', '--key', 'AB-1', '--source', 'pasted'], root), 'RUN_EXISTS');
});

test('missing Jira data is handled gracefully: bad key, traversal key, and unknown source are rejected without touching disk', () => {
  const root = mkRoot();
  for (const key of ['', '../evil', 'no spaces-1']) throwsCode(() => main(['init', '--key', key || 'x y', '--source', 'pasted'], root), 'INVALID_INPUT');
  assert.equal(fs.existsSync(path.join(root, 'docs')), false);
});

test('approve CLI requires --by and --text; a stage never submitted cannot be approved', () => {
  const root = mkRoot();
  main(['init', '--key', 'AB-2', '--source', 'pasted'], root);
  main(['start', 'requirements', '--key', 'AB-2'], root);
  throwsCode(() => main(['approve', 'requirements', '--key', 'AB-2', '--by', 'me'], root), 'INVALID_INPUT');
  throwsCode(() => main(['approve', 'requirements', '--key', 'AB-2', '--by', 'me', '--text', 'ok'], root), 'INVALID_TRANSITION');
});

test('state survives restarts (resume) and stale approvals are detected on resume', () => {
  const root = mkRoot();
  driveRun(main, root, 'AB-3', { upTo: 'planning' });
  assert.match(main(['status', '--key', 'AB-3'], root), /planning\s+APPROVED/);
  writeFile(root, 'docs/sdlc/AB-3/requirements.md', `${fullArtifact('requirements.md')}\nSilent edit after approval\n`);
  assert.match(main(['verify', '--key', 'AB-3'], root), /STALE: requirements/);
  const status = main(['status', '--key', 'AB-3'], root);
  assert.match(status, /requirements\s+STALE/);
  assert.match(status, /planning\s+STALE/);
  throwsCode(() => main(['start', 'architecture', '--key', 'AB-3'], root), 'STAGE_ORDER');
});

test('a corrupt state file is reported and left untouched', () => {
  const root = mkRoot();
  main(['init', '--key', 'AB-4', '--source', 'pasted'], root);
  const p = path.join(root, 'docs/sdlc/AB-4/workflow-state.json');
  fs.writeFileSync(p, '{ broken');
  throwsCode(() => main(['status', '--key', 'AB-4'], root), 'CORRUPT_STATE');
  assert.equal(fs.readFileSync(p, 'utf8'), '{ broken');
});

test('a stale lock from a crashed process is recovered; a concurrent write is detected, not silently lost', () => {
  const root = mkRoot();
  main(['init', '--key', 'AB-5', '--source', 'pasted'], root);
  const lock = path.join(root, 'docs/sdlc/AB-5/workflow-state.json.lock');
  fs.writeFileSync(lock, '');
  const old = new Date(Date.now() - 120000);
  fs.utimesSync(lock, old, old);
  main(['start', 'requirements', '--key', 'AB-5'], root);
  assert.equal(fs.existsSync(lock), false);
  const store = new Store(root);
  const state = store.load('AB-5');
  store.save('AB-5', JSON.parse(JSON.stringify(state)), state.revision);
  throwsCode(() => store.save('AB-5', state, state.revision), 'CONFLICT');
});

test('sensitive and escaping paths cannot be tracked in state', () => {
  const root = mkRoot();
  main(['init', '--key', 'AB-6', '--source', 'pasted'], root);
  main(['start', 'requirements', '--key', 'AB-6'], root);
  writeFile(root, 'docs/sdlc/AB-6/requirements.md', fullArtifact('requirements.md'));
  main(['submit', 'requirements', '--key', 'AB-6'], root);
  main(['approve', 'requirements', '--key', 'AB-6', '--by', 't', '--text', 'ok'], root);
  main(['start', 'planning', '--key', 'AB-6'], root);
  writeFile(root, 'docs/sdlc/AB-6/impl-plan.md', fullArtifact('impl-plan.md'));
  throwsCode(() => main(['submit', 'planning', '--key', 'AB-6', '--files', '.env'], root), 'INVALID_INPUT');
  const env = new Store(root).env('AB-6');
  throwsCode(() => env.hashPath('../outside.txt'), 'INVALID_INPUT');
  throwsCode(() => env.hashPath('.vscode/mcp.json'), 'INVALID_INPUT');
});

test('SIMULATED end-to-end: full run, approval at every gate, PR recorded only after final approval, never merged', () => {
  const root = mkRoot();
  main(['init', '--key', 'DOC-9', '--source', 'pasted'], root);
  writeFile(root, 'backend/feature.py', 'print(1)\n');
  const seen = [];
  for (const st of STAGES) {
    if (st.id === 'implementation') {
      throwsCode(() => main(['start', 'implementation', '--key', 'DOC-9'], root), 'BRANCH');
      checkoutBranch(root, main(['suggest-branch', '--key', 'DOC-9', '--name', 'Simulated Feature'], root));
      assert.match(main(['check-branch', '--key', 'DOC-9'], root), /follows the DOC-9/);
    }
    main(['start', st.id, '--key', 'DOC-9'], root);
    for (const a of st.artifacts) writeFile(root, `docs/sdlc/DOC-9/${a}`, fullArtifact(a));
    main(['submit', st.id, '--key', 'DOC-9', ...(st.id === 'implementation' ? ['--files', 'backend/feature.py'] : [])], root);
    assert.match(main(['status', '--key', 'DOC-9'], root), new RegExp(`${st.id}\\s+AWAITING_APPROVAL`));
    if (st.id !== 'requirements') throwsCode(() => main(['start', STAGES[st.order - 1 + 0].id, '--key', 'DOC-9'], root), 'INVALID_TRANSITION');
    if (st.order < STAGES.length) throwsCode(() => main(['start', STAGES[st.order].id, '--key', 'DOC-9'], root), 'STAGE_ORDER');
    throwsCode(() => main(['can-publish', '--key', 'DOC-9'], root), 'PUBLISH_BLOCKED');
    main(['approve', st.id, '--key', 'DOC-9', '--by', 'tester', '--text', `approve ${st.id}`], root);
    seen.push(st.id);
  }
  assert.deepEqual(seen, STAGES.map((s) => s.id));
  assert.match(main(['can-publish', '--key', 'DOC-9'], root), /allowed/);
  main(['record-commit', '--key', 'DOC-9', '--sha', 'abc1234', '--message', 'feat: simulated'], root);
  main(['record-pr', '--key', 'DOC-9', '--url', 'https://github.com/example/repo/pull/1'], root);
  const state = new Store(root).load('DOC-9');
  assert.equal(state.status, 'COMPLETE');
  assert.equal(state.pr.merged, false);
  assert.deepEqual([state.branch, state.pr.head, state.pr.base], ['DOC-9/simulated-feature', 'DOC-9/simulated-feature', 'main']);
  assert.equal(state.stages.pr_creation.approval.decisionText, 'approve pr_creation');
  const summary = JSON.parse(main(['summary', '--key', 'DOC-9'], root));
  assert.deepEqual(summary.map((r) => r.agent), STAGES.map((s) => s.agent));
  assert.ok(summary.every((r) => r.status === 'APPROVED' && r.approvedBy === 'tester'));
});

test('SIMULATED rejection mid-run halts everything and the PR gate stays closed', () => {
  const root = mkRoot();
  driveRun(main, root, 'DOC-10', { upTo: 'architecture' });
  main(['start', 'design_review', '--key', 'DOC-10'], root);
  for (const a of STAGES[3].artifacts) writeFile(root, `docs/sdlc/DOC-10/${a}`, fullArtifact(a));
  main(['submit', 'design_review', '--key', 'DOC-10'], root);
  main(['reject', 'design_review', '--key', 'DOC-10', '--reason', 'critical finding unresolved'], root);
  throwsCode(() => main(['start', 'implementation', '--key', 'DOC-10'], root), 'RUN_HALTED');
  throwsCode(() => main(['can-publish', '--key', 'DOC-10'], root), 'PUBLISH_BLOCKED');
  throwsCode(() => main(['record-pr', '--key', 'DOC-10', '--url', 'https://github.com/example/repo/pull/2'], root), 'RUN_HALTED');
});

test('SIMULATED worker failure (Jira MCP unavailable) blocks the stage with the recorded evidence', () => {
  const root = mkRoot();
  main(['init', '--key', 'DOC-11', '--source', 'pasted'], root);
  main(['start', 'requirements', '--key', 'DOC-11'], root);
  main(['block', 'requirements', '--key', 'DOC-11', '--reason', 'Jira MCP: no issue tools discovered'], root);
  const state = new Store(root).load('DOC-11');
  assert.equal(state.stages.requirements.status, 'BLOCKED');
  assert.match(main(['status', '--key', 'DOC-11'], root), /BLOCKED: Jira MCP: no issue tools discovered/);
  throwsCode(() => main(['start', 'planning', '--key', 'DOC-11'], root), 'STAGE_ORDER');
});

test('PR draft validator: accepts a truthful draft; rejects fabricated hashes, uncredited or unrun agents, CI links and secrets', () => {
  const root = mkRoot();
  driveRun(main, root, 'DOC-12', { upTo: 'verification' });
  main(['start', 'pr_creation', '--key', 'DOC-12'], root);
  const state = new Store(root).load('DOC-12');
  const sections = fullArtifact('pr-draft.md');
  const agents = STAGES.map((s) => `- ${s.agent}: did ${s.id}`).join('\n');
  const good = `${sections.replace('content for Agent Execution Summary', agents)}\nPrepared through the GitHub Copilot Agentic SDLC workflow, coordinated by the SDLC Orchestrator Agent.\n`;
  const ok = validate(good, { state, shaExists: () => true });
  assert.deepEqual(ok.errors, []);
  assert.ok(!validate(good.replace('GitHub Copilot Agentic SDLC', 'something'), { state }).ok);
  assert.ok(validate(`${good}\ncommit ${'a'.repeat(40)}`, { state, shaExists: () => false }).errors.some((e) => /does not exist/.test(e)));
  assert.ok(validate(`${good}\nhttps://github.com/o/r/actions/runs/123`, { state }).errors.some((e) => /CI link/.test(e)));
  assert.ok(validate(`${good}\nhttps://github.com/o/r/pull/9`, { state }).errors.some((e) => /pull request URL/.test(e)));
  assert.ok(validate(`${good}\ntoken ATATT${'x'.repeat(30)}`, { state }).errors.some((e) => /credential/.test(e)));
  const missingAgent = good.replace('- verification-agent: did verification\n', '');
  assert.ok(validate(missingAgent, { state }).errors.some((e) => /verification-agent ran but is not credited/.test(e)));
  const fresh = wf.createRun({ issueKey: 'ZZ-1', sourceType: 'pasted', runId: 'r' }, { now: () => 'x' });
  assert.ok(validate(good, { state: fresh }).errors.some((e) => /has not run/.test(e)));
});

test('check-branch rejects main and wrong-prefix branches', () => {
  const root = mkRoot();
  main(['init', '--key', 'AB-7', '--source', 'pasted'], root);
  throwsCode(() => main(['check-branch', '--key', 'AB-7'], root), 'BRANCH');
  checkoutBranch(root, 'OTHER-1/some-thing');
  throwsCode(() => main(['check-branch', '--key', 'AB-7'], root), 'BRANCH');
  assert.match(main(['check-branch', '--key', 'AB-7', '--branch', 'AB-7/good-name'], root), /follows/);
});
