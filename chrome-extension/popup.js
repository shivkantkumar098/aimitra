// AiMitra Test Generator — Popup Script

const $ = id => document.getElementById(id);

let pageData = null;
const sel = { framework: 'playwright', pattern: 'pom', language: 'python' };

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupOptGroups();
  setupButtons();
  await loadSettings();
  await loadPageData();
  await loadPickedElements();
});

// ── Tabs ──────────────────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      $('tab-' + tab.dataset.tab).classList.remove('hidden');
    });
  });
}

// ── Option groups ─────────────────────────────────────────────────────────────

function setupOptGroups() {
  document.querySelectorAll('.opt-group').forEach(group => {
    const key = group.dataset.key;
    group.querySelectorAll('.opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        group.querySelectorAll('.opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sel[key] = btn.dataset.value;
        if (key === 'framework') onFrameworkChange(btn.dataset.value);
      });
    });
  });
}

function onFrameworkChange(framework) {
  const jsOnly = ['cypress', 'webdriverio'];
  const langGroup = document.querySelector('.opt-group[data-key="language"]');
  langGroup.querySelectorAll('.opt').forEach(btn => {
    const isJs = ['javascript', 'typescript'].includes(btn.dataset.value);
    if (jsOnly.includes(framework)) {
      btn.disabled = !isJs;
      btn.style.opacity = isJs ? '1' : '0.32';
      if (!isJs && btn.classList.contains('active')) {
        btn.classList.remove('active');
        langGroup.querySelector('[data-value="javascript"]').classList.add('active');
        sel.language = 'javascript';
      }
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function loadSettings() {
  const data = await chrome.storage.local.get(['provider', 'apiKey']);
  if (data.provider) $('providerSelect').value = data.provider;
  if (data.apiKey) $('apiKeyInput').value = data.apiKey;
  updateHint();
}

function updateHint() {
  const hints = {
    gemini:     '🆓 Free — aistudio.google.com/api-keys',
    groq:       '🆓 Free — console.groq.com/keys',
    openrouter: '🆓 Free models — openrouter.ai/keys',
    cerebras:   '🆓 Free — cloud.cerebras.ai',
    openai:     '🔑 platform.openai.com/api-keys',
    anthropic:  '🔑 console.anthropic.com',
    mistral:    '🔑 console.mistral.ai',
    deepseek:   '🔑 platform.deepseek.com',
    xai:        '🔑 console.x.ai',
    together:   '🔑 api.together.ai',
    perplexity: '🔑 perplexity.ai/settings/api',
    fireworks:  '🔑 fireworks.ai/account/api-keys',
    cohere:     '🔑 dashboard.cohere.com/api-keys',
  };
  $('keyHint').textContent = hints[$('providerSelect').value] || '';
}

// ── Page data ─────────────────────────────────────────────────────────────────

async function loadPageData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    $('pageUrl').textContent = url.hostname + url.pathname.slice(0, 40);
    $('pageTitle').textContent = tab.title?.slice(0, 60) || '';

    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_PAGE' });
    } catch {
      // Content script not injected yet (page was open before extension loaded) — inject it now
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        pageData = await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_PAGE' });
      } catch {
        pageData = null;
      }
    }
    renderSummary(pageData);
  } catch {
    $('pageUrl').textContent = 'Cannot access this page (browser system page)';
    renderSummary(null);
  }
}

function renderSummary(data) {
  const grid = $('summaryGrid');
  const vals = data
    ? [data.forms?.length, data.buttons?.length, data.inputs?.length, data.links?.length]
    : [0, 0, 0, 0];
  const labels = ['Forms', 'Buttons', 'Inputs', 'Links'];
  grid.innerHTML = vals.map((v, i) => `
    <div class="summary-card">
      <span class="num">${v ?? 0}</span>
      <span class="lbl">${labels[i]}</span>
    </div>
  `).join('');
}

// ── Picked elements ───────────────────────────────────────────────────────────

async function loadPickedElements() {
  const { pickedElements = [] } = await chrome.storage.local.get(['pickedElements']);
  renderPicked(pickedElements);
}

function renderPicked(elements) {
  $('pickedCount').textContent = elements.length;
  const list = $('pickedList');
  if (!elements.length) {
    list.innerHTML = '<p class="muted">Click "Pick Elements" then click any element on the page.</p>';
    return;
  }
  list.innerHTML = elements.map((el, i) => `
    <div class="pi">
      <div class="pi-left">
        <span class="pi-tag">${el.tag}${el.type ? `[${el.type}]` : ''}</span>
        ${el.text ? `<span class="pi-text">"${el.text.slice(0, 28)}"</span>` : ''}
        <div class="pi-sel">${el.cssSelector}</div>
      </div>
      <button class="pi-del" data-i="${i}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('.pi-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { pickedElements: cur = [] } = await chrome.storage.local.get(['pickedElements']);
      const updated = cur.filter((_, idx) => idx !== +btn.dataset.i);
      await chrome.storage.local.set({ pickedElements: updated });
      renderPicked(updated);
    });
  });
}

// ── Buttons ───────────────────────────────────────────────────────────────────

function setupButtons() {
  // Pick elements
  $('pickBtn').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'START_PICKING' });
      // Close popup so user can interact with page; picked elements saved by content script
      window.close();
    } catch {
      $('genError').textContent = '⚠ Cannot pick elements on this page.';
      $('genError').classList.remove('hidden');
    }
  });

  // Clear picked
  $('clearBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ pickedElements: [] });
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_PICKED' });
    } catch { /* ignore on restricted pages */ }
    renderPicked([]);
  });

  // Generate
  $('generateBtn').addEventListener('click', generate);

  // Copy
  $('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('codeOutput').textContent);
    $('copyBtn').textContent = '✓ Copied!';
    setTimeout(() => { $('copyBtn').textContent = '📋 Copy'; }, 2000);
  });

  // Download
  $('downloadBtn').addEventListener('click', () => {
    const ext = { python: 'py', javascript: 'js', typescript: 'ts', java: 'java' }[sel.language] || 'txt';
    const name = `${sel.pattern}_${sel.framework}_test.${ext}`;
    const blob = new Blob([$('codeOutput').textContent], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Settings
  $('providerSelect').addEventListener('change', updateHint);
  $('toggleKeyBtn').addEventListener('click', () => {
    const inp = $('apiKeyInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
  $('saveBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ provider: $('providerSelect').value, apiKey: $('apiKeyInput').value.trim() });
    $('saveOk').classList.remove('hidden');
    setTimeout(() => $('saveOk').classList.add('hidden'), 2000);
  });
}

// ── Code Generation ───────────────────────────────────────────────────────────

async function generate() {
  const { apiKey, provider = 'gemini', pickedElements: picked = [] } =
    await chrome.storage.local.get(['apiKey', 'provider', 'pickedElements']);

  $('genError').classList.add('hidden');

  if (!apiKey) {
    $('genError').textContent = '⚠ No API key set. Go to the Settings tab.';
    $('genError').classList.remove('hidden');
    return;
  }

  const btn = $('generateBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';
  $('resultArea').classList.add('hidden');

  try {
    const { system, user } = buildPrompt(picked);
    const code = await callAI(provider, apiKey, system, user);
    $('codeOutput').textContent = code;
    $('resultArea').classList.remove('hidden');
  } catch (err) {
    $('genError').textContent = '⚠ ' + (err.message || 'Generation failed. Check your API key.');
    $('genError').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Generate Test Code';
  }
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

function buildPrompt(picked) {
  const { framework, pattern, language } = sel;
  const data = pageData || {};

  const allInteractive = [
    ...(data.inputs || []).slice(0, 10),
    ...(data.buttons || []).slice(0, 10),
    ...(data.roleButtons || []).slice(0, 8),
    ...(data.roleInputs || []).slice(0, 6),
  ];
  const elements = picked.length ? picked : allInteractive;

  const totalNative = (data.inputs?.length || 0) + (data.buttons?.length || 0);
  const isSpa = !picked.length && totalNative < 3;

  const elStr = elements.map(el => {
    const attrs = [
      el.text        && `text="${el.text}"`,
      el.placeholder && `placeholder="${el.placeholder}"`,
      el.ariaLabel   && `aria-label="${el.ariaLabel}"`,
      el.testId      && `data-testid="${el.testId}"`,
      `css="${el.cssSelector}"`,
      `xpath="${el.xpath}"`,
    ].filter(Boolean).join(', ');
    return `  <${el.tag}${el.type ? ` type="${el.type}"` : ''}${el.role ? ` role="${el.role}"` : ''}> ${attrs}`;
  }).join('\n');

  const formStr = (data.forms || []).map((f, i) => {
    const fields = (f.fields || []).map(fi => fi.type || fi.name || fi.tag).join(', ');
    return `  Form ${i + 1}${f.id ? `#${f.id}` : ''}: [${fields}]`;
  }).join('\n');

  const navStr = data.navItems?.length ? `\nNAVIGATION: ${data.navItems.join(' | ')}` : '';

  const spaNote = isSpa ? `
⚠ FEW STATIC ELEMENTS DETECTED — This is likely a JavaScript SPA (React/Vue/Angular).
- Infer UI structure from the URL, title, headings, and navigation items above
- Use dynamic waits (wait_for_selector / waitForSelector / cy.get with retry) before every interaction
- Prefer aria-label and data-testid selectors; avoid fragile nth-child paths
- Generate at least 6 meaningful test scenarios covering the app's likely functionality
` : '';

  const user = `=== PAGE DATA ===
URL:     ${data.url || 'unknown'}
Title:   "${data.title || 'unknown'}"
${data.headings?.length ? `Headings: ${data.headings.join(' | ')}` : ''}${navStr}

FORMS:
${formStr || '  (none detected)'}

INTERACTIVE ELEMENTS (${elements.length} found):
${elStr || '  (none detected)'}
${spaNote}
=== TASK ===
Generate complete, runnable ${pattern.toUpperCase()} test code for this page using ${framework} (${language}).
Output ONLY code. No explanations outside code comments. Use markdown code blocks.`;

  return { system: systemPrompt(framework, pattern, language), user };
}

function systemPrompt(framework, pattern, language) {
  const fw = {
    playwright: { python: 'Playwright for Python (playwright-pytest)', javascript: '@playwright/test', typescript: '@playwright/test (TypeScript)', java: 'Playwright for Java' },
    selenium:   { python: 'Selenium 4 + pytest', javascript: 'selenium-webdriver + Mocha', typescript: 'selenium-webdriver + Mocha (TS)', java: 'Selenium 4 + JUnit 5' },
    cypress:    { javascript: 'Cypress 13', typescript: 'Cypress 13 (TypeScript)' },
    webdriverio:{ javascript: 'WebdriverIO v8', typescript: 'WebdriverIO v8 (TypeScript)' },
  }[framework]?.[language] || `${framework} (${language})`;

  const patterns = {
    pom: `Generate a Page Object Model implementation.
MUST include:
1. PageObject class — locators as properties (use the CSS/XPath provided), action methods (navigate, fill*, click*, verify*)
2. Test file — imports the PO, 4-5 independent test cases: page load, form interaction, navigation, validation, negative case
3. Proper teardown and explicit waits (no sleep/hardcoded delays)`,

    bdd: `Generate a full BDD / Gherkin suite.
MUST include:
1. .feature file — Feature + description, Background if needed, 4-5 Scenarios (happy path + edge cases), one Scenario Outline with Examples table
2. Step definitions — implement every step using the element locators provided, Before/After hooks
3. Helper / page object if needed`,

    simple: `Generate a simple function-based test suite (no POM classes).
MUST include:
1. Setup and teardown
2. 5-6 test functions: page load, title check, form fill & submit, button interactions, input validation, error state
3. Clear assertion messages on failure`,
  };

  return `You are a senior QA automation engineer expert in ${fw}.
Task: ${patterns[pattern]}

Rules:
- Use ONLY ${fw} — no mixing with other libs
- Prefer CSS selectors; use XPath as fallback
- All imports must be at top; code must be runnable as-is
- Add concise inline comments explaining test intent
- Tests must be independent of each other`;
}

// ── AI API Calls ──────────────────────────────────────────────────────────────

const OPENAI_COMPAT = {
  openai:     { url: 'https://api.openai.com/v1/chat/completions',                            model: 'gpt-4o-mini' },
  groq:       { url: 'https://api.groq.com/openai/v1/chat/completions',                       model: 'llama-3.3-70b-versatile' },
  mistral:    { url: 'https://api.mistral.ai/v1/chat/completions',                            model: 'mistral-small-latest' },
  deepseek:   { url: 'https://api.deepseek.com/v1/chat/completions',                          model: 'deepseek-chat' },
  xai:        { url: 'https://api.x.ai/v1/chat/completions',                                  model: 'grok-3-mini-latest' },
  together:   { url: 'https://api.together.xyz/v1/chat/completions',                          model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  perplexity: { url: 'https://api.perplexity.ai/chat/completions',                            model: 'sonar' },
  cerebras:   { url: 'https://api.cerebras.ai/v1/chat/completions',                           model: 'llama-3.3-70b' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',                         model: 'meta-llama/llama-3.3-70b-instruct:free' },
  fireworks:  { url: 'https://api.fireworks.ai/inference/v1/chat/completions',                model: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  cohere:     { url: 'https://api.cohere.ai/compatibility/v1/chat/completions',               model: 'command-r-08-2024' },
};

async function callAI(provider, apiKey, system, user) {
  if (provider === 'gemini')    return gemini(apiKey, system, user);
  if (provider === 'anthropic') return anthropic(apiKey, system, user);
  if (OPENAI_COMPAT[provider])  return openaiCompat(provider, apiKey, system, user);
  throw new Error('Unknown provider: ' + provider);
}

async function openaiCompat(provider, key, system, user) {
  const { url, model } = OPENAI_COMPAT[provider];
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://aimitra.app';
    headers['X-Title'] = 'AiMitra Test Generator';
  }
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.15,
      max_tokens: 8192,
    }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `${provider} ${r.status}`); }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

async function gemini(key, system, user) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 8192 },
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `Gemini ${r.status}`); }
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function anthropic(key, system, user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `Anthropic ${r.status}`); }
  const d = await r.json();
  return d.content?.[0]?.text || '';
}
