// AiMitra Test Generator — Background Service Worker
// Minimal — just keeps the extension alive and handles icon badge.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ pickedElements: [] });
});
