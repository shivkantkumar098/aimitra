'use strict';
// File-backed persistence for workflow state: atomic writes, a lock file and an optimistic revision check.
// State holds hashes, decisions and evidence only. It never stores credentials.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const wf = require('./workflow');

const KEY_RE = /^[A-Za-z][A-Za-z0-9_]*-[A-Za-z0-9-]+$/;
const LOCK_STALE_MS = 30000;
const SENSITIVE_PATH = /(^|\/)(\.env(\..*)?|.*\.(pem|key|p12|pfx|cert)|mcp\.json)$/i;

function normalizeForHash(buf) {
  if (buf.includes(0)) return buf;
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

class Store {
  constructor(repoRoot) {
    this.root = path.resolve(repoRoot);
  }

  assertKey(key) {
    if (!KEY_RE.test(key || '')) throw new wf.WorkflowError('INVALID_INPUT', `Invalid issue key: ${key}`);
  }

  dir(key) {
    this.assertKey(key);
    return path.join(this.root, 'docs', 'sdlc', key);
  }

  statePath(key) {
    return path.join(this.dir(key), 'workflow-state.json');
  }

  safeAbs(rel) {
    const posix = String(rel).replace(/\\/g, '/');
    if (SENSITIVE_PATH.test(posix)) throw new wf.WorkflowError('INVALID_INPUT', `Refusing to track sensitive path: ${posix}`);
    const abs = path.resolve(this.root, posix);
    const within = path.relative(this.root, abs);
    if (within.startsWith('..') || path.isAbsolute(within)) {
      throw new wf.WorkflowError('INVALID_INPUT', `Path escapes the repository: ${posix}`);
    }
    return abs;
  }

  env(key) {
    const base = `docs/sdlc/${key}/`;
    return {
      now: () => new Date().toISOString(),
      currentBranch: () => this.currentBranch(),
      artifactPath: (name) => base + name,
      hashPath: (rel) => {
        const abs = this.safeAbs(rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
        return crypto.createHash('sha256').update(normalizeForHash(fs.readFileSync(abs))).digest('hex');
      },
      readText: (rel) => {
        const abs = this.safeAbs(rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
        return fs.readFileSync(abs, 'utf8');
      },
    };
  }

  currentBranch() {
    try {
      return execFileSync('git', ['symbolic-ref', '--short', '-q', 'HEAD'], { cwd: this.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
    } catch (_) {
      return null;
    }
  }

  load(key) {
    const p = this.statePath(key);
    if (!fs.existsSync(p)) throw new wf.WorkflowError('NO_RUN', `No workflow run found for ${key}. Run "init" first.`);
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      throw new wf.WorkflowError('CORRUPT_STATE', `State file is unreadable (${e.message}); restore it from Git or re-initialise. It was not modified.`);
    }
  }

  withLock(key, fn) {
    const lock = `${this.statePath(key)}.lock`;
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    const deadline = Date.now() + 5000;
    for (;;) {
      try {
        fs.closeSync(fs.openSync(lock, 'wx'));
        break;
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try {
          if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.unlinkSync(lock);
        } catch (_) { /* lock vanished */ }
        if (Date.now() > deadline) throw new wf.WorkflowError('LOCKED', 'Another SDLC command holds the state lock; retry shortly.');
        sleep(50);
      }
    }
    try {
      return fn();
    } finally {
      try { fs.unlinkSync(lock); } catch (_) { /* already gone */ }
    }
  }

  save(key, state, expectedRevision) {
    const p = this.statePath(key);
    if (fs.existsSync(p)) {
      const onDisk = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (onDisk.revision !== expectedRevision) {
        throw new wf.WorkflowError('CONFLICT', 'State changed on disk during this command; re-run it.');
      }
    }
    state.revision = expectedRevision + 1;
    const tmp = `${p}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, p);
  }

  init(key, { sourceType, sourceUrl }) {
    return this.withLock(key, () => {
      if (fs.existsSync(this.statePath(key))) {
        throw new wf.WorkflowError('RUN_EXISTS', `A run for ${key} already exists. Resume it, or move its workflow-state.json aside to start over.`);
      }
      const env = this.env(key);
      const runId = `${key}-${env.now().replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;
      const state = wf.createRun({ issueKey: key, sourceType, sourceUrl, runId }, env);
      this.save(key, state, 0);
      return state;
    });
  }

  mutate(key, fn) {
    return this.withLock(key, () => {
      const state = this.load(key);
      const rev = state.revision;
      const result = fn(state, this.env(key));
      this.save(key, state, rev);
      return result === undefined ? state : result;
    });
  }

  listRuns() {
    const base = path.join(this.root, 'docs', 'sdlc');
    if (!fs.existsSync(base)) return [];
    return fs.readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && KEY_RE.test(d.name) && fs.existsSync(path.join(base, d.name, 'workflow-state.json')))
      .map((d) => {
        try { return this.load(d.name); } catch (_) { return null; }
      })
      .filter(Boolean);
  }

  activeRuns() {
    return this.listRuns().filter((r) => r.status === wf.RUN.ACTIVE);
  }
}

module.exports = { Store, KEY_RE, SENSITIVE_PATH };
