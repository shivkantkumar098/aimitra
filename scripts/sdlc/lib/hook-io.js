'use strict';
// Shared helpers for SDLC hooks. Input is normalised across the VS Code agent-hook payload
// (tool_name / tool_input) and the Copilot CLI payload (toolName / toolArgs).
// Blocking hooks fail CLOSED: unparsable input or an internal error denies the tool call.

const fs = require('fs');

const SECRET_PATTERNS = [
  /\bATATT[A-Za-z0-9_\-=]{20,}/g,
  /\bsk-[A-Za-z0-9_\-]{16,}/g,
  /\bgsk_[A-Za-z0-9]{16,}/g,
  /\bAIza[A-Za-z0-9_\-]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  /\b(Bearer)\s+[A-Za-z0-9._\-]{20,}/gi,
  /\b([A-Z0-9_]*(?:API_?KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*[=:]\s*["']?[^\s"']{8,}/gi,
];

function hasSecret(text) {
  return SECRET_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(String(text)); });
}

function redact(text) {
  let out = String(text);
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

function parseToolArgs(args) {
  if (args && typeof args === 'object') return args;
  if (typeof args === 'string') {
    try { return JSON.parse(args); } catch (_) { return { command: args }; }
  }
  return {};
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('hook input is not a JSON object');
  return {
    event: raw.hookEventName || raw.hook_event_name || raw.event || null,
    toolName: raw.tool_name || raw.toolName || '',
    toolInput: parseToolArgs(raw.tool_input !== undefined ? raw.tool_input : raw.toolArgs),
    cwd: raw.cwd || process.cwd(),
    raw,
  };
}

function readStdinJson() {
  const text = fs.readFileSync(0, 'utf8');
  if (!text.trim()) throw new Error('hook received empty input');
  return normalize(JSON.parse(text));
}

function collectStrings(value, key, out) {
  if (typeof value === 'string') out.push({ key: key || '', value });
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, key, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectStrings(v, k, out));
  return out;
}

function decisionPayload(decision, reason) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
    permissionDecision: decision,
    permissionDecisionReason: reason,
  });
}

// result: { decision: 'allow'|'deny'|'ask', reason }
function emitPreToolUse(result) {
  if (result.decision === 'allow') return 0;
  process.stdout.write(`${decisionPayload(result.decision, result.reason)}\n`);
  if (result.decision === 'deny') {
    process.stderr.write(`${result.reason}\n`);
    return 2;
  }
  return 0;
}

function runBlockingHook(evaluate) {
  let code;
  try {
    code = emitPreToolUse(evaluate(readStdinJson()));
  } catch (e) {
    code = emitPreToolUse({ decision: 'deny', reason: `SDLC hook failed closed: ${e.message}` });
  }
  process.exitCode = code;
}

module.exports = { SECRET_PATTERNS, hasSecret, redact, normalize, readStdinJson, collectStrings, emitPreToolUse, runBlockingHook, parseToolArgs };
