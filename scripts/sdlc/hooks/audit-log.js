#!/usr/bin/env node
'use strict';
// PostToolUse / SubagentStart / SubagentStop hook (report only, never blocks): appends one redacted line per event
// to .github/hooks/logs/sdlc-audit.jsonl (gitignored). It records tool name and a redacted command summary, never tool output.
const fs = require('fs');
const path = require('path');
const { readStdinJson, collectStrings, redact } = require('../lib/hook-io');

function buildEntry(input, now = new Date()) {
  const cmd = collectStrings(input.toolInput, '', []).find((s) => /^(command|cmd|script|commandline)$/i.test(s.key));
  const target = collectStrings(input.toolInput, '', []).find((s) => /path|file/i.test(s.key));
  const entry = {
    at: now.toISOString(),
    event: input.event || 'unknown',
    tool: input.toolName || null,
  };
  if (cmd) entry.command = redact(cmd.value).slice(0, 200);
  if (target) entry.target = redact(target.value).slice(0, 200);
  if (input.raw && (input.raw.agent_type || input.raw.agentName)) entry.agent = String(input.raw.agent_type || input.raw.agentName).slice(0, 80);
  return entry;
}

function append(root, entry) {
  const dir = path.join(root, '.github', 'hooks', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'sdlc-audit.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8');
}

if (require.main === module) {
  try {
    const input = readStdinJson();
    append(input.cwd, buildEntry(input));
  } catch (e) {
    process.stderr.write(`audit-log (non-blocking): ${e.message}\n`);
  }
  process.exitCode = 0;
}

module.exports = { buildEntry, append };
