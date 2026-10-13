#!/usr/bin/env node
'use strict';
// PreToolUse hook (blocking): keeps secrets out of agent context, files and logs.
//  - denies any tool call whose path/command argument targets .env*, *.pem/*.key, id_rsa*, or any mcp.json
//  - denies writes whose content contains a recognisable credential
const { hasSecret, collectStrings, runBlockingHook } = require('../lib/hook-io');

const SENSITIVE =
  /(?:^|[\s"'`\\/=:])(?:\.env(?:\.(?!example\b|sample\b|template\b)[\w.-]+)?|[\w.-]*mcp\.json|[\w.-]+\.(?:pem|key|p12|pfx)|id_rsa[\w.-]*)(?=$|[\s"'`;|&)])/i;
const PATH_KEY = /path|file|uri|include|exclude|glob|pattern/i;
const COMMAND_KEY = /^(command|cmd|script|commandline)$/i;
const WRITE_TOOL = /edit|write|create|replace|patch|insert|append/i;
const CONTENT_KEY = /content|newstring|new_string|text|code|input|body|patch/i;
const TERMINAL_VERBS = /\b(cat|type|get-content|gc|more|less|head|tail|cp|copy|copy-item|mv|move|curl|invoke-webrequest|select-string|grep|rg|sed|awk|echo|printenv|set-content|out-file|git\s+(add|commit|diff|show))\b|>>?/i;

function evaluate(input) {
  const strings = collectStrings(input.toolInput, '', []);
  for (const { key, value } of strings) {
    if (PATH_KEY.test(key) && SENSITIVE.test(` ${value}`)) {
      return { decision: 'deny', reason: `Blocked by protect-secrets: "${value.slice(0, 80)}" targets a secrets/credentials file. Ask the human to handle it outside the agent.` };
    }
    if (COMMAND_KEY.test(key) && SENSITIVE.test(` ${value}`) && TERMINAL_VERBS.test(value)) {
      return { decision: 'deny', reason: 'Blocked by protect-secrets: the command reads, copies or stages a secrets/credentials file.' };
    }
  }
  if (WRITE_TOOL.test(input.toolName)) {
    for (const { key, value } of strings) {
      if (CONTENT_KEY.test(key) && hasSecret(value)) {
        return { decision: 'deny', reason: 'Blocked by protect-secrets: the content to be written contains what looks like a credential. Use a placeholder such as ${input:...} or an environment variable.' };
      }
    }
  }
  return { decision: 'allow' };
}

if (require.main === module) runBlockingHook(evaluate);
module.exports = { evaluate, SENSITIVE };
