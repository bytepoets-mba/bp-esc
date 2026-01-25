// Wait for DOM and Tauri to be ready
window.addEventListener('DOMContentLoaded', () => {
  if (!window.__TAURI__) {
    console.error('ERROR: Tauri API not available');
    return;
  }

  const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;
  
  // State
  let currentSettings = null;
  let currentBalance = null;
  let autoRefreshTimer = null;

  // DOM elements - States
  const loadingState = document.getElementById('loadingState');
  const balanceState = document.getElementById('balanceState');
  const miteState = document.getElementById('miteState');
  const settingsState = document.getElementById('settingsState');
  
  // Tab elements
  const tabs = document.querySelectorAll('.nav-tab');

  // Tab switching logic
  tabs.forEach(tab => {
    tab.onclick = () => {
      const target = tab.getAttribute('data-tab');
      
      // Update tab UI
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show state
      if (target === 'balance') showState('balance');
      else if (target === 'mite') showState('mite');
      else if (target === 'settings') {
        syncSettingsToUI();
        showState('settings');
      }
    };
  });
  
  // DOM elements - Display
  const errorDisplay = document.getElementById('errorDisplay');
  const limitValue = document.getElementById('limitValue');
  const usageValue = document.getElementById('usageValue');
  const remainingValue = document.getElementById('remainingValue');
  const lastUpdated = document.getElementById('lastUpdated');
  const appVersion = document.getElementById('appVersion');

  // DOM elements - Settings
  const apiKeyInputSettings = document.getElementById('apiKeyInputSettings');
  const refreshValue = document.getElementById('refreshValue');
  const refreshMinus = document.getElementById('refreshMinus');
  const refreshPlus = document.getElementById('refreshPlus');
  const unitPercent = document.getElementById('unitPercent');
  const unitDollar = document.getElementById('unitDollar');
  const absTypeSection = document.getElementById('absTypeSection');
  const typeRemaining = document.getElementById('typeRemaining');
  const typeUsed = document.getElementById('typeUsed');
  const showUnitToggle = document.getElementById('showUnitToggle');
  const autocheckToggle = document.getElementById('autocheckToggle');
  const startWindowToggle = document.getElementById('startWindowToggle');
  const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
  const unfocusedOverlayToggle = document.getElementById('unfocusedOverlayToggle');
  const shortcutInput = document.getElementById('shortcutInput');
  const shortcutEnabledToggle = document.getElementById('shortcutEnabledToggle');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // DOM elements - Actions
  const refreshBtn = document.getElementById('refreshBtn');
  const quitBtn = document.getElementById('quitBtn');
  const hideBtn = document.getElementById('hideBtn');

  // DOM elements - Confirm Dialog
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');
  let confirmCallback = null;

  function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
    setTimeout(() => {
      errorDisplay.classList.add('hidden');
    }, 5000);
  }

  function hideError() {
    errorDisplay.classList.add('hidden');
  }

  // State management
  async function showState(state) {
    [loadingState, balanceState, miteState, settingsState].forEach(s => s.classList.add('hidden'));
    
    // Update active tab UI if state change was programmatic
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === state) t.classList.add('active');
      else t.classList.remove('active');
    });

    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'balance') balanceState.classList.remove('hidden');
    else if (state === 'mite') miteState.classList.remove('hidden');
    else if (state === 'settings') {
      settingsState.classList.remove('hidden');
      if (!apiKeyInputSettings.value) apiKeyInputSettings.focus();
    }
    
    // Trigger resize on state change
    performResize();
  }

// --- SIMPLE AUTO-RESIZE LOGIC ---
let resizeTimeout = null;

async function performResize() {
  try {
    const { getCurrentWindow, LogicalSize } = window.__TAURI__.window;
    const appWindow = getCurrentWindow();
    const container = document.querySelector('.container');
    if (!container) return;

    const totalContentHeight = container.scrollHeight;

    // Update debug labels if visible
    const shLabel = document.getElementById('shValue');
    const chLabel = document.getElementById('chValue');
    const whLabel = document.getElementById('whValue');
    if (shLabel) shLabel.textContent = totalContentHeight;
    if (chLabel) chLabel.textContent = container.clientHeight;
    if (whLabel) whLabel.textContent = window.innerHeight;

    const finalHeight = Math.min(Math.max(totalContentHeight, 400), 800);
    
    // One call, let the OS handle the physics
    await appWindow.setSize(new LogicalSize(800, finalHeight));
  } catch (e) {
    // console.error('Resize failed:', e);
  }
}

// Single debounce to wait for layout to settle
const resizeObserver = new ResizeObserver(() => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(performResize, 100);
});
// ----------------------------------

resizeObserver.observe(document.body);

// Trigger on all relevant events
window.addEventListener('load', performResize);
window.addEventListener('transitionend', (e) => {
  if (e.target.closest('.state') || e.target.closest('.container')) {
    performResize();
  }
});
// ---------------------------------------------------
// ---------------------------------------------------

  // Confirm dialog helper
  function showConfirm(message, onConfirm) {
    confirmMessage.textContent = message;
    confirmCallback = onConfirm;
    confirmDialog.classList.remove('hidden');
  }

  confirmCancel.onclick = () => {
    confirmDialog.classList.add('hidden');
    confirmCallback = null;
  };

  confirmOk.onclick = () => {
    confirmDialog.classList.add('hidden');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  };

  // Helper function to check if settings are visible
  function isSettingsVisible() {
    return !settingsState.classList.contains('hidden');
  }

  // Auto-refresh management
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearTimeout(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    if (!currentSettings?.auto_refresh_enabled) return;
    
    const intervalMs = (currentSettings.refresh_interval_minutes || 5) * 60 * 1000;
    autoRefreshTimer = setTimeout(() => {
      loadBalance();
    }, intervalMs);
  }

  // Format currency
  function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  }

  // Display balance
  async function displayBalance(balance, shouldShowState = true) {
    currentBalance = balance;
    
    // Check if we have valid balance data
    const hasData = balance && balance.limit !== null && balance.remaining !== null;
    
    // Calculate percentage
    const percentage = (hasData && balance.limit > 0) 
        ? Math.floor((balance.remaining / balance.limit) * 100) 
        : 0;
    
    // Update label with percentage
    const remainingLabel = remainingValue.parentElement.querySelector('.label');
    if (remainingLabel) {
      remainingLabel.textContent = hasData ? `${percentage}% Remaining:` : 'Remaining:';
    }

    limitValue.textContent = formatCurrency(hasData ? balance.limit : null);
    usageValue.textContent = formatCurrency(hasData ? balance.usage : null);
    remainingValue.textContent = formatCurrency(hasData ? balance.remaining : null);
    
    // Color code remaining
    if (hasData && balance.remaining !== null) {
      if (balance.remaining < 0) remainingValue.style.color = '#dc2626';
      else if (balance.remaining < 5) remainingValue.style.color = '#ea580c';
      else remainingValue.style.color = '#6366f1';
    } else {
      remainingValue.style.color = ''; // Reset to default
    }
    
    // Update menubar icon
    try {
      await invoke('update_menubar_display', { balance, settings: currentSettings });
    } catch (error) {
      console.error('Failed to update menubar icon:', error);
    }
    
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    lastUpdated.textContent = 'Last updated: ' + (hasData ? now : '-');
    if (shouldShowState) showState('balance');
  }

  // Reset UI to empty state
  async function resetBalanceDisplay() {
    const emptyBalance = {
      limit: null,
      usage: null,
      remaining: null
    };
    await displayBalance(emptyBalance, false);
  }

  // Load balance
  async function loadBalance() {
    if (!currentSettings?.api_key) {
      showState('settings');
      return;
    }
    
    const settingsActive = isSettingsVisible();
    if (!settingsActive) showState('loading');
    hideError();
    
    try {
      const balance = await invoke('fetch_balance', { apiKey: currentSettings.api_key });
      displayBalance(balance, !settingsActive);
      startAutoRefresh();
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      await resetBalanceDisplay();
      if (!settingsActive) showState('balance');
      showError(error);
      startAutoRefresh();
    }
  }

  // Settings UI Sync
  function syncSettingsToUI() {
    if (!currentSettings) return;

    apiKeyInputSettings.value = currentSettings.api_key || '';
    refreshValue.textContent = currentSettings.refresh_interval_minutes;
    showUnitToggle.checked = currentSettings.show_unit;
    autocheckToggle.checked = currentSettings.auto_refresh_enabled;
    startWindowToggle.checked = currentSettings.show_window_on_start;
    alwaysOnTopToggle.checked = currentSettings.always_on_top;
    unfocusedOverlayToggle.checked = currentSettings.unfocused_overlay;

    shortcutInput.value = currentSettings.global_shortcut || 'F19';
    shortcutEnabledToggle.checked = currentSettings.global_shortcut_enabled;
    
    if (currentSettings.show_percentage) {
      unitPercent.classList.add('active');
      unitDollar.classList.remove('active');
    } else {
      unitPercent.classList.remove('active');
      unitDollar.classList.add('active');
    }
    
    if (currentSettings.show_remaining) {
      typeRemaining.classList.add('active');
      typeUsed.classList.remove('active');
    } else {
      typeRemaining.classList.remove('active');
      typeUsed.classList.add('active');
    }
  }

  // Action: Save Settings
  async function saveSettingsAction(silent = false) {
    const newSettings = {
      ...currentSettings,
      api_key: apiKeyInputSettings.value.trim(),
      refresh_interval_minutes: parseInt(refreshValue.textContent),
      show_unit: showUnitToggle.checked,
      auto_refresh_enabled: autocheckToggle.checked,
      show_window_on_start: startWindowToggle.checked,
      always_on_top: alwaysOnTopToggle.checked,
      unfocused_overlay: unfocusedOverlayToggle.checked,
      global_shortcut: shortcutInput.value.trim() || 'F19',
      global_shortcut_enabled: shortcutEnabledToggle.checked,
      show_percentage: unitPercent.classList.contains('active'),
      show_remaining: typeRemaining.classList.contains('active'),
    };

    try {
      await invoke('save_settings', { settings: newSettings });
      currentSettings = newSettings;
      if (currentBalance) {
        displayBalance(currentBalance, false);
      }
    } catch (error) {
      if (!silent) showError(error);
    }
  }

  // Event Listeners - Settings
  refreshMinus.onclick = async () => {
    let val = parseInt(refreshValue.textContent);
    if (val > 1) {
      refreshValue.textContent = val - 1;
      await saveSettingsAction(true);
    }
  };
  refreshPlus.onclick = async () => {
    let val = parseInt(refreshValue.textContent);
    if (val < 60) {
      refreshValue.textContent = val + 1;
      await saveSettingsAction(true);
    }
  };

  unitPercent.onclick = async () => {
    unitPercent.classList.add('active');
    unitDollar.classList.remove('active');
    await saveSettingsAction(true);
  };
  unitDollar.onclick = async () => {
    unitPercent.classList.remove('active');
    unitDollar.classList.add('active');
    await saveSettingsAction(true);
  };

  typeRemaining.onclick = async () => {
    typeRemaining.classList.add('active');
    typeUsed.classList.remove('active');
    await saveSettingsAction(true);
  };
  typeUsed.onclick = async () => {
    typeRemaining.classList.remove('active');
    typeUsed.classList.add('active');
    await saveSettingsAction(true);
  };

  showUnitToggle.onchange = () => saveSettingsAction(true);
  autocheckToggle.onchange = async () => {
    await saveSettingsAction(true);
    if (currentSettings.auto_refresh_enabled) startAutoRefresh();
    else stopAutoRefresh();
  };
  startWindowToggle.onchange = () => saveSettingsAction(true);
  alwaysOnTopToggle.onchange = () => saveSettingsAction(true);
  unfocusedOverlayToggle.onchange = () => {
    saveSettingsAction(true);
    if (!unfocusedOverlayToggle.checked) {
      document.body.classList.remove('unfocused');
    } else if (!document.hasFocus()) {
      document.body.classList.add('unfocused');
    }
  };
  apiKeyInputSettings.onblur = () => saveSettingsAction(true);
  shortcutInput.onblur = () => saveSettingsAction(true);
  shortcutEnabledToggle.onchange = () => saveSettingsAction(true);

  // Reset button - confirm and wipe data
  resetSettingsBtn.onclick = () => {
    showConfirm('Reset all settings and clear your API key? This cannot be undone.', async () => {
      try {
        await invoke('reset_settings');
        currentSettings = await invoke('read_settings');
        currentBalance = null;
        stopAutoRefresh();
        syncSettingsToUI();
        showState('settings');
      } catch (error) {
        showError('Failed to reset: ' + error);
      }
    });
  };

  refreshBtn.onclick = loadBalance;
  quitBtn.onclick = () => invoke('quit_app');
  hideBtn.onclick = () => invoke('toggle_window_visibility');

  // Toggle debug info on logo double click
  const bpLogo = document.getElementById('bpLogo');
  const checkLabel = document.getElementById('checkLabel');
  if (bpLogo && checkLabel) {
    bpLogo.ondblclick = () => {
      const isHidden = checkLabel.style.display === 'none';
      checkLabel.style.display = isHidden ? 'block' : 'none';
      
      // Force initial status when showing
      if (!isHidden) {
        const focusLabel = document.getElementById('focusValue');
        if (focusLabel) {
          focusLabel.textContent = document.hasFocus() ? 'FOCUSED' : 'BLURRED';
        }
      }
    };
  }

  // Setup event listener for window visibility control
  async function setupWindowVisibilityListener() {
    try {
      await window.__TAURI__.event.listen('show-main-window', () => {
        console.log('📍 Received show-main-window event');
        showState('balance');
      });
    } catch (error) {
      console.error('Failed to setup window visibility listener:', error);
    }
  }

  // Validate API key format
  function validateApiKeyFormat(key) {
    if (!key || key.trim() === '') {
      return { valid: false, reason: 'empty' };
    }
    
    const trimmedKey = key.trim();
    if (!trimmedKey.startsWith('sk-')) {
      return { valid: false, reason: 'format' };
    }
    
    if (trimmedKey.length < 20) {
      return { valid: false, reason: 'length' };
    }
    
    return { valid: true };
  }

  // Test API key by attempting to fetch balance
  async function testApiKey(key) {
    try {
      const balance = await invoke('fetch_balance', { apiKey: key });
      return { valid: true, balance };
    } catch (error) {
      console.error('API key test failed:', error);
      return { valid: false, reason: 'network', error: error };
    }
  }

  // Setup event listener for window focus/blur
  async function setupFocusListeners() {
    try {
      const focusLabel = document.getElementById('focusValue');
      
      window.addEventListener('focus', () => {
        document.body.classList.remove('unfocused');
        if (focusLabel) focusLabel.textContent = 'FOCUSED';
      });

      window.addEventListener('blur', () => {
        if (currentSettings?.unfocused_overlay) {
          document.body.classList.add('unfocused');
        }
        if (focusLabel) focusLabel.textContent = 'BLURRED';
      });

      // Initial state
      if (focusLabel) focusLabel.textContent = document.hasFocus() ? 'FOCUSED' : 'BLURRED';
      if (!document.hasFocus() && currentSettings?.unfocused_overlay) {
        document.body.classList.add('unfocused');
      }

    } catch (error) {
      console.error('Failed to setup focus listeners:', error);
    }
  }

  // Init
  async function init() {
    try {
      const version = await invoke('get_app_version');
      appVersion.textContent = `v${version}`;
      currentSettings = await invoke('read_settings');
        syncSettingsToUI(); // Always sync UI after loading settings

      // Setup focus listeners
      await setupFocusListeners();

      // Setup event listener for window control
      await setupWindowVisibilityListener();
      
      // Validate API key and notify backend
      if (currentSettings.api_key) {
        const formatValidation = validateApiKeyFormat(currentSettings.api_key);
        
        if (formatValidation.valid) {
          // Format is valid, test with actual API call
          const apiTest = await testApiKey(currentSettings.api_key);
          
      if (apiTest.valid) {
        // API key works - show balance and notify backend
        await displayBalance(apiTest.balance, true);
        await invoke('notify_api_key_valid');
        return;
      } else {
        // API key format valid but doesn't work
        await resetBalanceDisplay();
        await invoke('notify_api_key_invalid');
        showState('settings');
        showError('API key validation failed: ' + (apiTest.error || 'Unknown error'));
        return;
      }
    } else {
      // API key format invalid
      await resetBalanceDisplay();
      await invoke('notify_api_key_invalid');
      showState('settings');
      showError('Invalid API key format: ' + formatValidation.reason);
      return;
    }
  } else {
    // No API key
    await resetBalanceDisplay();
    await invoke('notify_api_key_invalid');
    showState('settings');
  }
} catch (error) {
  console.error('Init error:', error);
  await resetBalanceDisplay();
  await invoke('notify_api_key_invalid');
      showState('settings');
      showError('Initialization error: ' + error);
    }
  }

  init();
});
