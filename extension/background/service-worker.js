/**
 * Nimbus Background Service Worker
 * Handles storage, API communication, and shortcut commands.
 */

importScripts('../ai/engine.js');

const DEFAULT_SETTINGS = NimbusEngine.DEFAULT_SETTINGS;

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get('nimbus_settings');
  if (!existing || !existing.nimbus_settings) {
    await chrome.storage.local.set({ nimbus_settings: DEFAULT_SETTINGS });
  }
  console.log('[Nimbus] Service worker initialized.');
});

// Helper to get merged settings
async function getSettings() {
  const data = await chrome.storage.local.get('nimbus_settings');
  return Object.assign({}, DEFAULT_SETTINGS, data.nimbus_settings || {});
}

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    getSettings().then(settings => sendResponse({ success: true, settings }));
    return true; // Keep channel open for async response
  }

  if (request.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ nimbus_settings: request.settings }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'CHECK_BACKEND_STATUS') {
    getSettings().then(async (settings) => {
      const ollama = await NimbusEngine.checkOllamaStatus(settings.ollamaUrl);
      sendResponse({ success: true, ollama });
    });
    return true;
  }

  if (request.type === 'GENERATE_SUGGESTION') {
    getSettings().then(async (settings) => {
      if (!settings.enabled) {
        sendResponse({ success: false, reason: 'disabled' });
        return;
      }
      try {
        const result = await NimbusEngine.generateSuggestion({
          platform: request.platform,
          threadContext: request.threadContext,
          userTyped: request.userTyped,
          tone: request.tone || settings.tone,
          settings: settings
        });
        sendResponse({ success: true, ...result });
      } catch (err) {
        sendResponse({
          success: true,
          text: NimbusEngine.generateFallbackReply({
            platform: request.platform,
            threadContext: request.threadContext,
            userTyped: request.userTyped,
            tone: request.tone || settings.tone
          }),
          providerUsed: 'local-heuristic-safe',
          latencyMs: 12
        });
      }
    });
    return true;
  }

  if (request.type === 'CYCLE_TONE') {
    getSettings().then(async (settings) => {
      const tones = NimbusEngine.TONES;
      const idx = tones.indexOf(settings.tone);
      const nextTone = tones[(idx + 1) % tones.length];
      settings.tone = nextTone;
      await chrome.storage.local.set({ nimbus_settings: settings });
      sendResponse({ success: true, nextTone });
    });
    return true;
  }
});
