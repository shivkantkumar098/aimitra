#!/usr/bin/env node
'use strict';
// CLI for workflow state. Used by the SDLC Orchestrator; every approval needs the human's verbatim decision text.
//   node scripts/sdlc/sdlc.js <command> [stage] [--key ISSUE-1] [options]

const path = require('path');
const { execFileSync } = require('child_process');
const wf = require('./lib/workflow');
const { Store } = require('./lib/store');
const { STAGES, STAGE_IDS } = require('./lib/stages');
const { validateBranch, suggestBranch } = require('./lib/branch');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[k] = true;
      else { out[k] = next; i += 1; }
    } else out._.push(a);
  }
  return out;
}

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) {
    return path.resolve(__dirname, '..', '..');
  }
}

function list(v) {
  return v && v !== true ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function resolveKey(store, args) {
  if (args.key && args.key !== true) return args.key;
  const active = store.activeRuns();
  if (active.length === 1) return active[0].issueKey;
  if (active.length === 0) throw new wf.WorkflowError('NO_RUN', 'No ACTIVE run found. Pass --key or run "init".');
  throw new wf.WorkflowError('AMBIGUOUS', `Several ACTIVE runs (${active.map((r) => r.issueKey).join(', ')}); pass --key.`);
}

function needStage(args) {
  const id = args._[1];
  if (!STAGE_IDS.includes(id)) throw new wf.WorkflowError('UNKNOWN_STAGE', `Stage must be one of: ${STAGE_IDS.join(', ')}`);
  return id;
}

function printStatus(state) {
  const lines = [`Run ${state.runId}  issue=${state.issueKey}  source=${state.source.type}  status=${state.status}`];
  for (const row of wf.summary(state)) {
    lines.push(`${row.order}. ${row.stage.padEnd(15)} ${row.status.padEnd(18)} ${row.agent}${row.approvedBy ? `  approved-by=${row.approvedBy}` : ''}${row.blocker ? `  BLOCKED: ${row.blocker}` : ''}`);
  }
  if (state.commit) lines.push(`commit: ${state.commit.sha}`);
  if (state.branch) lines.push(`branch: ${state.branch} -> base ${state.baseBranch}`);
  if (state.pr) lines.push(`pr: ${state.pr.url} (merged=${state.pr.merged})`);
  return lines.join('\n');
}

function main(argv, rootOverride) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  const store = new Store(rootOverride || repoRoot());
  const need = (name) => {
    if (!args[name] || args[name] === true) throw new wf.WorkflowError('INVALID_INPUT', `--${name} is required`);
    return String(args[name]);
  };

  switch (cmd) {
    case 'init': {
      const key = need('key');
      const state = store.init(key, { sourceType: need('source'), sourceUrl: args['source-url'] && args['source-url'] !== true ? args['source-url'] : null });
      return `Initialised ${state.runId}\n${printStatus(state)}`;
    }
    case 'status': {
      const key = resolveKey(store, args);
      return printStatus(store.load(key));
    }
    case 'start': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.start(s, id, env));
      return `Stage ${id} IN_PROGRESS (agent: ${STAGES.find((x) => x.id === id).agent}).`;
    }
    case 'submit': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.submit(s, id, { files: list(args.files), evidence: list(args.evidence) }, env));
      return `Stage ${id} AWAITING_APPROVAL. Present it to the human; do not proceed until they respond.`;
    }
    case 'approve': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.approve(s, id, { by: need('by'), decisionText: need('text') }, env));
      return `Stage ${id} APPROVED (recorded decision: "${args.text}").`;
    }
    case 'changes': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.requestChanges(s, id, { notes: need('notes') }, env));
      return `Stage ${id} CHANGES_REQUESTED.`;
    }
    case 'reject': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.reject(s, id, { reason: need('reason') }, env));
      return `Stage ${id} REJECTED. Run HALTED; downstream stages cannot start.`;
    }
    case 'block': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.block(s, id, { reason: need('reason') }, env));
      return `Stage ${id} BLOCKED.`;
    }
    case 'unblock': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.unblock(s, id, env));
      return `Stage ${id} unblocked (CHANGES_REQUESTED).`;
    }
    case 'reopen': {
      const id = needStage(args); const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.reopen(s, id, { reason: need('reason') }, env));
      return `Stage ${id} reopened; later stages marked STALE and need fresh approval.`;
    }
    case 'verify': {
      const key = resolveKey(store, args);
      const stale = store.mutate(key, (s, env) => ({ stale: wf.verifyFreshness(s, env) })).stale;
      return stale.length ? `STALE: ${stale.map((x) => `${x.stage} (${x.files.join(', ')})`).join('; ')}` : 'All approved artifacts are unchanged.';
    }
    case 'can-publish': {
      const key = resolveKey(store, args);
      const r = wf.canPublish(store.load(key), store.env(key));
      if (!r.ok) { const e = new wf.WorkflowError('PUBLISH_BLOCKED', `Publishing is NOT allowed:\n - ${r.reasons.join('\n - ')}`); throw e; }
      return 'Publishing allowed: final human approval is recorded and all artifacts are unchanged.';
    }
    case 'record-commit': {
      const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.recordCommit(s, { sha: need('sha'), message: need('message') }, env));
      return 'Commit recorded.';
    }
    case 'record-pr': {
      const key = resolveKey(store, args);
      store.mutate(key, (s, env) => wf.recordPr(s, { url: need('url') }, env));
      return 'PR recorded. Run COMPLETE. This workflow never merges.';
    }
    case 'suggest-branch': {
      return suggestBranch(resolveKey(store, args), need('name'));
    }
    case 'check-branch': {
      const key = resolveKey(store, args);
      const branch = args.branch && args.branch !== true ? String(args.branch) : store.currentBranch();
      const v = validateBranch(branch, key);
      if (!v.ok) throw new wf.WorkflowError('BRANCH', `Branch "${branch}" is not allowed: ${v.reason}`);
      return `Branch "${branch}" follows the ${key}/<feature-name> convention.`;
    }
    case 'summary': {
      const key = resolveKey(store, args);
      return JSON.stringify(wf.summary(store.load(key)), null, 2);
    }
    default:
      throw new wf.WorkflowError('USAGE', 'Commands: init status start submit approve changes reject block unblock reopen verify can-publish record-commit record-pr suggest-branch check-branch summary');
  }
}

if (require.main === module) {
  try {
    process.stdout.write(`${main(process.argv.slice(2))}\n`);
  } catch (e) {
    process.stderr.write(`${e.code || 'ERROR'}: ${e.message}\n`);
    process.exitCode = e instanceof wf.WorkflowError ? 1 : 3;
  }
}

module.exports = { main, parseArgs };
