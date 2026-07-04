/**
 * Main application logic
 * Page initialization, event binding, UI state management
 */
(function () {
  'use strict';

  // ==================== DOM cache ====================
  const DOM = {};

  // ==================== Utility functions ====================

  /** Show a toast message */
  function showToast(message, type) {
    type = type || 'info';
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast toast--' + type + ' toast--visible';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('toast--visible');
    }, 2500);
  }

  /** Toggle button loading state */
  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.classList.add('btn--loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }
  }

  // ==================== Door unlock logic ====================

  /**
   * Execute door unlock operation
   * Shared by both normal view and shared view
   * @param {string} curlCommand - cURL command string
   */
  async function executeDoorOpen(curlCommand) {
    const output = DOM.output;
    if (!output) return;

    try {
      // Parse cURL command
      const request = parseCurlCommand(curlCommand);

      // Execute the request
      const result = await ApiService.executeRequest(request);

      // Display result
      output.value = JSON.stringify(result, null, 2);

      // Send Bark notification
      await ApiService.sendBarkNotification(
        '开门成功',
        JSON.stringify(result)
      );
    } catch (error) {
      output.value = 'Error: ' + error.message;
      showToast(error.message, 'error');

      // Also notify on error (silent, non-blocking)
      ApiService.sendBarkNotification(
        '开门失败',
        error.message
      ).catch(function () { /* silently ignore */ });
    }
  }

  // ==================== Shared view ====================

  /** Render the shared "I want to open door" view */
  function renderSharedView(curlCommand) {
    var main = document.getElementById('mainContent');
    if (!main) return;

    main.innerHTML = [
      '<div class="center-content">',
        '<button id="openDoorBtn" class="btn btn--accent btn--lg">',
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
          '我要开门',
        '</button>',
      '</div>'
    ].join('');

    var btn = document.getElementById('openDoorBtn');
    btn.addEventListener('click', function () {
      setButtonLoading(btn, true);
      executeDoorOpen(curlCommand).finally(function () {
        setButtonLoading(btn, false);
      });
    });
  }

  // ==================== Normal view ====================

  /** Render the normal input view */
  function renderNormalView() {
    var main = document.getElementById('mainContent');
    if (!main) return;

    main.innerHTML = [
      '<div class="card">',
        '<h3 class="card__title">请输入 cURL 命令</h3>',
        '<textarea id="curlInput" class="textarea" placeholder="在此粘贴 cURL 命令..." autofocus></textarea>',
      '</div>',
      '<div class="button-group">',
        '<button id="parseBtn" class="btn btn--primary">解析并开门</button>',
        '<button id="shareBtn" class="btn btn--accent">',
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
          '生成分享链接',
        '</button>',
      '</div>',
      '<div id="shareSection" class="share-section">',
        '<div class="share-card">',
          '<div class="share-card__label">分享链接</div>',
          '<span id="shareUrl" class="share-card__url"></span>',
          '<div class="share-card__actions">',
            '<button id="copyBtn" class="btn btn--sm btn--primary">复制链接</button>',
            '<button id="openBtn" class="btn btn--sm btn--warning">打开链接</button>',
          '</div>',
          '<span id="copyFeedback" class="copy-feedback">链接已复制到剪贴板</span>',
        '</div>',
      '</div>'
    ].join('');

    bindNormalViewEvents();
    restoreSavedCommand();
  }

  /** Restore saved command from localStorage */
  function restoreSavedCommand() {
    var input = document.getElementById('curlInput');
    if (!input) return;
    var config = window.AppConfig || {};
    var key = config.storageKey || 'lastCurlCommand';
    var saved = localStorage.getItem(key);
    if (saved) {
      input.value = saved;
    }
  }

  /** Save command to localStorage */
  function saveCommand(command) {
    var config = window.AppConfig || {};
    var key = config.storageKey || 'lastCurlCommand';
    try {
      localStorage.setItem(key, command);
    } catch (e) {
      // localStorage may be full or disabled, fail silently
    }
  }

  /** Bind all events for the normal view */
  function bindNormalViewEvents() {
    var curlInput = document.getElementById('curlInput');
    var parseBtn = document.getElementById('parseBtn');
    var shareBtn = document.getElementById('shareBtn');
    var copyBtn = document.getElementById('copyBtn');
    var openBtn = document.getElementById('openBtn');

    // Parse and open door
    parseBtn.addEventListener('click', function () {
      var command = curlInput.value.trim();
      if (!command) {
        showToast('请先输入 cURL 命令', 'error');
        return;
      }

      saveCommand(command);
      setButtonLoading(parseBtn, true);
      executeDoorOpen(command).finally(function () {
        setButtonLoading(parseBtn, false);
      });
    });

    // Generate share link
    shareBtn.addEventListener('click', function () {
      var command = curlInput.value.trim();
      if (!command) {
        showToast('请先输入 cURL 命令', 'error');
        return;
      }

      saveCommand(command);

      var shareSection = document.getElementById('shareSection');
      var shareUrlEl = document.getElementById('shareUrl');
      var shareUrl = ShareService.generateShareUrl(command);

      shareSection.classList.add('share-section--visible');
      shareUrlEl.textContent = shareUrl; // Use textContent to prevent XSS
    });

    // Copy link
    copyBtn.addEventListener('click', function () {
      var shareUrlEl = document.getElementById('shareUrl');
      var url = shareUrlEl.textContent;
      ShareService.copyToClipboard(url).then(function () {
        var feedback = document.getElementById('copyFeedback');
        feedback.classList.add('copy-feedback--visible');
        setTimeout(function () {
          feedback.classList.remove('copy-feedback--visible');
        }, 2000);
      });
    });

    // Open link in new tab
    openBtn.addEventListener('click', function () {
      var shareUrlEl = document.getElementById('shareUrl');
      var url = shareUrlEl.textContent;
      window.open(url, '_blank');
    });
  }

  // ==================== Initialization ====================

  function init() {
    // Cache DOM reference
    DOM.output = document.getElementById('output');

    // Check if this is a shared link
    var sharedCommand = ShareService.getCommandFromUrl();

    if (sharedCommand) {
      // Shared link: render simplified "open door" view
      renderSharedView(sharedCommand);
    } else {
      // Normal: render full input view
      renderNormalView();
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
