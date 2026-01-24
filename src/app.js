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
  const shortcutEnabledToggle = document.getElementById('shortcutEnabledToggle');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // DOM elements - Actions
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');
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
    [loadingState, balanceState, settingsState].forEach(s => s.classList.add('hidden'));
    
    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'balance') balanceState.classList.remove('hidden');
    else if (state === 'settings') {
      settingsState.classList.remove('hidden');
      if (!apiKeyInputSettings.value) apiKeyInputSettings.focus();
    }
  }

// --- ULTIMATE AUTO-RESIZE SOLUTION ---
let resizeTimeout = null;
let lastMeasuredHeight = 0;
let resizeAttempts = 0;
const MAX_RESIZE_ATTEMPTS = 3;

async function performResize() {
  try {
    console.log('🔄 Starting ultimate resize calculation...');
    
    const { getCurrentWindow, LogicalSize } = window.__TAURI__.window;
    const appWindow = getCurrentWindow();
    
    // Use triple requestAnimationFrame for maximum stability
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
    });
    
    // Measure the actual content container with comprehensive approach
    const container = document.querySelector('.container');
    if (!container) {
      console.warn('⚠️ Container not found');
      return;
    }
    
    // Calculate total height including all potential overflow areas
    const containerRect = container.getBoundingClientRect();
    const containerHeight = Math.ceil(containerRect.height);
    console.log(`📏 Container height: ${containerHeight}px`);
    
    // Measure footer separately to ensure it's never cut off
    const footer = document.querySelector('.footer');
    const footerHeight = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    console.log(`👣 Footer height: ${footerHeight}px`);
    
    // Measure any visible error messages
    const errorDisplay = document.getElementById('errorDisplay');
    const errorHeight = errorDisplay && !errorDisplay.classList.contains('hidden') 
      ? Math.ceil(errorDisplay.getBoundingClientRect().height) 
      : 0;
    console.log(`⚠️ Error height: ${errorHeight}px`);
    
    // Calculate total required height - footer is INSIDE container, don't double count!
    const contentHeight = containerHeight + errorHeight;
    console.log(`📊 Total content height: ${contentHeight}px (container includes footer)`);
    
    // PRECISE PADDING STRATEGY for Tauri v2.5 + macOS:
    // - 15px base padding (minimal safety)
    // - 5px footer safety (just in case)
    const basePadding = 15;
    const footerSafety = 5;
    const paddingStrategy = basePadding + footerSafety;
    console.log(`🛡️  Precise padding: ${paddingStrategy}px (base: ${basePadding}, footer: ${footerSafety})`);
    
    const finalHeight = contentHeight + paddingStrategy;
    console.log(`🎯 Final calculated height: ${finalHeight}px`);
    
    // Tauri v2.5 approach - skip getting current size (not needed for our use case)
    // We'll just set the size directly based on our calculations
    console.log(`📊 Calculated final height: ${finalHeight}px`);
    
    // Always apply CSS fallback first for Tauri v2.5
    applyCssFallback(finalHeight);
    
    // Only attempt Tauri resize if height changed significantly or is new max
    if (Math.abs(lastMeasuredHeight - finalHeight) > 1 || finalHeight > lastMeasuredHeight) {
      console.log('🔄 Attempting Tauri window resize...');
      
      try {
        // Tauri v2.5 API - set size directly
        // Note: In Tauri v2.5, we need to use PhysicalSize for setSize
        const { PhysicalSize } = window.__TAURI__.window;
        await appWindow.setSize(new PhysicalSize(800, finalHeight));
        console.log('✅ Tauri window resize successful');
        lastMeasuredHeight = finalHeight;
        resizeAttempts = 0;
      } catch (tauriError) {
        console.error('💥 Tauri resize failed (expected in v2.5):', tauriError.message);
        // This is expected in Tauri v2.5 without permissions, CSS fallback already applied
        lastMeasuredHeight = finalHeight;
      }
    } else {
      console.log('⏭️ Skipping Tauri resize - height change too small');
    }
  } catch (e) {
    console.error('💥 Ultimate resize failed:', e);
  }
}

function applyCssFallback(height) {
  try {
    console.log('🎨 Applying PRECISE CSS SOLUTION for height:', height);
    
    // PRECISE CSS SOLUTION - Exact height with minimal safe buffer
    // Add just enough padding for footer visibility (20px is sufficient)
    const preciseHeight = height + 20;
    
    // Clear any previous aggressive styles
    document.documentElement.style.minHeight = '';
    document.documentElement.style.height = '';
    
    // Set body to precise calculated height
    document.body.style.minHeight = `${preciseHeight}px`;
    document.body.style.height = 'auto';
    document.body.style.paddingBottom = '0';
    
    // Reset container to natural sizing
    const container = document.querySelector('.container');
    if (container) {
      container.style.minHeight = 'auto';
      container.style.maxHeight = 'none';
      container.style.overflow = 'visible';
      container.style.position = 'relative';
      container.style.paddingBottom = '0';
      container.style.marginBottom = '0';
    }
    
    // Reset footer to natural positioning
    const footer = document.querySelector('.footer');
    if (footer) {
      footer.style.position = 'relative';
      footer.style.marginBottom = '0';
      footer.style.paddingBottom = '1rem'; // Keep original padding
      footer.style.marginTop = ''; // Use CSS default
    }
    
    // Settings-specific: just a bit more padding
    if (isSettingsVisible()) {
      console.log('🔧 Settings screen - adding minimal safety padding');
      document.body.style.paddingBottom = '10px';
    }
    
    console.log('✅ PRECISE CSS SOLUTION applied:', preciseHeight, 'px');
    
  } catch (cssError) {
    console.error('💥 PRECISE CSS SOLUTION failed:', cssError);
  }
}

// Enhanced ResizeObserver with mutation observation
const resizeObserver = new ResizeObserver((entries) => {
  console.log('👀 ResizeObserver triggered with', entries.length, 'entries');
  
  // Debounce rapid resize events with adaptive timing
  if (resizeTimeout) clearTimeout(resizeTimeout);
  
  // Adaptive debounce: shorter delay for rapid changes, longer for stabilization
  const isRapidChange = entries.some(entry => 
    Math.abs(entry.contentRect.height - (entry.target.dataset.lastHeight || 0)) > 20
  );
  
  console.log(`⏱️  Scheduling resize (${isRapidChange ? 'rapid' : 'normal'} mode) in ${isRapidChange ? '30' : '80'}ms`);
  resizeTimeout = setTimeout(performResize, isRapidChange ? 30 : 80);
  
  // Store last height for change detection
  entries.forEach(entry => {
    entry.target.dataset.lastHeight = entry.contentRect.height;
  });
});

// Observe both body and container for maximum reliability
console.log('👁️  Setting up ResizeObserver on document.body');
resizeObserver.observe(document.body);
const container = document.querySelector('.container');
if (container) {
  console.log('👁️  Setting up ResizeObserver on .container');
  resizeObserver.observe(container);
} else {
  console.warn('❌ Container not found for ResizeObserver');
}

// Also trigger on state changes, initial load, and after animations
console.log('📡 Setting up event listeners');
window.addEventListener('load', () => {
  console.log('🌅 Window loaded - triggering initial resize');
  performResize();
});
window.addEventListener('transitionend', (e) => {
  if (e.target.closest('.state') || e.target.closest('.container')) {
    console.log('🎭 Transition ended - triggering resize');
    performResize();
  }
});
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
  apiKeyInputSettings.onblur = () => saveSettingsAction(true);
  shortcutInput.onblur = () => saveSettingsAction(true);
  shortcutEnabledToggle.onchange = () => saveSettingsAction(true);

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
      await resetBalanceDisplay();
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
  hideBtn.onclick = () => invoke('toggle_window_visibility');

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

  // Init
  async function init() {
    try {
      const version = await invoke('get_app_version');
      appVersion.textContent = `v${version}`;
      currentSettings = await invoke('read_settings');
      syncSettingsToUI(); // Always sync UI after loading settings

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
