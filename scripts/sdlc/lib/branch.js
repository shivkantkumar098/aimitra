'use strict';
// Branch convention: every change lives on its own branch named <ISSUE-KEY>/<feature-name>
// (feature-name: lowercase kebab-case, 3-50 chars). main/master are never worked on or published by the workflow.

const PROTECTED = ['main', 'master', 'develop', 'HEAD'];
const FEATURE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BASE_BRANCH = 'main';

function validateBranch(branch, issueKey) {
  if (!branch || typeof branch !== 'string') return { ok: false, reason: 'branch name could not be determined' };
  if (PROTECTED.includes(branch)) return { ok: false, reason: `"${branch}" is protected; work on <${issueKey}>/<feature-name>` };
  const slash = branch.indexOf('/');
  if (slash < 0) return { ok: false, reason: `"${branch}" must be named ${issueKey}/<feature-name>` };
  const key = branch.slice(0, slash);
  const name = branch.slice(slash + 1);
  if (key !== issueKey) return { ok: false, reason: `branch prefix "${key}" must equal the run's issue key "${issueKey}"` };
  if (name.length < 3 || name.length > 50 || !FEATURE_NAME.test(name)) {
    return { ok: false, reason: `feature name "${name}" must be lowercase kebab-case, 3-50 characters` };
  }
  return { ok: true, reason: null };
}

function suggestBranch(issueKey, featureName) {
  const slug = String(featureName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
  const branch = `${issueKey}/${slug}`;
  const v = validateBranch(branch, issueKey);
  if (!v.ok) throw Object.assign(new Error(v.reason), { code: 'INVALID_INPUT' });
  return branch;
}

// "https://github.com/o/r.git" | "git@github.com:o/r.git" -> { owner, repo }
function parseRemoteUrl(url) {
  const m = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(String(url || '').trim());
  return m ? { owner: m[1], repo: m[2] } : null;
}

module.exports = { validateBranch, suggestBranch, parseRemoteUrl, PROTECTED, BASE_BRANCH };
