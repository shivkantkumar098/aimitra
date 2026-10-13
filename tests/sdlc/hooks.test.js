'use strict';
// Hook behaviour tests. Inputs are synthetic tool-call payloads (SIMULATED); a temp directory stands in for the repository.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { normalize } = require('../../scripts/sdlc/lib/hook-io');
const secrets = require('../../scripts/sdlc/hooks/protect-secrets');
const unsafe = require('../../scripts/sdlc/hooks/block-unsafe-ops');
const audit = require('../../scripts/sdlc/hooks/audit-log');
const docs = require('../../scripts/sdlc/hooks/validate-docs');
const { main } = require('../../scripts/sdlc/sdlc');
const { mkRoot, checkoutBranch, driveRun } = require('./helpers');

const HOOK_DIR = path.resolve(__dirname, '..', '..', 'scripts', 'sdlc', 'hooks');
const fakeToken = () => `ATATT${'x'.repeat(40)}`;
const call = (toolName, toolInput, cwd) => normalize({ tool_name: toolName, tool_input: toolInput, cwd: cwd || process.cwd(), hookEventName: 'PreToolUse' });
const term = (command) => call('run_in_terminal', { command });

test('protect-secrets denies reading .env and MCP config files, allows .env.example', () => {
  assert.equal(secrets.evaluate(call('read_file', { filePath: 'backend/.env' })).decision, 'deny');
  assert.equal(secrets.evaluate(call('read_file', { filePath: '.vscode/mcp.json' })).decision, 'deny');
  assert.equal(secrets.evaluate(call('read_file', { filePath: 'certs/server.pem' })).decision, 'deny');
  assert.equal(secrets.evaluate(call('read_file', { filePath: 'backend/.env.example' })).decision, 'allow');
  assert.equal(secrets.evaluate(call('read_file', { filePath: 'backend/main.py' })).decision, 'allow');
});

test('protect-secrets denies terminal commands that print or stage credential files', () => {
  for (const c of ['cat backend/.env', 'type .vscode\\mcp.json', 'Get-Content .vscode/mcp.json', 'git add .env', 'grep TOKEN .vscode/mcp.json']) {
    assert.equal(secrets.evaluate(term(c)).decision, 'deny', c);
  }
  assert.equal(secrets.evaluate(term('npm run build')).decision, 'allow');
  assert.equal(secrets.evaluate(term('git status')).decision, 'allow');
});

test('protect-secrets denies writing credential-looking content but allows prose that merely names files', () => {
  assert.equal(secrets.evaluate(call('insert_edit_into_file', { filePath: 'docs/x.md', content: `token ${fakeToken()}` })).decision, 'deny');
  assert.equal(secrets.evaluate(call('create_file', { filePath: 'a.js', content: 'const k = "sk-' + 'a'.repeat(30) + '"' })).decision, 'deny');
  assert.equal(secrets.evaluate(call('create_file', { filePath: 'docs/x.md', content: 'Credentials are kept in .vscode/mcp.json via ${input:jira-api-token}' })).decision, 'allow');
});

test('block-unsafe-ops never allows merging a PR (tool or CLI)', () => {
  const root = mkRoot();
  assert.equal(unsafe.evaluate(call('mcp_github_merge_pull_request', { pullNumber: 1 }), { root }).decision, 'deny');
  assert.equal(unsafe.evaluate(term('gh pr merge 5 --squash'), { root }).decision, 'deny');
});

test('block-unsafe-ops denies force-push, push to main, and commands that discard uncommitted work', () => {
  const root = mkRoot();
  for (const c of ['git push --force origin feat/x', 'git push -f', 'git push origin main', 'git push origin HEAD:master', 'git reset --hard HEAD~1', 'git clean -fd', 'git checkout -- .', 'git restore .', 'git commit --no-verify -m x']) {
    assert.equal(unsafe.evaluate(term(c), { root }).decision, 'deny', c);
  }
});

const ORIGIN = { owner: 'shivkantkumar098', repo: 'aimitra' };
const prArgs = (head, extra = {}) => ({ owner: ORIGIN.owner, repo: ORIGIN.repo, head, base: 'main', title: 't', ...extra });
const createPr = (args) => call('mcp_github_create_pull_request', args);

test('push and PR creation are denied with no run, and denied before final approval', () => {
  const root = mkRoot();
  const opts = { root, originRepo: ORIGIN };
  assert.equal(unsafe.evaluate(term('git push -u origin HOOK-0/some-feature'), opts).decision, 'deny');
  assert.equal(unsafe.evaluate(createPr(prArgs('HOOK-0/some-feature')), opts).decision, 'deny');
  driveRun(main, root, 'HOOK-1', { upTo: 'pr_creation', finalApprove: false });
  const r = unsafe.evaluate(createPr(prArgs('HOOK-1/test-feature')), opts);
  assert.equal(r.decision, 'deny');
  assert.match(r.reason, /pr_creation is AWAITING_APPROVAL/);
  assert.equal(unsafe.evaluate(term('git push -u origin HOOK-1/test-feature'), opts).decision, 'deny');
  assert.equal(unsafe.evaluate(term('gh pr create --title x'), opts).decision, 'deny');
});

test('after final approval, push and PR still ask the human to confirm; tampering revokes it', () => {
  const root = mkRoot();
  const opts = { root, originRepo: ORIGIN };
  driveRun(main, root, 'HOOK-2', { upTo: 'pr_creation' });
  assert.equal(unsafe.evaluate(createPr(prArgs('HOOK-2/test-feature')), opts).decision, 'ask');
  assert.equal(unsafe.evaluate(term('git push -u origin HOOK-2/test-feature'), opts).decision, 'ask');
  assert.equal(unsafe.evaluate(term('git push -u origin HEAD'), opts).decision, 'ask');
  fs.writeFileSync(path.join(root, 'backend/feature.py'), 'print("changed")\n');
  assert.equal(unsafe.evaluate(createPr(prArgs('HOOK-2/test-feature')), opts).decision, 'deny');
});

test('PR must target origin (not another repo), head = the run feature branch, base = main', () => {
  const root = mkRoot();
  const opts = { root, originRepo: ORIGIN };
  driveRun(main, root, 'HOOK-4', { upTo: 'pr_creation' });
  const good = prArgs('HOOK-4/test-feature');
  assert.equal(unsafe.evaluate(createPr(good), opts).decision, 'ask');
  for (const bad of [{ repo: 'ghcpCapstone' }, { owner: 'someone-else' }, { head: 'main' }, { head: 'HOOK-4/other-branch' }, { head: 'fork:HOOK-4/test-feature' }, { base: 'develop' }, { base: undefined }, { head: undefined }]) {
    const r = unsafe.evaluate(createPr({ ...good, ...bad }), opts);
    assert.equal(r.decision, 'deny', JSON.stringify(bad));
  }
});

test('pushes go to origin only and only for the run feature branch; never main, never a different branch', () => {
  const root = mkRoot();
  const opts = { root, originRepo: ORIGIN };
  driveRun(main, root, 'HOOK-5', { upTo: 'pr_creation' });
  for (const c of ['git push -u capstone HOOK-5/test-feature', 'git push origin HOOK-5/other-branch', 'git push origin HEAD:HOOK-5/other-branch', 'git push origin main', 'git push origin HEAD:main', 'git push --force origin HOOK-5/test-feature']) {
    assert.equal(unsafe.evaluate(term(c), opts).decision, 'deny', c);
  }
  assert.equal(unsafe.evaluate(term('git push -u origin HOOK-5/test-feature'), opts).decision, 'ask');
});

test('publishing is denied when HEAD is main or another branch even after final approval', () => {
  const root = mkRoot();
  const opts = { root, originRepo: ORIGIN };
  driveRun(main, root, 'HOOK-6', { upTo: 'pr_creation' });
  checkoutBranch(root, 'main');
  assert.equal(unsafe.evaluate(createPr(prArgs('HOOK-6/test-feature')), opts).decision, 'deny');
  assert.equal(unsafe.evaluate(term('git push -u origin HOOK-6/test-feature'), opts).decision, 'deny');
});

test('during an active run, new branches must follow <ISSUE-KEY>/<feature-name>', () => {
  const root = mkRoot();
  assert.equal(unsafe.evaluate(term('git switch -c anything-goes'), { root }).decision, 'allow');
  driveRun(main, root, 'HOOK-7', { upTo: 'requirements' });
  for (const c of ['git switch -c feat/x', 'git checkout -b my-branch', 'git switch -c OTHER-1/some-thing', 'git branch Feature']) {
    assert.equal(unsafe.evaluate(term(c), { root }).decision, 'deny', c);
  }
  for (const c of ['git switch -c HOOK-7/good-name', 'git checkout -b HOOK-7/good-name']) {
    assert.equal(unsafe.evaluate(term(c), { root }).decision, 'allow', c);
  }
});

test('recording an approval always asks the human; workflow-state.json cannot be edited directly', () => {
  const root = mkRoot();
  assert.equal(unsafe.evaluate(term('node scripts/sdlc/sdlc.js approve requirements --by me --text "ok"'), { root }).decision, 'ask');
  assert.equal(unsafe.evaluate(call('replace_string_in_file', { filePath: 'docs/sdlc/X-1/workflow-state.json', newString: '{}' }), { root }).decision, 'deny');
  assert.equal(unsafe.evaluate(term('Set-Content docs/sdlc/X-1/workflow-state.json "{}"'), { root }).decision, 'deny');
  assert.equal(unsafe.evaluate(term('node scripts/sdlc/sdlc.js status'), { root }).decision, 'allow');
});

test('commits during an active run: only while pr_creation is IN_PROGRESS and only on the feature branch', () => {
  const root = mkRoot();
  assert.equal(unsafe.evaluate(term('git commit -m "x"'), { root }).decision, 'allow');
  driveRun(main, root, 'HOOK-3', { upTo: 'verification' });
  assert.equal(unsafe.evaluate(term('git commit -m "x"'), { root }).decision, 'deny');
  main(['start', 'pr_creation', '--key', 'HOOK-3'], root);
  assert.equal(unsafe.evaluate(term('git commit -m "x"'), { root }).decision, 'allow');
  checkoutBranch(root, 'main');
  assert.equal(unsafe.evaluate(term('git commit -m "x"'), { root }).decision, 'deny');
});

test('ordinary development commands are allowed', () => {
  const root = mkRoot();
  for (const c of ['npm run build', 'python -m unittest discover -s tests/doc_sync -t .', 'node --test tests/sdlc', 'git status', 'git diff']) {
    assert.equal(unsafe.evaluate(term(c), { root }).decision, 'allow', c);
  }
});

test('blocking hooks fail closed on garbage input and emit a deny decision with exit code 2', () => {
  for (const hook of ['protect-secrets.js', 'block-unsafe-ops.js']) {
    const r = spawnSync('node', [path.join(HOOK_DIR, hook)], { input: 'not json', encoding: 'utf8' });
    assert.equal(r.status, 2, `${hook} exit`);
    assert.match(r.stdout, /"permissionDecision":"deny"/);
  }
});

test('blocking hook end-to-end: deny payload on stdout and exit 2; allow exits 0 silently', () => {
  const deny = spawnSync('node', [path.join(HOOK_DIR, 'protect-secrets.js')], { input: JSON.stringify({ tool_name: 'read_file', tool_input: { filePath: '.env' }, cwd: process.cwd() }), encoding: 'utf8' });
  assert.equal(deny.status, 2);
  assert.equal(JSON.parse(deny.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allow = spawnSync('node', [path.join(HOOK_DIR, 'protect-secrets.js')], { input: JSON.stringify({ tool_name: 'read_file', tool_input: { filePath: 'README.md' }, cwd: process.cwd() }), encoding: 'utf8' });
  assert.equal(allow.status, 0);
  assert.equal(allow.stdout, '');
});

test('Copilot CLI payload shape (toolName / toolArgs string) is understood', () => {
  const input = normalize({ toolName: 'bash', toolArgs: JSON.stringify({ command: 'gh pr merge 3' }), cwd: process.cwd() });
  assert.equal(unsafe.evaluate(input, { root: mkRoot() }).decision, 'deny');
});

test('audit-log redacts credentials, omits tool output, and never blocks', () => {
  const entry = audit.buildEntry(normalize({ hookEventName: 'PostToolUse', tool_name: 'run_in_terminal', tool_input: { command: `curl -H "Authorization: Bearer ${'a'.repeat(30)}" x && echo ${fakeToken()}` }, tool_response: 'SECRET OUTPUT' }), new Date(0));
  const line = JSON.stringify(entry);
  assert.doesNotMatch(line, /ATATT/);
  assert.doesNotMatch(line, /a{30}/);
  assert.doesNotMatch(line, /SECRET OUTPUT/);
  assert.match(line, /REDACTED/);
  const root = mkRoot();
  audit.append(root, entry);
  assert.ok(fs.existsSync(path.join(root, '.github/hooks/logs/sdlc-audit.jsonl')));
  const r = spawnSync('node', [path.join(HOOK_DIR, 'audit-log.js')], { input: 'garbage', encoding: 'utf8' });
  assert.equal(r.status, 0);
});

test('validate-docs only reacts to edits of README/ARCHITECTURE and reports without blocking', () => {
  assert.equal(docs.shouldCheck(call('replace_string_in_file', { filePath: 'ARCHITECTURE.md' })), true);
  assert.equal(docs.shouldCheck(call('replace_string_in_file', { filePath: 'docs/other.md' })), false);
  assert.equal(docs.shouldCheck(call('read_file', { filePath: 'README.md' })), false);
  assert.match(docs.check('.', () => ({ status: 1, stdout: 'drift: routes block outdated', stderr: '' })), /drift/);
  assert.match(docs.check('.', () => ({ status: 0, stdout: '', stderr: '' })), /in sync/);
  assert.match(docs.check('.', () => ({ error: { code: 'ENOENT' } })), /NOT RUN/);
});
