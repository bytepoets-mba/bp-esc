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
  const noKeyState = document.getElementById('noKeyState');
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
  const apiKeyInput = document.getElementById('apiKeyInput'); // initial key input
  const saveKeyBtn = document.getElementById('saveKeyBtn');   // initial save btn
  
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
  const saveSettingsBtn = document.getElementById('saveSettingsBtn'); // Now "Done"

  // DOM elements - Actions
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const quitBtn = document.getElementById('quitBtn');

  // State management
  function showState(state) {
    [loadingState, noKeyState, balanceState, settingsState].forEach(s => s.classList.add('hidden'));
    
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'noKey') noKeyState.classList.remove('hidden');
    else if (state === 'balance') balanceState.classList.remove('hidden');
    else if (state === 'settings') settingsState.classList.remove('hidden');
  }

  function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
    setTimeout(() => errorDisplay.classList.add('hidden'), 5000);
  }

  function hideError() {
    errorDisplay.classList.add('hidden');
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
      else remainingValue.style.color = '#667eea';
    }
    
    // Update menubar icon
    try {
      await invoke('update_menubar_display', { balance, settings: currentSettings });
    } catch (error) {
      console.error('Failed to update menubar icon:', error);
    }
    
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    lastUpdated.textContent = `Last updated: ${now}`;
    if (shouldShowState) showState('balance');
  }

  // Load balance
  async function loadBalance() {
    if (!currentSettings?.api_key) {
      showState('noKey');
      return;
    }
    
    showState('loading');
    hideError();
    
    try {
      const balance = await invoke('fetch_balance', { apiKey: currentSettings.api_key });
      displayBalance(balance);
      startAutoRefresh();
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      showState('balance');
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
    
    // Unit buttons
    if (currentSettings.show_percentage) {
      unitPercent.classList.add('active');
      unitDollar.classList.remove('active');
    } else {
      unitPercent.classList.remove('active');
      unitDollar.classList.add('active');
    }
    
    // Type section is always visible now as indicators work for both modes
    absTypeSection.classList.remove('hidden');
    
    // Type buttons
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
      show_percentage: unitPercent.classList.contains('active'),
      show_remaining: typeRemaining.classList.contains('active'),
    };

    try {
      await invoke('save_settings', { settings: newSettings });
      currentSettings = newSettings;
      
      // Update UI and Menubar immediately if we have balance
      if (currentBalance) {
        displayBalance(currentBalance, false); // Pass false to NOT showState('balance')
      }
    } catch (error) {
      if (!silent) showError(error);
    }
  }

  // Event Listeners - Settings (Automatic Saving)
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

  showUnitToggle.onchange = async () => {
    await saveSettingsAction(true);
  };

  autocheckToggle.onchange = async () => {
    await saveSettingsAction(true);
    if (currentSettings.auto_refresh_enabled) startAutoRefresh();
    else stopAutoRefresh();
  };

  apiKeyInputSettings.onblur = async () => {
    await saveSettingsAction(true);
  };

  // Action: Done
  saveSettingsBtn.onclick = async () => {
    if (currentSettings?.api_key) showState('balance');
    else showState('noKey');
  };

  // Event Listeners - Navigation
  settingsBtn.onclick = () => {
    syncSettingsToUI();
    showState('settings');
  };
  refreshBtn.onclick = loadBalance;
  quitBtn.onclick = () => invoke('quit_app');

  // Initial Key Input
  saveKeyBtn.onclick = async () => {
    const key = apiKeyInput.value.trim();
    if (!key.startsWith('sk-')) {
      showError('Invalid API Key');
      return;
    }
    // Set to settings input so saveSettingsAction can read it
    apiKeyInputSettings.value = key;
    await saveSettingsAction(false); // Do not silent save here, we want to load balance
  };

  // Init
  async function init() {
    try {
      const version = await invoke('get_app_version');
      appVersion.textContent = `v${version}`;
      
      currentSettings = await invoke('read_settings');
      if (currentSettings.api_key) {
        await loadBalance();
      } else {
        showState('noKey');
      }
    } catch (error) {
      console.error('Init error:', error);
      showState('noKey');
    }
  }

  window.__TAURI__.event.listen('refresh-balance', loadBalance);
  init();
});
