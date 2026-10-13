'use strict';
// Pure state-machine for the Agentic SDLC workflow. No file-system access: callers inject `env`.
//   env.now()            -> ISO timestamp
//   env.hashPath(path)   -> sha256 hex of a repo-relative file, or null when it does not exist
//   env.readText(path)   -> file text, or null when it does not exist
//   env.artifactPath(n)  -> repo-relative path of artifact `n` for this run
//   env.currentBranch()  -> name of the checked-out Git branch, or null
// There is intentionally no merge function and no way to record a PR without a fresh final approval.

const { STAGES, stageById } = require('./stages');
const { validateBranch, BASE_BRANCH } = require('./branch');

class WorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
  }
}

const S = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
  STALE: 'STALE',
});
const RUN = Object.freeze({ ACTIVE: 'ACTIVE', HALTED: 'HALTED', COMPLETE: 'COMPLETE' });

const PR_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+$/;
const SHA = /^[0-9a-f]{7,40}$/i;

function newStage() {
  return {
    status: S.PENDING,
    attempts: 0,
    hashes: {},
    approvedHashes: {},
    approval: null,
    evidence: [],
    blocker: null,
    notes: null,
  };
}

function createRun({ issueKey, sourceType, sourceUrl = null, runId }, env) {
  if (!/^[A-Za-z][A-Za-z0-9_]*-[A-Za-z0-9-]+$/.test(issueKey || '')) {
    throw new WorkflowError('INVALID_INPUT', `Invalid issue key: ${issueKey}`);
  }
  if (!['jira', 'pasted'].includes(sourceType)) {
    throw new WorkflowError('INVALID_INPUT', 'sourceType must be "jira" (retrieved via Jira MCP) or "pasted"');
  }
  if (sourceType === 'jira' && !sourceUrl) {
    throw new WorkflowError('INVALID_INPUT', 'A Jira source requires the issue URL; use sourceType "pasted" if it was not retrieved from Jira');
  }
  const now = env.now();
  const state = {
    schemaVersion: 1,
    runId,
    issueKey,
    source: { type: sourceType, url: sourceUrl },
    status: RUN.ACTIVE,
    branch: null,
    baseBranch: BASE_BRANCH,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    stages: {},
    commit: null,
    pr: null,
    events: [],
  };
  for (const st of STAGES) state.stages[st.id] = newStage();
  log(state, env, 'RUN_CREATED', null, `${issueKey} (${sourceType})`);
  return state;
}

function log(state, env, type, stage, detail) {
  state.events.push({ at: env.now(), type, stage, detail: detail || null });
  state.updatedAt = env.now();
}

function getStage(state, id) {
  const def = stageById(id);
  if (!def) throw new WorkflowError('UNKNOWN_STAGE', `Unknown stage: ${id}`);
  return { def, st: state.stages[id] };
}

function assertActive(state) {
  if (state.status === RUN.HALTED) throw new WorkflowError('RUN_HALTED', 'Run is HALTED (a stage was rejected). Downstream execution is not allowed.');
  if (state.status === RUN.COMPLETE) throw new WorkflowError('RUN_COMPLETE', 'Run is COMPLETE.');
}

function previousStages(id) {
  const order = stageById(id).order;
  return STAGES.filter((s) => s.order < order);
}

function laterStages(id) {
  const order = stageById(id).order;
  return STAGES.filter((s) => s.order > order);
}

function markDownstreamStale(state, env, id, reason) {
  for (const d of laterStages(id)) {
    const st = state.stages[d.id];
    if ([S.APPROVED, S.AWAITING_APPROVAL, S.IN_PROGRESS].includes(st.status)) {
      st.status = S.STALE;
      st.approval = null;
      log(state, env, 'STAGE_STALE', d.id, reason);
    }
  }
}

function start(state, id, env) {
  assertActive(state);
  const { def, st } = getStage(state, id);
  for (const prev of previousStages(id)) {
    if (state.stages[prev.id].status !== S.APPROVED) {
      throw new WorkflowError('STAGE_ORDER', `Cannot start ${id}: prerequisite stage "${prev.id}" is ${state.stages[prev.id].status}, not APPROVED.`);
    }
  }
  if (![S.PENDING, S.CHANGES_REQUESTED, S.STALE].includes(st.status)) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot start ${id} from status ${st.status}.`);
  }
  if (def.startsFeatureBranch || def.requiresFeatureBranch) {
    const current = typeof env.currentBranch === 'function' ? env.currentBranch() : null;
    const v = validateBranch(current, state.issueKey);
    if (!v.ok) {
      throw new WorkflowError('BRANCH', `Cannot start ${id}: ${v.reason}. Create the feature branch first (git switch -c ${state.issueKey}/<feature-name>).`);
    }
    if (def.startsFeatureBranch && !state.branch) {
      state.branch = current;
      log(state, env, 'BRANCH_RECORDED', id, current);
    } else if (state.branch !== current) {
      throw new WorkflowError('BRANCH', `Cannot start ${id}: current branch "${current}" differs from the run's branch "${state.branch}".`);
    }
  }
  st.status = S.IN_PROGRESS;
  st.attempts += 1;
  st.approval = null;
  st.blocker = null;
  log(state, env, 'STAGE_STARTED', id, `agent=${def.agent} attempt=${st.attempts}`);
  return state;
}

function headingSection(textBody, pattern) {
  const lines = textBody.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(#{1,6})\s+(.*)$/.exec(lines[i]);
    if (!m || !pattern.test(lines[i])) continue;
    const level = m[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const n = /^(#{1,6})\s+/.exec(lines[j]);
      if (n && n[1].length <= level) break;
      body.push(lines[j]);
    }
    return body.join('\n');
  }
  return null;
}

function checkContract(def, env, artifactName, problems) {
  const rel = env.artifactPath(artifactName);
  const body = env.readText(rel);
  if (body === null) {
    problems.push(`${artifactName}: file not found at ${rel}`);
    return;
  }
  if (!body.trim()) {
    problems.push(`${artifactName}: file is empty`);
    return;
  }
  for (const req of def.contract[artifactName] || []) {
    if (req.kind === 'heading') {
      const section = headingSection(body, req.pattern);
      if (section === null) problems.push(`${artifactName}: missing section "${req.name}"`);
      else if (!section.trim()) problems.push(`${artifactName}: section "${req.name}" is empty`);
    } else if (!req.pattern.test(body)) {
      problems.push(`${artifactName}: missing required content "${req.name}"`);
    }
  }
}

function normalizeFiles(files) {
  return [...new Set((files || []).map((f) => String(f).replace(/\\/g, '/').replace(/^\.\//, '')))].sort();
}

function submit(state, id, { files = [], evidence = [] } = {}, env) {
  assertActive(state);
  const { def, st } = getStage(state, id);
  if (st.status !== S.IN_PROGRESS) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot submit ${id} from status ${st.status}; it must be IN_PROGRESS.`);
  }
  const problems = [];
  for (const name of def.artifacts) {
    if (def.contract[name]) checkContract(def, env, name, problems);
    else if (env.readText(env.artifactPath(name)) === null) problems.push(`${name}: file not found`);
  }
  if (problems.length) {
    throw new WorkflowError('CONTRACT', `Handoff contract not satisfied for ${id}:\n - ${problems.join('\n - ')}`);
  }

  let tracked = normalizeFiles(files);
  if (def.inheritsFilesFrom) {
    const parent = state.stages[def.inheritsFilesFrom];
    const inherited = Object.keys(parent.approvedHashes).filter((p) => !isArtifactPath(state, p, env));
    tracked = normalizeFiles([...inherited, ...tracked]);
    if (def.freezeInheritedFiles) {
      const changed = inherited.filter((p) => (env.hashPath(p) || 'ABSENT') !== parent.approvedHashes[p]);
      if (changed.length) {
        throw new WorkflowError('STALE', `Files changed since ${def.inheritsFilesFrom} was approved; verification must be repeated: ${changed.join(', ')}`);
      }
    }
  }
  if (!def.tracksFiles && !def.inheritsFilesFrom && tracked.length) {
    throw new WorkflowError('INVALID_INPUT', `Stage ${id} does not track source files.`);
  }

  const hashes = {};
  for (const name of def.artifacts) hashes[env.artifactPath(name)] = env.hashPath(env.artifactPath(name));
  for (const p of tracked) hashes[p] = env.hashPath(p) || 'ABSENT';

  for (const targetId of def.rebases || []) {
    const target = state.stages[targetId];
    for (const p of Object.keys(target.approvedHashes)) {
      if (p in hashes && target.approvedHashes[p] !== hashes[p]) {
        target.approvedHashes[p] = hashes[p];
        target.hashes[p] = hashes[p];
        log(state, env, 'REBASELINE_PROPOSED', targetId, `${p} revised by ${id}; takes effect only if ${id} is approved by the human`);
      }
    }
  }

  st.hashes = hashes;
  st.evidence = [...st.evidence, ...evidence.map((e) => ({ at: env.now(), attempt: st.attempts, text: String(e) }))];
  st.status = S.AWAITING_APPROVAL;
  log(state, env, 'STAGE_SUBMITTED', id, `${Object.keys(hashes).length} tracked file(s)`);
  return state;
}

function isArtifactPath(state, p, env) {
  const base = env.artifactPath('');
  return p.startsWith(base);
}

function approve(state, id, { by, decisionText }, env) {
  assertActive(state);
  const { st } = getStage(state, id);
  if (st.status !== S.AWAITING_APPROVAL) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot approve ${id} from status ${st.status}; it must be AWAITING_APPROVAL.`);
  }
  if (!by || !by.trim()) throw new WorkflowError('APPROVAL_MISSING', 'Approval requires the approver name (--by).');
  if (!decisionText || decisionText.trim().length < 2) {
    throw new WorkflowError('APPROVAL_MISSING', 'Approval requires the human\'s verbatim decision text (--text). Approval is never inferred.');
  }
  const stale = [];
  for (const [p, h] of Object.entries(st.hashes)) {
    if ((env.hashPath(p) || 'ABSENT') !== h) stale.push(p);
  }
  if (stale.length) {
    throw new WorkflowError('STALE', `Artifacts changed after submission; re-submit ${id} and ask the human again: ${stale.join(', ')}`);
  }
  st.status = S.APPROVED;
  st.approvedHashes = { ...st.hashes };
  st.approval = { by: by.trim(), decisionText: decisionText.trim(), at: env.now(), attempt: st.attempts };
  log(state, env, 'STAGE_APPROVED', id, `by ${by.trim()}`);
  return state;
}

function requestChanges(state, id, { notes }, env) {
  assertActive(state);
  const { st } = getStage(state, id);
  if (st.status !== S.AWAITING_APPROVAL) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot request changes on ${id} from status ${st.status}.`);
  }
  if (!notes || !notes.trim()) throw new WorkflowError('INVALID_INPUT', 'Change request requires notes.');
  st.status = S.CHANGES_REQUESTED;
  st.notes = notes.trim();
  log(state, env, 'CHANGES_REQUESTED', id, notes.trim());
  return state;
}

function reject(state, id, { reason }, env) {
  assertActive(state);
  const { st } = getStage(state, id);
  if (![S.AWAITING_APPROVAL, S.IN_PROGRESS].includes(st.status)) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot reject ${id} from status ${st.status}.`);
  }
  if (!reason || !reason.trim()) throw new WorkflowError('INVALID_INPUT', 'Rejection requires a reason.');
  st.status = S.REJECTED;
  st.notes = reason.trim();
  state.status = RUN.HALTED;
  log(state, env, 'STAGE_REJECTED', id, reason.trim());
  markDownstreamStale(state, env, id, `upstream ${id} rejected`);
  return state;
}

function block(state, id, { reason }, env) {
  assertActive(state);
  const { st } = getStage(state, id);
  if (![S.IN_PROGRESS, S.PENDING, S.AWAITING_APPROVAL].includes(st.status)) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot block ${id} from status ${st.status}.`);
  }
  if (!reason || !reason.trim()) throw new WorkflowError('INVALID_INPUT', 'Blocking requires a reason with evidence.');
  st.status = S.BLOCKED;
  st.blocker = reason.trim();
  log(state, env, 'STAGE_BLOCKED', id, reason.trim());
  return state;
}

function unblock(state, id, env) {
  assertActive(state);
  const { st } = getStage(state, id);
  if (st.status !== S.BLOCKED) throw new WorkflowError('INVALID_TRANSITION', `${id} is not BLOCKED.`);
  st.status = S.CHANGES_REQUESTED;
  st.notes = `Unblocked; previous blocker: ${st.blocker}`;
  st.blocker = null;
  log(state, env, 'STAGE_UNBLOCKED', id, null);
  return state;
}

function reopen(state, id, { reason }, env) {
  assertActive(state);
  const { st } = getStage(state, id);
  if (![S.APPROVED, S.STALE].includes(st.status)) {
    throw new WorkflowError('INVALID_TRANSITION', `Cannot reopen ${id} from status ${st.status}.`);
  }
  if (!reason || !reason.trim()) throw new WorkflowError('INVALID_INPUT', 'Reopening requires a reason.');
  st.status = S.CHANGES_REQUESTED;
  st.approval = null;
  st.notes = reason.trim();
  log(state, env, 'STAGE_REOPENED', id, reason.trim());
  markDownstreamStale(state, env, id, `upstream ${id} reopened`);
  return state;
}

function verifyFreshness(state, env) {
  const stale = [];
  for (const def of STAGES) {
    const st = state.stages[def.id];
    if (st.status !== S.APPROVED) continue;
    const changed = Object.entries(st.approvedHashes).filter(([p, h]) => (env.hashPath(p) || 'ABSENT') !== h).map(([p]) => p);
    if (changed.length) {
      st.status = S.STALE;
      st.approval = null;
      stale.push({ stage: def.id, files: changed });
      log(state, env, 'STAGE_STALE', def.id, `approved artifacts changed: ${changed.join(', ')}`);
      markDownstreamStale(state, env, def.id, `upstream ${def.id} became stale`);
    }
  }
  return stale;
}

function canPublish(state, env) {
  const reasons = [];
  if (state.status !== RUN.ACTIVE) reasons.push(`run status is ${state.status}`);
  const current = typeof env.currentBranch === 'function' ? env.currentBranch() : null;
  if (!state.branch) reasons.push('no feature branch is recorded for this run');
  else if (current !== state.branch) reasons.push(`current branch "${current}" is not the run's feature branch "${state.branch}"`);
  else if (!validateBranch(state.branch, state.issueKey).ok) reasons.push(`branch "${state.branch}" violates the naming convention`);
  for (const def of STAGES) {
    const st = state.stages[def.id];
    if (st.status !== S.APPROVED) reasons.push(`stage ${def.id} is ${st.status}, not APPROVED`);
    else if (!st.approval) reasons.push(`stage ${def.id} has no recorded human approval`);
    else {
      const changed = Object.entries(st.approvedHashes).filter(([p, h]) => (env.hashPath(p) || 'ABSENT') !== h).map(([p]) => p);
      if (changed.length) reasons.push(`stage ${def.id} artifacts changed since approval: ${changed.join(', ')}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

function recordCommit(state, { sha, message }, env) {
  assertActive(state);
  if (!SHA.test(sha || '')) throw new WorkflowError('INVALID_INPUT', 'Commit SHA must be a real hex object id.');
  if (!message || !message.trim()) throw new WorkflowError('INVALID_INPUT', 'Commit message required.');
  if (state.stages.pr_creation.status === S.PENDING) {
    throw new WorkflowError('STAGE_ORDER', 'pr_creation has not started; a commit cannot be recorded yet.');
  }
  state.commit = { sha, message: message.trim(), at: env.now() };
  log(state, env, 'COMMIT_RECORDED', 'pr_creation', sha);
  return state;
}

function recordPr(state, { url }, env) {
  assertActive(state);
  const gate = canPublish(state, env);
  if (!gate.ok) {
    throw new WorkflowError('PUBLISH_BLOCKED', `PR cannot be recorded without fresh final approval:\n - ${gate.reasons.join('\n - ')}`);
  }
  if (!PR_URL.test(url || '')) throw new WorkflowError('INVALID_INPUT', 'PR URL must be a real https://github.com/<owner>/<repo>/pull/<n> URL.');
  state.pr = { url, number: Number(url.split('/').pop()), head: state.branch, base: state.baseBranch, at: env.now(), merged: false };
  state.status = RUN.COMPLETE;
  log(state, env, 'PR_RECORDED', 'pr_creation', url);
  return state;
}

function summary(state) {
  return STAGES.map((def) => {
    const st = state.stages[def.id];
    return {
      order: def.order,
      stage: def.id,
      agent: def.agent,
      status: st.status,
      attempts: st.attempts,
      approvedBy: st.approval ? st.approval.by : null,
      approvedAt: st.approval ? st.approval.at : null,
      blocker: st.blocker,
    };
  });
}

module.exports = {
  WorkflowError,
  STATUS: S,
  RUN,
  createRun,
  start,
  submit,
  approve,
  requestChanges,
  reject,
  block,
  unblock,
  reopen,
  verifyFreshness,
  canPublish,
  recordCommit,
  recordPr,
  summary,
};
