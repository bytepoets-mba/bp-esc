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
  const settingsState = document.getElementById('settingsState');
  
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
  const shortcutInput = document.getElementById('shortcutInput');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // DOM elements - Actions
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const quitBtn = document.getElementById('quitBtn');

  // DOM elements - Confirm Dialog
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');
  let confirmCallback = null;

  // State management
  function showState(state) {
    [loadingState, balanceState, settingsState].forEach(s => s.classList.add('hidden'));
    
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'balance') balanceState.classList.remove('hidden');
    else if (state === 'settings') {
      settingsState.classList.remove('hidden');
      if (!apiKeyInputSettings.value) apiKeyInputSettings.focus();
    }
  }

  function isSettingsVisible() {
    return !settingsState.classList.contains('hidden');
  }

  function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
    setTimeout(() => errorDisplay.classList.add('hidden'), 5000);
  }

  function hideError() {
    errorDisplay.classList.add('hidden');
  }

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
    
    // Calculate percentage
    const percentage = (balance.limit && balance.limit > 0) 
        ? Math.floor((balance.remaining / balance.limit) * 100) 
        : 0;
    
    // Update label with percentage
    const remainingLabel = remainingValue.parentElement.querySelector('.label');
    if (remainingLabel) {
      remainingLabel.textContent = `${percentage}% Remaining:`;
    }

    limitValue.textContent = formatCurrency(balance.limit);
    usageValue.textContent = formatCurrency(balance.usage);
    remainingValue.textContent = formatCurrency(balance.remaining);
    
    // Color code remaining
    if (balance.remaining !== null) {
      if (balance.remaining < 0) remainingValue.style.color = '#dc2626';
      else if (balance.remaining < 5) remainingValue.style.color = '#ea580c';
      else remainingValue.style.color = '#6366f1';
    }
    
    // Update menubar icon
    try {
      await invoke('update_menubar_display', { balance, settings: currentSettings });
    } catch (error) {
      console.error('Failed to update menubar icon:', error);
    }
    
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    lastUpdated.textContent = now;
    if (shouldShowState) showState('balance');
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
    shortcutInput.value = currentSettings.global_shortcut || 'F19';
    
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
      global_shortcut: shortcutInput.value.trim() || 'F19',
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
  apiKeyInputSettings.onblur = () => saveSettingsAction(true);
  shortcutInput.onblur = () => saveSettingsAction(true);

  // Done button - save and show balance
  saveSettingsBtn.onclick = async () => {
    await saveSettingsAction(false);
    
    if (currentSettings?.api_key) {
      showState('loading');
      try {
        const balance = await invoke('fetch_balance', { apiKey: currentSettings.api_key });
        displayBalance(balance, true); // Force show balance state
        startAutoRefresh();
      } catch (error) {
        showState('balance');
        showError(error);
      }
    } else {
      showError('Please enter an API key');
      apiKeyInputSettings.focus();
    }
  };

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

  settingsBtn.onclick = () => {
    syncSettingsToUI();
    showState('settings');
  };
  refreshBtn.onclick = loadBalance;
  quitBtn.onclick = () => invoke('quit_app');

  // Init
  async function init() {
    try {
      const version = await invoke('get_app_version');
      appVersion.textContent = `v${version}`;
      currentSettings = await invoke('read_settings');
      
      if (currentSettings.api_key) {
        await loadBalance();
      } else {
        syncSettingsToUI();
        showState('settings');
      }
    } catch (error) {
      console.error('Init error:', error);
      showState('settings');
    }
  }

  init();
});
