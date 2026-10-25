/**
 * Nimbus — Content Script
 * Real-time context extractor, ghost suggestion manager,
 * and keyboard shortcut orchestrator for X, LinkedIn, and Gmail.
 */

(function () {
  // Prevent duplicate injection
  if (window.__nimbus_injected) return;
  window.__nimbus_injected = true;

  const CLOUD_SVG = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 18C4.01472 18 2 15.9853 2 13.5C2 11.1645 3.78453 9.24584 6.09633 9.02341C6.67139 6.17134 9.18342 4 12.2 4C15.6518 4 18.5 6.74543 18.5 10.1538C18.5 10.3734 18.4878 10.5902 18.4638 10.8033C20.4853 11.2339 22 13.0189 22 15.1667C22 17.6519 19.9853 19.6667 17.5 19.6667H6.5" stroke="#c8aed6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8" cy="8" r="0.75" fill="#f4ebef"/>
      <circle cx="16" cy="7" r="0.75" fill="#f4ebef"/>
    </svg>
  `;

  let currentTarget = null;
  let currentPlatform = detectPlatform();
  let pillElement = null;
  let ghostBoxElement = null;
  let activeSuggestion = null;
  let activeTone = 'Warm';
  let isGenerating = false;
  let debounceTimer = null;
  let dismissedForCurrent = false;

  // Platform detection
  function detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('mail.google.com')) return 'gmail';
    // If local test file or test runner, check for test harness clues
    if (document.querySelector('[data-testid="tweetTextarea_0"]') || document.querySelector('.tweet-mock-thread')) return 'twitter';
    if (document.querySelector('.linkedin-post-card') || document.querySelector('.comments-comment-box__editor')) return 'linkedin';
    if (document.querySelector('.gmail-thread-container') || document.querySelector('[aria-label*="Message Body"]')) return 'gmail';
    return 'general';
  }

  // Extract thread context
  function extractContext(el) {
    currentPlatform = detectPlatform();
    let thread = '';

    try {
      if (currentPlatform === 'twitter') {
        // Twitter real or mock
        const tweetContainer = el.closest('article[data-testid="tweet"]') || 
                               el.closest('.tweet-mock-thread') ||
                               document.querySelector('article[data-testid="tweet"]') ||
                               document.querySelector('.tweet-mock-thread');
        if (tweetContainer) {
          const textEl = tweetContainer.querySelector('[data-testid="tweetText"]') || 
                         tweetContainer.querySelector('.tweet-text') || 
                         tweetContainer.querySelector('p');
          const authorEl = tweetContainer.querySelector('[data-testid="User-Name"]') || 
                           tweetContainer.querySelector('.tweet-author');
          const author = authorEl ? authorEl.innerText.replace(/\n+/g, ' ') : 'Author';
          const text = textEl ? textEl.innerText : '';
          thread = `Tweet by ${author}: "${text}"`;
        }
      } else if (currentPlatform === 'linkedin') {
        // LinkedIn real or mock
        const postContainer = el.closest('.feed-shared-update-v2') || 
                              el.closest('.linkedin-post-card') ||
                              document.querySelector('.feed-shared-update-v2') ||
                              document.querySelector('.linkedin-post-card');
        if (postContainer) {
          const textEl = postContainer.querySelector('.feed-shared-update-v2__description') || 
                         postContainer.querySelector('.update-components-text') || 
                         postContainer.querySelector('.post-text') ||
                         postContainer.querySelector('p');
          const authorEl = postContainer.querySelector('.update-components-actor__name') || 
                           postContainer.querySelector('.post-author');
          const author = authorEl ? authorEl.innerText.trim() : 'Connection';
          const text = textEl ? textEl.innerText.trim() : '';
          thread = `LinkedIn Post by ${author}: "${text}"`;
        }
      } else if (currentPlatform === 'gmail') {
        // Gmail real or mock
        const threadContainer = el.closest('.gmail-thread-container') ||
                                document.querySelector('.gmail-thread-container') ||
                                document.querySelector('.nH.hx');
        const subjectEl = document.querySelector('h2.hP') || 
                          document.querySelector('.email-subject') || 
                          document.querySelector('input[name="subjectbox"]');
        const subject = subjectEl ? (subjectEl.innerText || subjectEl.value || '') : 'Update';

        let lastMsg = '';
        const msgEl = threadContainer ? 
                      (threadContainer.querySelector('.email-body') || threadContainer.querySelector('.a3s.aiL')) : 
                      document.querySelector('.a3s.aiL');
        if (msgEl) lastMsg = msgEl.innerText.slice(0, 400);

        thread = `Email Subject: "${subject}". Message: "${lastMsg}"`;
      }
    } catch (e) {
      console.warn('[Nimbus] Context extraction error:', e);
    }

    return thread;
  }

  // Get current user input text from element
  function getElementText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    if (el.isContentEditable) {
      return el.innerText || el.textContent || '';
    }
    return '';
  }

  // Create UI elements
  function initUI() {
    if (pillElement && ghostBoxElement) return;

    // Pill
    pillElement = document.createElement('div');
    pillElement.className = 'nimbus-pill-container';
    pillElement.innerHTML = `
      <div class="nimbus-pill-icon">${CLOUD_SVG}</div>
      <span class="nimbus-pill-title">Nimbus</span>
      <div class="nimbus-pill-tone" id="nimbus-active-tone" title="Click or press Alt+] to cycle tone">${activeTone}</div>
      <span class="nimbus-pill-keycap">Tab</span>
    `;
    document.body.appendChild(pillElement);

    pillElement.querySelector('#nimbus-active-tone').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      cycleTone();
    });

    // Ghost Preview Box
    ghostBoxElement = document.createElement('div');
    ghostBoxElement.className = 'nimbus-ghost-preview-box';
    ghostBoxElement.innerHTML = `
      <div class="nimbus-ghost-header">
        <div class="nimbus-ghost-badge">
          ${CLOUD_SVG}
          <span>Nimbus Condensation</span>
        </div>
        <div class="nimbus-ghost-actions">
          <span class="nimbus-pill-model" id="nimbus-provider-label">Local AI</span>
          <span><span class="nimbus-pill-keycap">Alt + ]</span> Tone</span>
        </div>
      </div>
      <div class="nimbus-ghost-text" id="nimbus-ghost-content"></div>
      <div class="nimbus-ghost-footer">
        <button class="nimbus-dismiss-btn" id="nimbus-btn-dismiss">Dismiss (Esc)</button>
        <button class="nimbus-accept-btn" id="nimbus-btn-accept">Accept <span class="nimbus-pill-keycap">Tab</span></button>
      </div>
    `;
    document.body.appendChild(ghostBoxElement);

    ghostBoxElement.querySelector('#nimbus-btn-accept').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      acceptSuggestion();
    });

    ghostBoxElement.querySelector('#nimbus-btn-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      hideGhost();
      dismissedForCurrent = true;
    });
  }

  // Position UI relative to active target
  function updatePosition() {
    if (!currentTarget || !pillElement || !ghostBoxElement) return;

    const rect = currentTarget.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Pill sits at bottom-right of target box
    const pillTop = rect.bottom + scrollTop - 38;
    const pillLeft = Math.max(10, rect.right + scrollLeft - 180);

    pillElement.style.top = `${pillTop}px`;
    pillElement.style.left = `${pillLeft}px`;

    // Ghost box sits directly below target box
    const ghostTop = rect.bottom + scrollTop + 8;
    const ghostLeft = Math.max(10, rect.left + scrollLeft);
    const ghostWidth = Math.min(620, Math.max(340, rect.width));

    ghostBoxElement.style.top = `${ghostTop}px`;
    ghostBoxElement.style.left = `${ghostLeft}px`;
    ghostBoxElement.style.width = `${ghostWidth}px`;
  }

  // Show / Hide UI
  function showPill() {
    initUI();
    updatePosition();
    pillElement.classList.add('is-visible');
  }

  function hidePill() {
    if (pillElement) pillElement.classList.remove('is-visible');
  }

  function showGhost(text, providerLabel = 'Local AI') {
    initUI();
    activeSuggestion = text;
    const content = ghostBoxElement.querySelector('#nimbus-ghost-content');
    const label = ghostBoxElement.querySelector('#nimbus-provider-label');
    
    if (label) label.innerText = providerLabel;
    
    const userTyped = getElementText(currentTarget);
    if (userTyped.trim().length > 0) {
      content.innerHTML = `<span class="nimbus-ghost-text-prefix">${escapeHtml(userTyped)}</span><span class="nimbus-ghost-text-highlight">${escapeHtml(text)}</span>`;
    } else {
      content.innerHTML = `<span class="nimbus-ghost-text-highlight">${escapeHtml(text)}</span>`;
    }

    updatePosition();
    ghostBoxElement.classList.add('is-visible');
  }

  function hideGhost() {
    if (ghostBoxElement) ghostBoxElement.classList.remove('is-visible');
    activeSuggestion = null;
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Cycle Tone
  async function cycleTone() {
    const tones = ['Warm', 'Witty', 'Brief', 'Professional', 'Counter'];
    const idx = tones.indexOf(activeTone);
    activeTone = tones[(idx + 1) % tones.length];

    if (pillElement) {
      const toneEl = pillElement.querySelector('#nimbus-active-tone');
      if (toneEl) toneEl.innerText = activeTone;
    }

    // Trigger re-generation immediately
    triggerSuggestion(true);
  }

  // Trigger suggestion generation
  async function triggerSuggestion(force = false) {
    if (!currentTarget || isGenerating) return;
    if (dismissedForCurrent && !force) return;

    const userTyped = getElementText(currentTarget);
    const threadContext = extractContext(currentTarget);

    isGenerating = true;

    // Direct in-page engine call or runtime message
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'GENERATE_SUGGESTION',
          platform: currentPlatform,
          threadContext: threadContext,
          userTyped: userTyped,
          tone: activeTone
        }, (res) => {
          isGenerating = false;
          if (res && res.success && res.text) {
            showGhost(res.text, `${res.providerUsed || 'Local AI'} (${res.latencyMs || 15}ms)`);
          } else {
            fallbackLocal(threadContext, userTyped);
          }
        });
      } else {
        fallbackLocal(threadContext, userTyped);
      }
    } catch (err) {
      fallbackLocal(threadContext, userTyped);
    }
  }

  function fallbackLocal(threadContext, userTyped) {
    isGenerating = false;
    if (window.NimbusEngine) {
      const text = window.NimbusEngine.generateFallbackReply({
        platform: currentPlatform,
        threadContext: threadContext,
        userTyped: userTyped,
        tone: activeTone
      });
      showGhost(text, 'Local Heuristic (8ms)');
    }
  }

  // Accept current suggestion and insert into editor
  function acceptSuggestion() {
    if (!currentTarget || !activeSuggestion) return;

    const toInsert = activeSuggestion;
    currentTarget.focus();

    if (currentTarget.tagName === 'TEXTAREA' || currentTarget.tagName === 'INPUT') {
      const start = currentTarget.selectionStart || 0;
      const end = currentTarget.selectionEnd || 0;
      const val = currentTarget.value;
      currentTarget.value = val.slice(0, start) + toInsert + val.slice(end);
      currentTarget.selectionStart = currentTarget.selectionEnd = start + toInsert.length;
      currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
      currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (currentTarget.isContentEditable) {
      // Robust insert for Twitter Lexical, LinkedIn DraftJS, and Gmail
      const success = document.execCommand('insertText', false, toInsert);
      if (!success) {
        // Fallback DOM append
        currentTarget.innerText = (currentTarget.innerText || '') + toInsert;
      }
      currentTarget.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: toInsert
      }));
    }

    hideGhost();
    dismissedForCurrent = true;
  }

  // Keyboard handler
  function handleKeyDown(e) {
    // Alt + ] => Cycle tone
    if (e.altKey && (e.key === ']' || e.code === 'BracketRight')) {
      e.preventDefault();
      e.stopPropagation();
      cycleTone();
      return;
    }

    // Tab => Accept suggestion if ghost is visible
    if (e.key === 'Tab' && !e.shiftKey && ghostBoxElement && ghostBoxElement.classList.contains('is-visible')) {
      e.preventDefault();
      e.stopPropagation();
      acceptSuggestion();
      return;
    }

    // Escape => Dismiss suggestion
    if (e.key === 'Escape' && ghostBoxElement && ghostBoxElement.classList.contains('is-visible')) {
      e.preventDefault();
      e.stopPropagation();
      hideGhost();
      dismissedForCurrent = true;
      return;
    }
  }

  // Input & Focus tracking
  function onFocus(e) {
    const el = e.target;
    if (!isTargetable(el)) return;

    currentTarget = el;
    dismissedForCurrent = false;
    showPill();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      triggerSuggestion();
    }, 200);
  }

  function onInput(e) {
    const el = e.target;
    if (el !== currentTarget) return;

    dismissedForCurrent = false;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      triggerSuggestion();
    }, 280);
  }

  function onBlur(e) {
    // Delay hiding so clicks on accept/tone buttons can process
    setTimeout(() => {
      if (document.activeElement !== currentTarget && 
          !pillElement?.contains(document.activeElement) && 
          !ghostBoxElement?.contains(document.activeElement)) {
        hidePill();
        hideGhost();
        currentTarget = null;
      }
    }, 250);
  }

  function isTargetable(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return ['text', 'search', 'email', 'url', ''].includes(type);
    }
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox') {
      return true;
    }
    return false;
  }

  // Attach global event listeners
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('blur', onBlur, true);
  document.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);

  console.log(`[Nimbus] Content script loaded. Active platform: ${currentPlatform}`);
})();
