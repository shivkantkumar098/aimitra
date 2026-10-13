'use strict';
// Validates the Copilot customization files in the repository: agents, skills, instructions, hooks, mapping doc.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { STAGES, WORKER_AGENTS, ORCHESTRATOR } = require('../../scripts/sdlc/lib/stages');
const { parseFrontmatter } = require('./helpers');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const agentFile = (name) => `.github/agents/${name}.agent.md`;
const WORKER_HEADINGS = ['Role', 'Inputs', 'Outputs', 'Allowed actions', 'Forbidden actions', 'Skill', 'Approval gate', 'Failure behavior', 'Handoff contract'];
const SKILL_HEADINGS = ['Purpose', 'When to use', 'Required inputs', 'Procedure', 'Expected outputs', 'Quality checks', 'Failure handling', 'Human approval'];
const SUPPORTED_HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PreCompact', 'SubagentStart', 'SubagentStop', 'Stop'];

function headings(body) {
  return [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
}

function section(body, title) {
  const m = new RegExp(`^##\\s+${title}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm').exec(body);
  return m ? m[1] : '';
}

test('exactly nine agent definitions exist: one orchestrator and eight workers', () => {
  const files = fs.readdirSync(path.join(ROOT, '.github/agents')).filter((f) => f.endsWith('.agent.md')).sort();
  assert.deepEqual(files, [...WORKER_AGENTS, ORCHESTRATOR].map((n) => `${n}.agent.md`).sort());
});

test('agent frontmatter is valid, names match files, and only the orchestrator is user-invocable', () => {
  for (const name of [ORCHESTRATOR, ...WORKER_AGENTS]) {
    const fm = parseFrontmatter(read(agentFile(name)));
    assert.ok(fm, `${name}: frontmatter missing`);
    assert.equal(fm.data.name, name);
    assert.ok(fm.data.description && fm.data.description.length > 20, `${name}: description`);
    assert.ok(Array.isArray(fm.data.tools) && fm.data.tools.length > 0, `${name}: tools`);
    assert.equal(fm.data['user-invocable'], name === ORCHESTRATOR, `${name}: user-invocable`);
    assert.equal(fm.data.hooks, undefined, `${name}: agent-scoped hooks are not used; hooks live in .github/hooks`);
  }
});

test('orchestrator coordinates exactly the eight workers in stage order and only it can delegate', () => {
  const fm = parseFrontmatter(read(agentFile(ORCHESTRATOR)));
  assert.deepEqual(fm.data.agents, WORKER_AGENTS);
  assert.ok(fm.data.tools.includes('agent'));
  assert.ok(!fm.data.tools.includes('edit'), 'orchestrator must not edit files');
  for (const w of WORKER_AGENTS) {
    assert.ok(!parseFrontmatter(read(agentFile(w))).data.tools.includes('agent'), `${w} must not delegate`);
  }
});

test('only the PR creation agent has a GitHub MCP tool; only the requirements agent has Jira MCP', () => {
  for (const w of WORKER_AGENTS) {
    const tools = parseFrontmatter(read(agentFile(w))).data.tools;
    assert.equal(tools.some((t) => /^github\//i.test(t)), w === 'pr-creation-agent', `${w}: github tool`);
    assert.equal(tools.some((t) => /atlassian|jira/i.test(t)), w === 'requirements-analysis-agent', `${w}: jira tool`);
  }
});

test('every worker defines responsibility, inputs, outputs, allowed/forbidden actions, approval gate, failure behavior and handoff', () => {
  for (const w of WORKER_AGENTS) {
    const { body } = parseFrontmatter(read(agentFile(w)));
    assert.deepEqual(WORKER_HEADINGS.filter((h) => !headings(body).includes(h)), [], `${w}: missing headings`);
  }
});

test('worker responsibilities do not conflict: each artifact is produced by exactly one agent (architecture.md may be revised by design review)', () => {
  for (const st of STAGES) {
    for (const art of st.artifacts) {
      const producers = WORKER_AGENTS.filter((w) => section(parseFrontmatter(read(agentFile(w))).body, 'Outputs').includes(art));
      const allowed = art === 'architecture.md' ? ['architecture-agent', 'design-review-agent'] : [st.agent];
      const author = art === 'architecture.md' ? 'architecture-agent' : st.agent;
      assert.ok(producers.includes(author), `${author} should list ${art} in Outputs`);
      assert.deepEqual(producers.filter((p) => !allowed.includes(p)), [], `${art} claimed by unexpected agents`);
    }
  }
});

test('no worker can drive workflow state, approve, merge, or (except pr-creation) publish', () => {
  for (const w of WORKER_AGENTS) {
    const { body } = parseFrontmatter(read(agentFile(w)));
    const forbidden = section(body, 'Forbidden actions');
    assert.match(forbidden, /sdlc\.js|workflow state/i, `${w}: must forbid driving state`);
    assert.match(forbidden, /merg/i, `${w}: must forbid merging`);
    assert.match(forbidden, /approv/i, `${w}: must forbid self-approval`);
    if (w !== 'pr-creation-agent') assert.match(forbidden, /\bPR|pull request/i, `${w}: must forbid PR creation`);
  }
});

test('each worker links to its stage skill and that skill exists', () => {
  for (const st of STAGES) {
    const { body } = parseFrontmatter(read(agentFile(st.agent)));
    assert.ok(body.includes(`../skills/${st.skill}/SKILL.md`), `${st.agent} must link ${st.skill}`);
    assert.ok(exists(`.github/skills/${st.skill}/SKILL.md`), `${st.skill} missing`);
  }
  assert.ok(parseFrontmatter(read(agentFile(ORCHESTRATOR))).body.includes('../skills/approval-and-workflow-state/SKILL.md'));
});

test('skills have valid frontmatter, required headings in order, and a real owning agent', () => {
  const dirs = fs.readdirSync(path.join(ROOT, '.github/skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  assert.equal(dirs.length, 9);
  const agents = [ORCHESTRATOR, ...WORKER_AGENTS];
  for (const d of dirs) {
    const fm = parseFrontmatter(read(`.github/skills/${d}/SKILL.md`));
    assert.ok(fm, `${d}: frontmatter`);
    assert.equal(fm.data.name, d);
    assert.match(fm.data.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(fm.data.description && fm.data.description.length > 30 && fm.data.description.length <= 1024, `${d}: description`);
    const found = headings(fm.body).filter((h) => SKILL_HEADINGS.includes(h));
    assert.deepEqual(found, SKILL_HEADINGS, `${d}: headings`);
    const used = /\*\*Used by:\*\*\s*([\w-]+)/.exec(fm.body);
    assert.ok(used && agents.includes(used[1]), `${d}: Used by must name a real agent`);
  }
  const referenced = new Set([...STAGES.map((s) => s.skill), 'approval-and-workflow-state']);
  assert.deepEqual([...referenced].sort(), [...dirs].sort(), 'every skill is used by an agent');
});

test('skill Used-by matches the stage owner', () => {
  for (const st of STAGES) {
    const body = read(`.github/skills/${st.skill}/SKILL.md`);
    assert.match(body, new RegExp(`\\*\\*Used by:\\*\\*\\s*${st.agent}`));
  }
});

test('shared and scoped instruction files exist with valid frontmatter', () => {
  assert.ok(exists('.github/copilot-instructions.md'));
  const shared = read('.github/copilot-instructions.md');
  for (const topic of [/human/i, /secret/i, /fabricat/i, /merge/i, /attribution|Co-Authored/i, /MCP/i]) assert.match(shared, topic);
  const dir = path.join(ROOT, '.github/instructions');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.instructions.md'));
  assert.ok(files.length >= 3);
  for (const f of files) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(fm && fm.data.applyTo, `${f}: applyTo`);
    assert.ok(fm.data.description, `${f}: description`);
  }
});

test('hook configuration uses only supported events and references existing scripts, each used', () => {
  const cfg = JSON.parse(read('.github/hooks/sdlc-hooks.json'));
  const referenced = new Set();
  for (const [event, entries] of Object.entries(cfg.hooks)) {
    assert.ok(SUPPORTED_HOOK_EVENTS.includes(event), `unsupported hook event ${event}`);
    for (const e of entries) {
      assert.equal(e.type, 'command');
      assert.ok(e.timeout > 0 && e.timeout <= 60);
      const script = /node\s+(\S+)/.exec(e.command)[1];
      assert.ok(exists(script), `${script} missing`);
      referenced.add(path.basename(script, '.js'));
    }
  }
  const scripts = fs.readdirSync(path.join(ROOT, 'scripts/sdlc/hooks')).map((f) => path.basename(f, '.js')).sort();
  assert.deepEqual([...referenced].sort(), scripts);
  assert.deepEqual(cfg.hooks.PreToolUse.map((h) => path.basename(/node\s+(\S+)/.exec(h.command)[1], '.js')), ['protect-secrets', 'block-unsafe-ops']);
});

test('hooks cannot approve: no hook script calls the approve operation', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'scripts/sdlc/hooks'))) {
    const src = read(`scripts/sdlc/hooks/${f}`);
    assert.doesNotMatch(src, /\.approve\(|wf\.approve|mutate\(/, `${f} must not change workflow state`);
  }
});

test('orchestrator documents every stage id, the approval protocol, and the no-merge / no-fabrication rules', () => {
  const { body } = parseFrontmatter(read(agentFile(ORCHESTRATOR)));
  for (const st of STAGES) assert.ok(body.includes(st.id), `orchestrator mentions ${st.id}`);
  for (const cmd of ['init', 'start', 'submit', 'approve', 'changes', 'reject', 'block', 'can-publish', 'record-pr', 'summary', 'verify']) assert.ok(body.includes(cmd), cmd);
  assert.match(body, /never merge/i);
  assert.match(body, /fabricat/i);
  assert.match(body, /silence/i);
});

test('PR creation agent and skill require final approval, forbid merge, and require truthful attribution', () => {
  const agent = read(agentFile('pr-creation-agent'));
  const skill = read('.github/skills/commit-and-pr-preparation/SKILL.md');
  for (const text of [agent, skill]) {
    assert.match(text, /can-publish|final (human )?approval/i);
    assert.match(text, /never merge|do not merge|not merge/i);
  }
  assert.match(skill, /Orchestrator/);
  assert.match(skill, /git add -A|by name/i);
});

test('CLI commands referenced by agents and skills exist', () => {
  const cli = read('scripts/sdlc/sdlc.js');
  const commands = [...cli.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]);
  const corpus = [ORCHESTRATOR, ...WORKER_AGENTS].map((n) => read(agentFile(n))).join('\n') + fs.readdirSync(path.join(ROOT, '.github/skills')).map((d) => read(`.github/skills/${d}/SKILL.md`)).join('\n');
  for (const m of corpus.matchAll(/sdlc\.js\s+([a-z-]+)/g)) {
    assert.ok(commands.includes(m[1]), `referenced CLI command "${m[1]}" does not exist`);
  }
});

test('mapping document lists every agent, skill and hook', { skip: !fs.existsSync(path.join(ROOT, 'docs/agent-skill-hook-mapping.md')) && 'mapping doc not written yet' }, () => {
  const doc = read('docs/agent-skill-hook-mapping.md');
  const skills = fs.readdirSync(path.join(ROOT, '.github/skills'));
  const hooks = fs.readdirSync(path.join(ROOT, 'scripts/sdlc/hooks')).map((f) => path.basename(f, '.js'));
  for (const n of [ORCHESTRATOR, ...WORKER_AGENTS, ...skills, ...hooks]) assert.ok(doc.includes(n), `mapping doc must mention ${n}`);
});

test('MCP template is credential-free and its server keys match the agents tool references', () => {
  const cfg = JSON.parse(read('.github/mcp.example.json'));
  assert.deepEqual(Object.keys(cfg.servers).sort(), ['Atlassian-MCP', 'github']);
  assert.equal(cfg.servers.github.type, 'http');
  assert.equal(cfg.servers.github.url, 'https://api.githubcopilot.com/mcp/');
  const inputs = Object.fromEntries(cfg.inputs.map((i) => [i.id, i]));
  const refs = JSON.stringify(cfg.servers).match(/\$\{input:([\w-]+)\}/g).map((m) => m.slice(8, -1));
  assert.ok(refs.length >= 3);
  for (const id of refs) assert.equal(inputs[id].type, 'promptString', `${id} must be a prompt input`);
  for (const id of ['github-pat', 'jira-api-token']) assert.equal(inputs[id].password, true, `${id} must be masked`);
  const raw = read('.github/mcp.example.json');
  assert.doesNotMatch(raw, /ATATT|ghp_|github_pat_[A-Za-z0-9]|Bearer [A-Za-z0-9]/);
  assert.doesNotMatch(raw, /@gmail|@.*\.com"/, 'no account email in the template');
  const pr = parseFrontmatter(read(agentFile('pr-creation-agent'))).data.tools;
  assert.ok(pr.includes('github/*'));
  assert.ok(parseFrontmatter(read(agentFile('requirements-analysis-agent'))).data.tools.includes('Atlassian-MCP/*'));
  assert.match(read('.github/copilot-instructions.md'), /shivkantkumar098\/aimitra/);
  assert.doesNotMatch(read('.github/copilot-instructions.md'), /ghcpCapstone/);
  assert.match(read('.github/copilot-instructions.md'), /<ISSUE-KEY>\/<feature-name>|ISSUE-KEY\/feature-name|<KEY>\/<feature-name>/);
  assert.doesNotMatch(read('.gitignore'), /^\.github\/mcp\.example\.json$/m);
});

test('no vendor or tool attribution trailers are required anywhere in workflow assets', () => {
  const files = ['.github/copilot-instructions.md', 'docs/commit-and-pr-conventions.md', ...fs.readdirSync(path.join(ROOT, '.github/skills')).map((d) => `.github/skills/${d}/SKILL.md`)];
  for (const f of files) assert.doesNotMatch(read(f), /noreply@anthropic|Generated with \[?Claude/i, f);
});

test('required documentation files exist', () => {
  for (const f of ['agentic-sdlc-architecture', 'agent-responsibilities', 'human-approval-workflow', 'agent-skill-hook-mapping', 'workflow-execution-guide', 'commit-and-pr-conventions']) {
    assert.ok(exists(`docs/${f}.md`), `docs/${f}.md missing`);
  }
});
