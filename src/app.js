console.log('app.js loading...');

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

  // Tauri APIs - check both possible structures
  const invoke = window.__TAURI__.invoke || (window.__TAURI__.tauri && window.__TAURI__.tauri.invoke);
  const exit = window.__TAURI__.process ? window.__TAURI__.process.exit : () => window.close();
  
  if (!invoke) {
    console.error('invoke not found in:', window.__TAURI__);
    document.body.innerHTML = '<div style="padding: 2rem; color: red;">Error: Tauri invoke API not found.</div>';
    return;
  }
  
  console.log('Tauri APIs loaded, invoke:', typeof invoke);

  // State
  let currentApiKey = null;

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

  // Format currency
  function formatCurrency(value) {
    if (value === null || value === undefined) {
      return '-';
    }
    return `$${value.toFixed(2)}`;
  }

  // Display balance
  function displayBalance(balance) {
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
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      showState('balance');
      showError(error);
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
  }

  // Quit
  async function quitApp() {
    await exit(0);
  }

  // Initialize
  async function init() {
    console.log('Initializing app...');
    showState('loading');
    
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
