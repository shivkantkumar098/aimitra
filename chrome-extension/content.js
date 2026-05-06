// AiMitra Test Generator — Content Script
// Runs on every page: handles DOM analysis and element picking.

let pickingActive = false;
let hoverOverlay = null;

// ── Selector Helpers ──────────────────────────────────────────────────────────

function getCssSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
  if (el.getAttribute('data-cy')) return `[data-cy="${el.getAttribute('data-cy')}"]`;
  if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;

  const path = [];
  let cur = el;
  while (cur && cur !== document.body) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) { path.unshift(`#${cur.id}`); break; }
    const siblings = cur.parentElement
      ? Array.from(cur.parentElement.children).filter(s => s.tagName === cur.tagName)
      : [];
    if (siblings.length > 1) seg += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
    path.unshift(seg);
    cur = cur.parentElement;
  }
  return path.join(' > ');
}

function getXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;
  const parts = [];
  let cur = el;
  while (cur && cur.nodeType === 1) {
    let idx = 1;
    let sib = cur.previousSibling;
    while (sib) { if (sib.nodeType === 1 && sib.tagName === cur.tagName) idx++; sib = sib.previousSibling; }
    parts.unshift(`${cur.tagName.toLowerCase()}[${idx}]`);
    cur = cur.parentNode;
  }
  return '/' + parts.join('/');
}

function elementInfo(el) {
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    name: el.getAttribute('name') || null,
    type: el.getAttribute('type') || null,
    placeholder: el.getAttribute('placeholder') || null,
    text: el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) || null,
    ariaLabel: el.getAttribute('aria-label') || null,
    role: el.getAttribute('role') || null,
    href: el.tagName === 'A' ? el.getAttribute('href') : null,
    testId: el.getAttribute('data-testid') || el.getAttribute('data-cy') || el.getAttribute('data-qa') || null,
    cssSelector: getCssSelector(el),
    xpath: getXPath(el),
  };
}

function isVisible(el) {
  try {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  } catch { return false; }
}

// ── Page Analysis ─────────────────────────────────────────────────────────────

function analyzePage() {
  const forms = Array.from(document.querySelectorAll('form')).slice(0, 6).map(f => ({
    id: f.id || null,
    action: f.getAttribute('action') || null,
    fields: Array.from(f.querySelectorAll('input:not([type=hidden]), select, textarea, button'))
      .slice(0, 12).map(elementInfo),
  }));

  const buttons = Array.from(document.querySelectorAll(
    'button, input[type="button"], input[type="submit"], input[type="reset"]'
  )).filter(isVisible).slice(0, 20).map(elementInfo);

  const inputs = Array.from(document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
  )).filter(isVisible).slice(0, 20).map(elementInfo);

  // ARIA / SPA interactive elements not covered by native tags
  const roleButtons = Array.from(document.querySelectorAll(
    '[role="button"]:not(button), [role="menuitem"], [role="tab"], [role="option"], [role="switch"], [tabindex="0"][onclick]'
  )).filter(isVisible).slice(0, 12).map(elementInfo);

  const roleInputs = Array.from(document.querySelectorAll(
    '[role="textbox"], [role="combobox"], [role="searchbox"], [role="spinbutton"], [contenteditable="true"]'
  )).filter(isVisible).slice(0, 8).map(elementInfo);

  const links = Array.from(document.querySelectorAll('a[href]'))
    .filter(el => isVisible(el) && el.textContent?.trim())
    .slice(0, 15).map(elementInfo);

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .slice(0, 5).map(h => h.textContent?.trim().slice(0, 80)).filter(Boolean);

  // Navigation labels help AI understand the app's structure
  const navItems = Array.from(document.querySelectorAll('nav a, [role="navigation"] a, [role="menubar"] [role="menuitem"]'))
    .filter(isVisible).slice(0, 10).map(el => el.textContent?.trim().slice(0, 40)).filter(Boolean);

  return {
    url: window.location.href,
    title: document.title,
    headings,
    navItems,
    forms,
    buttons,
    inputs,
    roleButtons,
    roleInputs,
    links,
  };
}

// ── Element Picking ───────────────────────────────────────────────────────────

function startPicking() {
  pickingActive = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', onHover, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

function stopPicking() {
  pickingActive = false;
  document.body.style.cursor = '';
  removeOverlay();
  document.removeEventListener('mouseover', onHover, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeyDown, true);
}

function onHover(e) {
  if (!pickingActive) return;
  e.stopPropagation();
  showOverlay(e.target);
}

function onClick(e) {
  if (!pickingActive) return;
  e.preventDefault();
  e.stopPropagation();

  const info = elementInfo(e.target);

  // Flash green to confirm selection
  const orig = e.target.style.outline;
  e.target.style.outline = '3px solid #10b981';
  setTimeout(() => { e.target.style.outline = orig; }, 600);

  // Save to storage
  chrome.storage.local.get(['pickedElements'], data => {
    const list = data.pickedElements || [];
    list.push(info);
    chrome.storage.local.set({ pickedElements: list });
  });
}

function onKeyDown(e) {
  if (e.key === 'Escape') stopPicking();
}

function showOverlay(el) {
  if (!hoverOverlay) {
    hoverOverlay = document.createElement('div');
    hoverOverlay.style.cssText = [
      'position:fixed', 'pointer-events:none', 'z-index:2147483647',
      'border:2px solid #7c3aed', 'background:rgba(124,58,237,0.08)',
      'border-radius:3px', 'transition:all 60ms ease',
      'box-shadow:0 0 0 1px rgba(124,58,237,0.3)',
    ].join(';');

    // Tooltip
    const tip = document.createElement('div');
    tip.id = '_aimitra_tip';
    tip.style.cssText = [
      'position:absolute', 'bottom:calc(100% + 6px)', 'left:0',
      'background:#1e1b4b', 'color:#a78bfa', 'font-size:11px',
      'font-family:monospace', 'padding:3px 7px', 'border-radius:4px',
      'white-space:nowrap', 'border:1px solid #4c1d95',
      'max-width:300px', 'overflow:hidden', 'text-overflow:ellipsis',
    ].join(';');
    hoverOverlay.appendChild(tip);
    document.body.appendChild(hoverOverlay);
  }

  const rect = el.getBoundingClientRect();
  hoverOverlay.style.top = rect.top + 'px';
  hoverOverlay.style.left = rect.left + 'px';
  hoverOverlay.style.width = rect.width + 'px';
  hoverOverlay.style.height = rect.height + 'px';

  const tip = document.getElementById('_aimitra_tip');
  if (tip) tip.textContent = getCssSelector(el);
}

function removeOverlay() {
  if (hoverOverlay) { hoverOverlay.remove(); hoverOverlay = null; }
}

// ── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ANALYZE_PAGE') {
    sendResponse(analyzePage());
  }
  if (msg.type === 'START_PICKING') {
    startPicking();
    sendResponse({ ok: true });
  }
  if (msg.type === 'STOP_PICKING') {
    stopPicking();
    sendResponse({ ok: true });
  }
  if (msg.type === 'CLEAR_PICKED') {
    chrome.storage.local.set({ pickedElements: [] });
    sendResponse({ ok: true });
  }
  return true;
});
