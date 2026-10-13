#!/usr/bin/env node
'use strict';
// PostToolUse hook (report only, never blocks): after an edit to README.md or ARCHITECTURE.md, runs
// `python -m scripts.doc_sync --check` and surfaces drift to the agent as a system message.
const { spawnSync } = require('child_process');
const { readStdinJson, collectStrings, redact } = require('../lib/hook-io');

const EDIT_TOOL = /edit|write|create|replace|patch|insert|append/i;
const SYNCED_DOC = /(^|[\\/])(README|ARCHITECTURE)\.md$/i;

function shouldCheck(input) {
  if (!EDIT_TOOL.test(input.toolName || '')) return false;
  return collectStrings(input.toolInput, '', []).some((s) => /path|file|uri/i.test(s.key) && SYNCED_DOC.test(s.value));
}

function check(cwd, runner = spawnSync) {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  const r = runner(py, ['-m', 'scripts.doc_sync', '--check'], { cwd, encoding: 'utf8', timeout: 25000 });
  if (r.error) return `doc-sync check NOT RUN (${r.error.code || r.error.message}). Run \`python -m scripts.doc_sync --check\` manually.`;
  const out = redact(`${r.stdout || ''}${r.stderr || ''}`).trim().slice(0, 1500);
  return r.status === 0 ? 'doc-sync check: documentation is in sync with code.' : `doc-sync check found drift (exit ${r.status}):\n${out}`;
}

if (require.main === module) {
  try {
    const input = readStdinJson();
    if (shouldCheck(input)) process.stdout.write(`${JSON.stringify({ systemMessage: check(input.cwd) })}\n`);
  } catch (e) {
    process.stderr.write(`validate-docs (non-blocking): ${e.message}\n`);
  }
  process.exitCode = 0;
}

module.exports = { shouldCheck, check };
