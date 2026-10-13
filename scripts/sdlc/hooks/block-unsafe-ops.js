#!/usr/bin/env node
'use strict';
// PreToolUse hook (blocking): enforces the workflow's hard rules at the tool boundary.
//  - never merges a PR; never force-pushes, pushes to main/master, or discards uncommitted work
//  - every change lives on <ISSUE-KEY>/<feature-name>; branch creation, commits, pushes and PRs must respect it
//  - pushes go to `origin` only; a PR must target origin's repo, head = the run's feature branch, base = main
//  - push / PR creation only when the active run has fresh human approval for every stage (canPublish)
//  - even then, publishing asks the human to confirm in the UI
//  - recording an approval via sdlc.js always asks the human to confirm in the UI
//  - workflow-state.json is script-managed and cannot be edited directly
// This hook never approves anything.
const path = require('path');
const { execFileSync } = require('child_process');
const { collectStrings, runBlockingHook } = require('../lib/hook-io');
const { Store } = require('../lib/store');
const wf = require('../lib/workflow');
const { validateBranch, parseRemoteUrl, BASE_BRANCH } = require('../lib/branch');

const TERMINAL_TOOL = /terminal|execute|bash|shell|powershell|run_?command|run_?in/i;
const EDIT_TOOL = /edit|write|create|replace|patch|insert|append/i;
const MERGE_TOOL = /merge/i;
const CREATE_PR_TOOL = /create[_-]?pull[_-]?request|create[_-]?pr\b/i;
const PUSH_TOOL = /push[_-]?files|create[_-]?or[_-]?update[_-]?file|create[_-]?branch|push/i;
const COMMAND_KEY = /^(command|cmd|script|commandline)$/i;

const CMD = {
  ghMerge: /\bgh\s+pr\s+merge\b|\bgh\s+api\b[^\n]*\/merge\b/i,
  forcePush: /\bgit\s+push\b[^\n]*(--force\b|--force-with-lease|(\s-f\b)|--delete\b|\s\+\S)/i,
  pushMain: /\bgit\s+push\b[^\n]*(\s|:|\/)(main|master)\b/i,
  push: /\bgit\s+push\b/i,
  ghPrCreate: /\bgh\s+pr\s+create\b/i,
  destructive: /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f[a-z]*|checkout\s+--(?=\s)|restore\s+(?:\.|--staged\s+\.|--source)|stash\s+(?:drop|clear)|branch\s+-D)(?=\s|$)/i,
  noVerify: /\bgit\s+(commit|push)\b[^\n]*--no-verify\b/i,
  commit: /\bgit\s+commit\b/i,
  newBranch: /\bgit\s+(?:checkout\s+-[bB]|switch\s+-[cC]|branch)\s+(?!-)([^\s;|&]+)/i,
  sdlcApprove: /scripts[\\/]sdlc[\\/]sdlc\.js\s+approve\b/i,
  sdlcRecordPr: /scripts[\\/]sdlc[\\/]sdlc\.js\s+record-pr\b/i,
  stateWrite: /workflow-state\.json/i,
  stateWriteVerb: />|\btee\b|\bsed\s+-i|\bset-content\b|\bout-file\b|\bremove-item\b|\brm\b|\bdel\b|\bmv\b|\bmove\b|\bcopy\b|\bcp\b|\badd-content\b/i,
};

function gitOut(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) {
    return null;
  }
}

function gitRoot(cwd) {
  return gitOut(cwd, ['rev-parse', '--show-toplevel']) || path.resolve(cwd);
}

function activeGate(root) {
  const store = new Store(root);
  const runs = store.activeRuns().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if (!runs.length) return { run: null, ok: false, reasons: ['no ACTIVE SDLC run exists'] };
  const run = runs[0];
  const gate = wf.canPublish(run, store.env(run.issueKey));
  return { run, ok: gate.ok, reasons: gate.reasons };
}

function publishDecision(root, what) {
  const g = activeGate(root);
  if (!g.ok) {
    return { decision: 'deny', reason: `Blocked by block-unsafe-ops: ${what} requires explicit FINAL human approval recorded in the SDLC workflow state. Not satisfied: ${g.reasons.slice(0, 4).join('; ')}.` };
  }
  return { decision: 'ask', run: g.run, reason: `Final confirmation: ${what} for run ${g.run.runId} (branch ${g.run.branch} to ${g.run.baseBranch}). Final approval is recorded; confirm you want to publish. Merging is never done by this workflow.` };
}

function pushDecision(root, cmd) {
  const base = publishDecision(root, 'pushing the feature branch');
  if (base.decision !== 'ask') return base;
  const args = cmd.replace(/^[\s\S]*?\bgit\s+push\b/i, '').split(/\s+/).filter((t) => t && !t.startsWith('-'));
  const remote = args[0] || 'origin';
  if (remote !== 'origin') return { decision: 'deny', reason: `Blocked by block-unsafe-ops: branches are pushed to "origin" only, not "${remote}".` };
  let dst = args[1] ? args[1].split(':').pop() : base.run.branch;
  if (dst === 'HEAD') dst = base.run.branch;
  if (dst !== base.run.branch) {
    return { decision: 'deny', reason: `Blocked by block-unsafe-ops: only the run's feature branch "${base.run.branch}" may be pushed, not "${dst}".` };
  }
  return base;
}

function prDecision(root, input, opts) {
  const base = publishDecision(root, 'creating the pull request');
  if (base.decision !== 'ask') return base;
  const f = {};
  for (const { key, value } of collectStrings(input.toolInput, '', [])) f[key.toLowerCase()] = value;
  const origin = opts.originRepo || parseRemoteUrl(gitOut(root, ['config', '--get', 'remote.origin.url']));
  const problems = [];
  if (!origin) problems.push('the origin repository could not be determined');
  else if (f.owner !== origin.owner || f.repo !== origin.repo) problems.push(`owner/repo must be ${origin.owner}/${origin.repo} (origin), got ${f.owner}/${f.repo}`);
  if (f.head !== base.run.branch) problems.push(`head must be the feature branch "${base.run.branch}", got "${f.head}"`);
  if (f.base !== BASE_BRANCH) problems.push(`base must be "${BASE_BRANCH}", got "${f.base}"`);
  if (problems.length) return { decision: 'deny', reason: `Blocked by block-unsafe-ops: ${problems.join('; ')}.` };
  return base;
}

function evaluate(input, opts = {}) {
  const root = opts.root || gitRoot(input.cwd);
  const name = input.toolName || '';
  const strings = collectStrings(input.toolInput, '', []);

  if (MERGE_TOOL.test(name) && /pull|pr\b|merge_pull/i.test(name)) {
    return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: this workflow never merges a pull request. A human merges to main in GitHub, outside the workflow.' };
  }
  if (CREATE_PR_TOOL.test(name)) return prDecision(root, input, opts);
  if (PUSH_TOOL.test(name) && /github|mcp/i.test(name)) return publishDecision(root, 'publishing changes to the remote repository');

  if (EDIT_TOOL.test(name)) {
    for (const { key, value } of strings) {
      if (/path|file|uri/i.test(key) && CMD.stateWrite.test(value)) {
        return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: workflow-state.json is managed only by scripts/sdlc/sdlc.js.' };
      }
    }
  }

  if (TERMINAL_TOOL.test(name) || strings.some((s) => COMMAND_KEY.test(s.key))) {
    const cmd = strings.filter((s) => COMMAND_KEY.test(s.key)).map((s) => s.value).join('\n');
    if (CMD.ghMerge.test(cmd)) return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: pull requests are never merged by this workflow.' };
    if (CMD.forcePush.test(cmd)) return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: force-push / ref deletion is prohibited.' };
    if (CMD.pushMain.test(cmd)) return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: pushing directly to main/master is prohibited.' };
    if (CMD.destructive.test(cmd)) return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: this command can discard uncommitted work. Ask the human to run it if it is really intended.' };
    if (CMD.noVerify.test(cmd)) return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: git hooks must not be bypassed.' };
    if (CMD.stateWrite.test(cmd) && CMD.stateWriteVerb.test(cmd) && !/scripts[\\/]sdlc[\\/]sdlc\.js/i.test(cmd)) {
      return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: workflow-state.json is managed only by scripts/sdlc/sdlc.js.' };
    }
    if (CMD.ghPrCreate.test(cmd)) {
      return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: create the PR with the GitHub MCP create_pull_request tool so owner, repo, head and base can be verified.' };
    }
    if (CMD.push.test(cmd)) return pushDecision(root, cmd);
    if (CMD.sdlcApprove.test(cmd)) {
      return { decision: 'ask', reason: 'Recording a human approval in the SDLC workflow state. Confirm only if YOU gave this approval; check the --text value matches your reply.' };
    }
    if (CMD.sdlcRecordPr.test(cmd)) return publishDecision(root, 'recording the pull request');

    const store = new Store(root);
    const runs = store.activeRuns().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const nb = CMD.newBranch.exec(cmd);
    if (nb && runs.length) {
      const v = validateBranch(nb[1], runs[0].issueKey);
      if (!v.ok) return { decision: 'deny', reason: `Blocked by block-unsafe-ops: new branch "${nb[1]}" is not allowed: ${v.reason}.` };
    }
    if (CMD.commit.test(cmd) && runs.length) {
      const run = runs[0];
      if (run.stages.pr_creation.status !== wf.STATUS.IN_PROGRESS) {
        return { decision: 'deny', reason: 'Blocked by block-unsafe-ops: commits during an active SDLC run are only allowed while the pr_creation stage is IN_PROGRESS.' };
      }
      const branch = store.currentBranch();
      const v = validateBranch(branch, run.issueKey);
      if (!v.ok || branch !== run.branch) {
        return { decision: 'deny', reason: `Blocked by block-unsafe-ops: commit only on the run's feature branch "${run.branch}" (current: "${branch}").` };
      }
    }
  }
  return { decision: 'allow' };
}

if (require.main === module) runBlockingHook(evaluate);
module.exports = { evaluate, activeGate };
