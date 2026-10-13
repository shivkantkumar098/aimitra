#!/usr/bin/env node
'use strict';
// Validates docs/sdlc/<KEY>/pr-draft.md before it is shown for FINAL approval.
//   node scripts/sdlc/validate-pr-draft.js docs/sdlc/<KEY>/pr-draft.md
// Checks: required sections, attribution, credential-free, only agents that actually ran are credited,
// every commit hash cited exists in Git, and no unverifiable CI link or pre-existing PR number appears.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { STAGES } = require('./lib/stages');
const { hasSecret } = require('./lib/hook-io');

function validate(text, { state = null, shaExists = () => true } = {}) {
  const errors = [];
  const stage = STAGES.find((s) => s.id === 'pr_creation');

  for (const req of stage.contract['pr-draft.md']) {
    const lines = text.split(/\r?\n/);
    const idx = lines.findIndex((l) => /^#{1,6}\s+/.test(l) && req.pattern.test(l));
    if (idx < 0) { errors.push(`missing section "${req.name}"`); continue; }
    const level = /^(#+)/.exec(lines[idx])[1].length;
    const body = [];
    for (let j = idx + 1; j < lines.length; j += 1) {
      const n = /^(#+)\s/.exec(lines[j]);
      if (n && n[1].length <= level) break;
      body.push(lines[j]);
    }
    if (!body.join('').trim()) errors.push(`section "${req.name}" is empty`);
  }

  if (!/SDLC Orchestrator/i.test(text)) errors.push('attribution: must name the SDLC Orchestrator Agent');
  if (!/GitHub Copilot Agentic SDLC/i.test(text)) errors.push('attribution: must state the work was prepared through the GitHub Copilot Agentic SDLC workflow');
  if (hasSecret(text)) errors.push('draft contains what looks like a credential');
  if (/actions\/runs\/\d+/i.test(text)) errors.push('CI link present but cannot be verified from here; use pasted local test output unless a real CI run was created');
  if (/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i.test(text) && !(state && state.pr)) errors.push('draft cites a pull request URL but none has been recorded');

  for (const m of text.matchAll(/\b[0-9a-f]{40}\b/g)) {
    if (!shaExists(m[0])) errors.push(`commit ${m[0]} does not exist in this repository`);
  }

  if (state) {
    const section = (/##+\s*(?:\d+[.)]?\s*)?Agent Execution Summary([\s\S]*?)(?=\n#{1,6}\s|$)/i.exec(text) || [])[1] || '';
    for (const s of STAGES) {
      const ran = state.stages[s.id].attempts > 0;
      const mentioned = section.includes(s.agent);
      if (mentioned && !ran) errors.push(`credits ${s.agent}, which has not run in this workflow`);
      if (ran && !mentioned) errors.push(`${s.agent} ran but is not credited in the Agent Execution Summary`);
    }
    for (const s of STAGES) {
      const st = state.stages[s.id];
      if (st.status !== 'APPROVED' && section.includes(s.agent) && /approved/i.test(section.split(s.agent)[1].split('\n')[0] || '')) {
        errors.push(`claims ${s.agent} output was approved but state says ${st.status}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function gitShaExists(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    process.stderr.write('usage: validate-pr-draft.js <path-to-pr-draft.md>\n');
    process.exit(2);
  }
  let state = null;
  const statePath = path.join(path.dirname(file), 'workflow-state.json');
  if (fs.existsSync(statePath)) state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const result = validate(fs.readFileSync(file, 'utf8'), { state, shaExists: gitShaExists });
  if (result.ok) process.stdout.write('PR draft is valid.\n');
  else process.stderr.write(`PR draft is INVALID:\n - ${result.errors.join('\n - ')}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { validate };
