'use strict';
// Unit tests for the workflow state machine. These use an in-memory fake file system: SIMULATED, no Jira/GitHub/Git involved.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const wf = require('../../scripts/sdlc/lib/workflow');
const { STAGES } = require('../../scripts/sdlc/lib/stages');
const { fullArtifact } = require('./helpers');

function makeEnv(files, branch = 'TEST-1/feature-x') {
  let tick = 0;
  const env = {
    files,
    branch,
    currentBranch: () => env.branch,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)).toISOString(),
    artifactPath: (n) => `docs/sdlc/TEST-1/${n}`,
    hashPath: (p) => (p in files ? crypto.createHash('sha256').update(files[p]).digest('hex') : null),
    readText: (p) => (p in files ? files[p] : null),
  };
  return env;
}

function newRun(extra = {}) {
  const files = {};
  const env = makeEnv(files);
  const state = wf.createRun({ issueKey: 'TEST-1', sourceType: 'pasted', runId: 'run-1' }, env);
  return { files, env, state, ...extra };
}

function writeArtifacts(ctx, stage) {
  for (const a of stage.artifacts) ctx.files[ctx.env.artifactPath(a)] = fullArtifact(a);
}

function runStageToApproval(ctx, id, opts = {}) {
  const def = STAGES.find((s) => s.id === id);
  wf.start(ctx.state, id, ctx.env);
  writeArtifacts(ctx, def);
  wf.submit(ctx.state, id, opts, ctx.env);
  wf.approve(ctx.state, id, { by: 'tester', decisionText: 'approved' }, ctx.env);
}

test('stage order is enforced: cannot start planning before requirements are approved', () => {
  const ctx = newRun();
  assert.throws(() => wf.start(ctx.state, 'planning', ctx.env), (e) => e.code === 'STAGE_ORDER');
});

test('worker completion is not approval: a submitted stage stays AWAITING_APPROVAL and blocks downstream', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  writeArtifacts(ctx, STAGES[0]);
  wf.submit(ctx.state, 'requirements', {}, ctx.env);
  assert.equal(ctx.state.stages.requirements.status, 'AWAITING_APPROVAL');
  assert.throws(() => wf.start(ctx.state, 'planning', ctx.env), (e) => e.code === 'STAGE_ORDER');
});

test('approval needs the approver name and verbatim human decision text', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  writeArtifacts(ctx, STAGES[0]);
  wf.submit(ctx.state, 'requirements', {}, ctx.env);
  assert.throws(() => wf.approve(ctx.state, 'requirements', { by: '', decisionText: 'ok' }, ctx.env), (e) => e.code === 'APPROVAL_MISSING');
  assert.throws(() => wf.approve(ctx.state, 'requirements', { by: 'a', decisionText: '' }, ctx.env), (e) => e.code === 'APPROVAL_MISSING');
  assert.equal(ctx.state.stages.requirements.status, 'AWAITING_APPROVAL');
});

test('a stage that was never submitted cannot be approved', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  assert.throws(() => wf.approve(ctx.state, 'requirements', { by: 'a', decisionText: 'ok' }, ctx.env), (e) => e.code === 'INVALID_TRANSITION');
});

test('submit fails when the artifact does not satisfy its handoff contract', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  ctx.files['docs/sdlc/TEST-1/requirements.md'] = '# Requirements\n\n## Acceptance criteria\n- x\n';
  assert.throws(() => wf.submit(ctx.state, 'requirements', {}, ctx.env), (e) => e.code === 'CONTRACT' && /Security requirements/.test(e.message));
  assert.equal(ctx.state.stages.requirements.status, 'IN_PROGRESS');
});

test('submit fails when a required section is present but empty', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  ctx.files['docs/sdlc/TEST-1/requirements.md'] = fullArtifact('requirements.md').replace(/(## Security requirements\n)[^#]*/, '$1\n');
  assert.throws(() => wf.submit(ctx.state, 'requirements', {}, ctx.env), (e) => e.code === 'CONTRACT' && /empty/.test(e.message));
});

test('submit fails when the artifact file is missing', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  assert.throws(() => wf.submit(ctx.state, 'requirements', {}, ctx.env), (e) => e.code === 'CONTRACT' && /not found/.test(e.message));
});

test('rejection halts the run and prevents any downstream stage from starting', () => {
  const ctx = newRun();
  runStageToApproval(ctx, 'requirements');
  wf.start(ctx.state, 'planning', ctx.env);
  writeArtifacts(ctx, STAGES[1]);
  wf.submit(ctx.state, 'planning', {}, ctx.env);
  wf.reject(ctx.state, 'planning', { reason: 'plan misses security tasks' }, ctx.env);
  assert.equal(ctx.state.status, 'HALTED');
  assert.throws(() => wf.start(ctx.state, 'architecture', ctx.env), (e) => e.code === 'RUN_HALTED');
  assert.throws(() => wf.approve(ctx.state, 'planning', { by: 'a', decisionText: 'ok' }, ctx.env), (e) => e.code === 'RUN_HALTED');
});

test('worker failure marks the stage BLOCKED with a recorded blocker and stops progress', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  wf.block(ctx.state, 'requirements', { reason: 'Jira MCP unavailable: tool list empty' }, ctx.env);
  assert.equal(ctx.state.stages.requirements.status, 'BLOCKED');
  assert.equal(ctx.state.stages.requirements.blocker, 'Jira MCP unavailable: tool list empty');
  assert.throws(() => wf.start(ctx.state, 'planning', ctx.env), (e) => e.code === 'STAGE_ORDER');
  wf.unblock(ctx.state, 'requirements', ctx.env);
  assert.equal(ctx.state.stages.requirements.status, 'CHANGES_REQUESTED');
  wf.start(ctx.state, 'requirements', ctx.env);
  assert.throws(() => wf.block(ctx.state, 'requirements', { reason: '' }, ctx.env), (e) => e.code === 'INVALID_INPUT');
});

test('changes requested loops back to the same stage and requires fresh approval', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  writeArtifacts(ctx, STAGES[0]);
  wf.submit(ctx.state, 'requirements', {}, ctx.env);
  wf.requestChanges(ctx.state, 'requirements', { notes: 'clarify scope' }, ctx.env);
  assert.equal(ctx.state.stages.requirements.status, 'CHANGES_REQUESTED');
  wf.start(ctx.state, 'requirements', ctx.env);
  assert.equal(ctx.state.stages.requirements.attempts, 2);
  assert.equal(ctx.state.stages.requirements.approval, null);
});

test('an artifact changed after submission cannot be approved (no stale approval)', () => {
  const ctx = newRun();
  wf.start(ctx.state, 'requirements', ctx.env);
  writeArtifacts(ctx, STAGES[0]);
  wf.submit(ctx.state, 'requirements', {}, ctx.env);
  ctx.files['docs/sdlc/TEST-1/requirements.md'] += '\nextra line after submit\n';
  assert.throws(() => wf.approve(ctx.state, 'requirements', { by: 'a', decisionText: 'ok' }, ctx.env), (e) => e.code === 'STALE');
});

test('modifying an approved artifact marks that stage and all later stages STALE', () => {
  const ctx = newRun();
  runStageToApproval(ctx, 'requirements');
  runStageToApproval(ctx, 'planning');
  ctx.files['docs/sdlc/TEST-1/requirements.md'] += '\nnew requirement\n';
  const stale = wf.verifyFreshness(ctx.state, ctx.env);
  assert.deepEqual(stale.map((s) => s.stage), ['requirements']);
  assert.equal(ctx.state.stages.requirements.status, 'STALE');
  assert.equal(ctx.state.stages.planning.status, 'STALE');
  assert.equal(ctx.state.stages.planning.approval, null);
  assert.throws(() => wf.start(ctx.state, 'architecture', ctx.env), (e) => e.code === 'STAGE_ORDER');
});

test('reopening an approved stage invalidates downstream approvals', () => {
  const ctx = newRun();
  runStageToApproval(ctx, 'requirements');
  runStageToApproval(ctx, 'planning');
  wf.reopen(ctx.state, 'requirements', { reason: 'new Jira comment' }, ctx.env);
  assert.equal(ctx.state.stages.planning.status, 'STALE');
});

test('design review may revise architecture.md; the revision is baselined only through the design_review approval', () => {
  const ctx = newRun();
  for (const id of ['requirements', 'planning', 'architecture']) runStageToApproval(ctx, id);
  const archPath = 'docs/sdlc/TEST-1/architecture.md';
  const before = ctx.state.stages.architecture.approvedHashes[archPath];
  wf.start(ctx.state, 'design_review', ctx.env);
  writeArtifacts(ctx, STAGES[3]);
  ctx.files[archPath] += '\n## Addendum\nResolved DR-1.\n';
  wf.submit(ctx.state, 'design_review', {}, ctx.env);
  assert.notEqual(ctx.state.stages.architecture.approvedHashes[archPath], before);
  assert.ok(ctx.state.events.some((e) => e.type === 'REBASELINE_PROPOSED'));
  wf.approve(ctx.state, 'design_review', { by: 'tester', decisionText: 'approved final design' }, ctx.env);
  assert.deepEqual(wf.verifyFreshness(ctx.state, ctx.env), []);
});

function approveThroughVerification(ctx) {
  for (const id of ['requirements', 'planning', 'architecture', 'design_review']) runStageToApproval(ctx, id);
  ctx.files['backend/feature.py'] = 'print(1)\n';
  runStageToApproval(ctx, 'implementation', { files: ['backend/feature.py'] });
  runStageToApproval(ctx, 'code_review');
  runStageToApproval(ctx, 'verification');
}

test('code review fixes to implementation files are re-baselined and tracked through later stages', () => {
  const ctx = newRun();
  for (const id of ['requirements', 'planning', 'architecture', 'design_review']) runStageToApproval(ctx, id);
  ctx.files['backend/feature.py'] = 'print(1)\n';
  runStageToApproval(ctx, 'implementation', { files: ['backend/feature.py'] });
  wf.start(ctx.state, 'code_review', ctx.env);
  writeArtifacts(ctx, STAGES[5]);
  ctx.files['backend/feature.py'] = 'print(2)\n';
  wf.submit(ctx.state, 'code_review', {}, ctx.env);
  wf.approve(ctx.state, 'code_review', { by: 't', decisionText: 'ok' }, ctx.env);
  assert.deepEqual(wf.verifyFreshness(ctx.state, ctx.env), []);
  ctx.files['backend/feature.py'] = 'print(3)\n';
  const stale = wf.verifyFreshness(ctx.state, ctx.env);
  assert.ok(stale.some((s) => s.stage === 'implementation'));
});

test('publishing is impossible before every stage including the final PR stage is approved', () => {
  const ctx = newRun();
  assert.equal(wf.canPublish(ctx.state, ctx.env).ok, false);
  approveThroughVerification(ctx);
  wf.start(ctx.state, 'pr_creation', ctx.env);
  writeArtifacts(ctx, STAGES[7]);
  wf.submit(ctx.state, 'pr_creation', {}, ctx.env);
  const gate = wf.canPublish(ctx.state, ctx.env);
  assert.equal(gate.ok, false);
  assert.ok(gate.reasons.some((r) => /pr_creation is AWAITING_APPROVAL/.test(r)));
  assert.throws(() => wf.recordPr(ctx.state, { url: 'https://github.com/o/r/pull/1' }, ctx.env), (e) => e.code === 'PUBLISH_BLOCKED');
  assert.equal(ctx.state.pr, null);
});

test('after final approval the PR can be recorded; PR URL must be real-shaped; nothing is merged', () => {
  const ctx = newRun();
  approveThroughVerification(ctx);
  wf.start(ctx.state, 'pr_creation', ctx.env);
  writeArtifacts(ctx, STAGES[7]);
  wf.submit(ctx.state, 'pr_creation', {}, ctx.env);
  wf.approve(ctx.state, 'pr_creation', { by: 'tester', decisionText: 'FINAL: create the PR' }, ctx.env);
  assert.equal(wf.canPublish(ctx.state, ctx.env).ok, true);
  assert.throws(() => wf.recordPr(ctx.state, { url: 'not-a-url' }, ctx.env), (e) => e.code === 'INVALID_INPUT');
  wf.recordPr(ctx.state, { url: 'https://github.com/o/r/pull/7' }, ctx.env);
  assert.equal(ctx.state.pr.merged, false);
  assert.equal(ctx.state.status, 'COMPLETE');
});

test('editing an implementation file after verification approval revokes publish permission', () => {
  const ctx = newRun();
  approveThroughVerification(ctx);
  wf.start(ctx.state, 'pr_creation', ctx.env);
  writeArtifacts(ctx, STAGES[7]);
  wf.submit(ctx.state, 'pr_creation', {}, ctx.env);
  wf.approve(ctx.state, 'pr_creation', { by: 't', decisionText: 'final ok' }, ctx.env);
  ctx.files['backend/feature.py'] = 'print("tampered")\n';
  const gate = wf.canPublish(ctx.state, ctx.env);
  assert.equal(gate.ok, false);
  assert.ok(gate.reasons.some((r) => /backend\/feature\.py/.test(r)));
});

test('PR draft cannot be submitted if files changed after verification approval', () => {
  const ctx = newRun();
  approveThroughVerification(ctx);
  wf.start(ctx.state, 'pr_creation', ctx.env);
  writeArtifacts(ctx, STAGES[7]);
  ctx.files['backend/feature.py'] = 'print("changed after verification")\n';
  assert.throws(() => wf.submit(ctx.state, 'pr_creation', {}, ctx.env), (e) => e.code === 'STALE');
});

test('the workflow module exposes no merge operation', () => {
  const names = Object.keys(wf).concat(Object.keys(require('../../scripts/sdlc/lib/store')));
  assert.deepEqual(names.filter((n) => /merge/i.test(n)), []);
});

test('createRun validates source: a Jira source needs a URL; keys are validated', () => {
  const env = makeEnv({});
  assert.throws(() => wf.createRun({ issueKey: 'bad key', sourceType: 'pasted', runId: 'x' }, env), (e) => e.code === 'INVALID_INPUT');
  assert.throws(() => wf.createRun({ issueKey: 'AB-1', sourceType: 'jira', runId: 'x' }, env), (e) => e.code === 'INVALID_INPUT');
  assert.throws(() => wf.createRun({ issueKey: 'AB-1', sourceType: 'mock', runId: 'x' }, env), (e) => e.code === 'INVALID_INPUT');
});

test('commit SHA must be a real hex id and pr_creation must have started', () => {
  const ctx = newRun();
  assert.throws(() => wf.recordCommit(ctx.state, { sha: 'abc1234', message: 'm' }, ctx.env), (e) => e.code === 'STAGE_ORDER');
  approveThroughVerification(ctx);
  wf.start(ctx.state, 'pr_creation', ctx.env);
  assert.throws(() => wf.recordCommit(ctx.state, { sha: 'not-a-sha', message: 'm' }, ctx.env), (e) => e.code === 'INVALID_INPUT');
  wf.recordCommit(ctx.state, { sha: 'abc1234', message: 'feat: x' }, ctx.env);
  assert.equal(ctx.state.commit.sha, 'abc1234');
});

test('implementation cannot start on main or on a branch that breaks the <KEY>/<feature-name> convention', () => {
  for (const bad of ['main', 'master', 'feat/other', 'OTHER-9/some-feature', 'TEST-1/Bad_Name', 'TEST-1/ab', null]) {
    const ctx = newRun();
    for (const id of ['requirements', 'planning', 'architecture', 'design_review']) runStageToApproval(ctx, id);
    ctx.env.branch = bad;
    assert.throws(() => wf.start(ctx.state, 'implementation', ctx.env), (e) => e.code === 'BRANCH', String(bad));
    assert.equal(ctx.state.branch, null);
  }
});

test('the feature branch is recorded at implementation start and later stages must stay on it', () => {
  const ctx = newRun();
  for (const id of ['requirements', 'planning', 'architecture', 'design_review']) runStageToApproval(ctx, id);
  ctx.files['backend/feature.py'] = 'print(1)\n';
  runStageToApproval(ctx, 'implementation', { files: ['backend/feature.py'] });
  assert.equal(ctx.state.branch, 'TEST-1/feature-x');
  assert.equal(ctx.state.baseBranch, 'main');
  ctx.env.branch = 'TEST-1/another-branch';
  assert.throws(() => wf.start(ctx.state, 'code_review', ctx.env), (e) => e.code === 'BRANCH');
  ctx.env.branch = 'main';
  assert.throws(() => wf.start(ctx.state, 'code_review', ctx.env), (e) => e.code === 'BRANCH');
});

test('publishing is refused if HEAD is no longer the recorded feature branch, and the PR record keeps head/base and merged=false', () => {
  const ctx = newRun();
  approveThroughVerification(ctx);
  wf.start(ctx.state, 'pr_creation', ctx.env);
  writeArtifacts(ctx, STAGES[7]);
  wf.submit(ctx.state, 'pr_creation', {}, ctx.env);
  wf.approve(ctx.state, 'pr_creation', { by: 't', decisionText: 'final ok' }, ctx.env);
  ctx.env.branch = 'main';
  const gate = wf.canPublish(ctx.state, ctx.env);
  assert.equal(gate.ok, false);
  assert.ok(gate.reasons.some((r) => /not the run's feature branch/.test(r)));
  ctx.env.branch = 'TEST-1/feature-x';
  wf.recordPr(ctx.state, { url: 'https://github.com/o/r/pull/3' }, ctx.env);
  assert.deepEqual([ctx.state.pr.head, ctx.state.pr.base, ctx.state.pr.merged], ['TEST-1/feature-x', 'main', false]);
});

test('branch naming helpers', () => {
  const b = require('../../scripts/sdlc/lib/branch');
  assert.equal(b.validateBranch('DOC-SYNC-001/documentation-sync', 'DOC-SYNC-001').ok, true);
  for (const bad of ['main', 'DOC-SYNC-001', 'DOC-SYNC-001/', 'doc-sync-001/x-y-z', 'DOC-SYNC-001/Has Space', 'DOC-SYNC-001/-lead', `DOC-SYNC-001/${'a'.repeat(51)}`]) {
    assert.equal(b.validateBranch(bad, 'DOC-SYNC-001').ok, false, bad);
  }
  assert.equal(b.suggestBranch('DOC-SYNC-001', 'Documentation Sync!'), 'DOC-SYNC-001/documentation-sync');
  assert.throws(() => b.suggestBranch('DOC-SYNC-001', '!!'), (e) => e.code === 'INVALID_INPUT');
  assert.deepEqual(b.parseRemoteUrl('https://github.com/shivkantkumar098/aimitra.git'), { owner: 'shivkantkumar098', repo: 'aimitra' });
  assert.deepEqual(b.parseRemoteUrl('git@github.com:shivkantkumar098/aimitra.git'), { owner: 'shivkantkumar098', repo: 'aimitra' });
  assert.equal(b.parseRemoteUrl('https://example.com/x/y'), null);
});
