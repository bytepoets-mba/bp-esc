console.log('app.js loading...');

// Auto-refresh configuration
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Wait for DOM and Tauri to be ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  console.log('window.__TAURI__:', window.__TAURI__);
  
  console.log('__TAURI__ structure:', JSON.stringify(Object.keys(window.__TAURI__ || {})));
  
  if (!window.__TAURI__) {
    console.error('ERROR: Tauri API not available');
    document.body.innerHTML = '<div style="padding: 2rem; color: red; text-align: center;">Error: Tauri API not loaded.<br>Please restart the app.</div>';
    return;
  }

  // Tauri v1 APIs - invoke is under __TAURI__.tauri.invoke
  const invoke = window.__TAURI__.tauri?.invoke || window.__TAURI__.invoke;
  const exit = window.__TAURI__.process?.exit || (() => window.close());
  
  if (!invoke) {
    console.error('invoke not found in:', window.__TAURI__);
    document.body.innerHTML = '<div style="padding: 2rem; color: red;">Error: Tauri invoke API not found.</div>';
    return;
  }
  
  console.log('Tauri APIs loaded, invoke:', typeof invoke);

  // State
  let currentApiKey = null;
  let autoRefreshTimer = null;

  // DOM elements
  const loadingState = document.getElementById('loadingState');
  const noKeyState = document.getElementById('noKeyState');
  const balanceState = document.getElementById('balanceState');
  const errorDisplay = document.getElementById('errorDisplay');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const quitBtn = document.getElementById('quitBtn');
  const limitValue = document.getElementById('limitValue');
  const usageValue = document.getElementById('usageValue');
  const remainingValue = document.getElementById('remainingValue');
  const lastUpdated = document.getElementById('lastUpdated');
  const autocheckToggle = document.getElementById('autocheckToggle');
  const appVersion = document.getElementById('appVersion');

  // State management
  function showState(state) {
    loadingState.classList.add('hidden');
    noKeyState.classList.add('hidden');
    balanceState.classList.add('hidden');
    
    if (state === 'loading') {
      loadingState.classList.remove('hidden');
    } else if (state === 'noKey') {
      noKeyState.classList.remove('hidden');
    } else if (state === 'balance') {
      balanceState.classList.remove('hidden');
    }
  }

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

  // Auto-refresh management
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      console.log('Stopping auto-refresh timer');
      clearTimeout(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    
    if (!autocheckToggle.checked) {
      console.log('Auto-refresh disabled by user');
      return;
    }
    
    console.log(`Starting auto-refresh timer (${AUTO_REFRESH_INTERVAL_MS / 1000}s)`);
    autoRefreshTimer = setTimeout(() => {
      console.log('Auto-refresh triggered');
      loadBalance();
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  // Format currency
  function formatCurrency(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    return `$${value.toFixed(2)}`;
  }

  // Display balance
  async function displayBalance(balance) {
    limitValue.textContent = formatCurrency(balance.limit);
    usageValue.textContent = formatCurrency(balance.usage);
    remainingValue.textContent = formatCurrency(balance.remaining);
    
    // Color code remaining
    if (balance.remaining !== null) {
      if (balance.remaining < 0) {
        remainingValue.style.color = '#dc2626';
      } else if (balance.remaining < 5) {
        remainingValue.style.color = '#ea580c';
      } else {
        remainingValue.style.color = '#667eea';
      }
    }
    
    // Update menubar icon with percentage
    if (balance.limit !== null && balance.remaining !== null) {
      const percentage = (balance.remaining / balance.limit) * 100;
      try {
        await invoke('update_menubar_percentage', { percentage });
        console.log(`Updated menubar icon with ${percentage.toFixed(1)}%`);
      } catch (error) {
        console.error('Failed to update menubar icon:', error);
      }
    }
    
    // Timestamp
    const now = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    lastUpdated.textContent = `Last updated: ${now}`;
    
    showState('balance');
  }

  // Validate API key format
  function validateApiKeyFormat(key) {
    const trimmedKey = key.trim();
    
    if (!trimmedKey) {
      return { valid: false, error: 'API key cannot be empty' };
    }
    
    if (!trimmedKey.startsWith('sk-')) {
      return { valid: false, error: 'API key must start with "sk-"' };
    }
    
    if (trimmedKey.length < 20) {
      return { valid: false, error: 'API key appears too short (minimum 20 characters)' };
    }
    
    return { valid: true };
  }

  // Load balance
  async function loadBalance() {
    if (!currentApiKey) {
      console.warn('loadBalance called without API key');
      showError('No API key loaded');
      return;
    }
    
    showState('loading');
    hideError();
    
    try {
      console.log('Fetching balance...');
      const balance = await invoke('fetch_balance', { apiKey: currentApiKey });
      console.log('Balance received:', balance);
      displayBalance(balance);
      
      // Start auto-refresh timer after successful load
      startAutoRefresh();
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      showState('balance');
      showError(error);
      
      // Still start timer even on error (will retry later)
      startAutoRefresh();
    }
  }

  // Save and load
  async function saveAndLoad() {
    const key = apiKeyInput.value.trim();
    
    // Validate
    const validation = validateApiKeyFormat(key);
    if (!validation.valid) {
      showError(validation.error);
      apiKeyInput.classList.add('error');
      apiKeyInput.focus();
      setTimeout(() => apiKeyInput.classList.remove('error'), 500);
      return;
    }
    
    showState('loading');
    hideError();
    saveKeyBtn.disabled = true;
    
    try {
      console.log('Saving API key...');
      await invoke('save_api_key', { key });
      console.log('API key saved');
      currentApiKey = key;
      await loadBalance();
    } catch (error) {
      console.error('Failed to save:', error);
      showState('noKey');
      showError(error);
    } finally {
      saveKeyBtn.disabled = false;
    }
  }

  // Show settings
  function showSettings() {
    apiKeyInput.value = currentApiKey || '';
    showState('noKey');
    stopAutoRefresh();
  }

  // Quit
  async function quitApp() {
    await exit(0);
  }

  // Load and display app version
  async function loadVersion() {
    try {
      const version = await invoke('get_app_version');
      appVersion.textContent = `v${version}`;
    } catch (error) {
      console.error('Failed to get version:', error);
      appVersion.textContent = '';
    }
  }

  // Initialize
  async function init() {
    console.log('Initializing app...');
    showState('loading');
    
    // Load version first
    await loadVersion();
    
    try {
      const savedKey = await invoke('read_api_key');
      console.log('Saved key found?', !!savedKey);
      
      if (savedKey) {
        currentApiKey = savedKey;
        await loadBalance();
      } else {
        showState('noKey');
      }
    } catch (error) {
      console.error('Init error:', error);
      showState('noKey');
      showError(`Failed to initialize: ${error}`);
    }
  }

  // Event listeners
  saveKeyBtn.addEventListener('click', saveAndLoad);
  refreshBtn.addEventListener('click', () => {
    refreshBtn.disabled = true;
    loadBalance().finally(() => {
      refreshBtn.disabled = false;
    });
  });
  settingsBtn.addEventListener('click', showSettings);
  quitBtn.addEventListener('click', quitApp);

  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveAndLoad();
    }
  });

  apiKeyInput.addEventListener('input', () => {
    apiKeyInput.classList.remove('error');
    hideError();
  });

  // Auto-check toggle handler
  autocheckToggle.addEventListener('change', () => {
    if (autocheckToggle.checked) {
      console.log('Auto-refresh enabled');
      startAutoRefresh();
    } else {
      console.log('Auto-refresh disabled');
      stopAutoRefresh();
    }
  });

// Listen for refresh-balance event from Rust
window.__TAURI__.event.listen('refresh-balance', () => {
  loadBalance();
});

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showError('An unexpected error occurred. Please try again.');
  event.preventDefault();
});

// Start the app
console.log('Starting init...');
init();
});

console.log('app.js setup complete');
