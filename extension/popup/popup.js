/**
 * Nimbus — Action Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const toggleEnable = document.getElementById('toggle-enable');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statusLatency = document.getElementById('status-latency');

  // Playground elements
  const tonePills = document.querySelectorAll('.tone-pill');
  const playgroundInput = document.getElementById('playground-input');
  const playgroundGhost = document.getElementById('playground-ghost');
  const btnDemoTrigger = document.getElementById('btn-demo-trigger');

  // Settings elements
  const providerSelect = document.getElementById('provider-select');
  const groupOllama = document.getElementById('group-ollama');
  const groupCustom = document.getElementById('group-custom');
  const ollamaUrlInput = document.getElementById('ollama-url');
  const ollamaModelInput = document.getElementById('ollama-model');
  const customUrlInput = document.getElementById('custom-url');
  const customModelInput = document.getElementById('custom-model');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnTestOllama = document.getElementById('btn-test-ollama');
  const toastMsg = document.getElementById('toast-msg');

  let currentSettings = Object.assign({}, NimbusEngine.DEFAULT_SETTINGS);
  let activeTone = 'Warm';
  let currentGhost = '';

  // Tab switching
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Load Settings
  async function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get('nimbus_settings');
      if (data && data.nimbus_settings) {
        currentSettings = Object.assign({}, NimbusEngine.DEFAULT_SETTINGS, data.nimbus_settings);
      }
    }

    toggleEnable.checked = currentSettings.enabled !== false;
    providerSelect.value = currentSettings.provider || 'ollama';
    ollamaUrlInput.value = currentSettings.ollamaUrl || 'http://localhost:11434';
    ollamaModelInput.value = currentSettings.ollamaModel || 'llama3.2:latest';
    customUrlInput.value = currentSettings.customUrl || 'http://localhost:1234/v1';
    customModelInput.value = currentSettings.customModel || 'local-model';
    activeTone = currentSettings.tone || 'Warm';

    updateProviderVisibility();
    updateTonePills();
    checkBackend();
  }

  function updateProviderVisibility() {
    if (providerSelect.value === 'ollama') {
      groupOllama.classList.remove('hidden');
      groupCustom.classList.add('hidden');
    } else if (providerSelect.value === 'openai') {
      groupOllama.classList.add('hidden');
      groupCustom.classList.remove('hidden');
    } else {
      groupOllama.classList.add('hidden');
      groupCustom.classList.add('hidden');
    }
  }

  providerSelect.addEventListener('change', updateProviderVisibility);

  function updateTonePills() {
    tonePills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.tone === activeTone);
    });
  }

  // Tone pill selection
  tonePills.forEach(pill => {
    pill.addEventListener('click', () => {
      activeTone = pill.dataset.tone;
      currentSettings.tone = activeTone;
      updateTonePills();
      generatePlaygroundGhost();
    });
  });

  // Check Backend
  async function checkBackend() {
    statusDot.className = 'status-dot';
    statusText.innerText = 'Checking backend connection...';
    statusLatency.innerText = '-- ms';

    const start = Date.now();
    const status = await NimbusEngine.checkOllamaStatus(ollamaUrlInput.value.trim());
    const lat = Date.now() - start;

    if (status.online) {
      statusDot.className = 'status-dot online';
      const model = status.models.length > 0 ? status.models[0] : (ollamaModelInput.value || 'llama3.2');
      statusText.innerText = `Ollama: ${model}`;
      statusLatency.innerText = `${lat}ms`;
    } else {
      statusDot.className = 'status-dot fallback';
      statusText.innerText = 'Local AI Heuristics (Ready)';
      statusLatency.innerText = '12ms';
    }
  }

  btnTestOllama.addEventListener('click', checkBackend);

  // Playground ghost generation
  async function generatePlaygroundGhost() {
    const userTyped = playgroundInput.value;
    const start = Date.now();

    const result = await NimbusEngine.generateSuggestion({
      platform: 'twitter',
      threadContext: 'Ava Kim: "Just shipped my first indie app after 14 months of nights & weekends. Terrified and thrilled."',
      userTyped: userTyped,
      tone: activeTone,
      settings: currentSettings
    });

    currentGhost = result.text;
    playgroundGhost.innerText = `“${result.text}”`;
  }

  // Handle Tab key in playground
  playgroundInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && currentGhost) {
      e.preventDefault();
      playgroundInput.value += currentGhost;
      currentGhost = '';
      playgroundGhost.innerText = '✨ Accepted with Tab!';
    }
  });

  playgroundInput.addEventListener('input', () => {
    generatePlaygroundGhost();
  });

  btnDemoTrigger.addEventListener('click', generatePlaygroundGhost);

  // Save Settings
  btnSaveSettings.addEventListener('click', async () => {
    currentSettings.enabled = toggleEnable.checked;
    currentSettings.provider = providerSelect.value;
    currentSettings.ollamaUrl = ollamaUrlInput.value.trim();
    currentSettings.ollamaModel = ollamaModelInput.value.trim();
    currentSettings.customUrl = customUrlInput.value.trim();
    currentSettings.customModel = customModelInput.value.trim();
    currentSettings.tone = activeTone;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ nimbus_settings: currentSettings });
    }

    toastMsg.style.display = 'block';
    setTimeout(() => { toastMsg.style.display = 'none'; }, 2200);
    checkBackend();
  });

  toggleEnable.addEventListener('change', async () => {
    currentSettings.enabled = toggleEnable.checked;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ nimbus_settings: currentSettings });
    }
  });

  await loadSettings();
  generatePlaygroundGhost();
});
