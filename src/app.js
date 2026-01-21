console.log('app.js loaded');

// Wait for Tauri to be ready
if (!window.__TAURI__) {
  console.error('ERROR: Tauri API not available!');
  document.body.innerHTML = '<div style="padding: 2rem; color: red;">Error: Tauri API not loaded. This should not happen.</div>';
}

// State management
let currentApiKey = null;
let invoke, exit;

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

// State management functions
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

// Display balance data
function displayBalance(balance) {
  limitValue.textContent = formatCurrency(balance.limit);
  usageValue.textContent = formatCurrency(balance.usage);
  remainingValue.textContent = formatCurrency(balance.remaining);
  
  // Color code remaining balance
  if (balance.remaining !== null) {
    if (balance.remaining < 0) {
      remainingValue.style.color = '#dc2626'; // Red
    } else if (balance.remaining < 5) {
      remainingValue.style.color = '#ea580c'; // Orange
    } else {
      remainingValue.style.color = '#667eea'; // Purple
    }
  }
  
  // Update timestamp
  const now = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  lastUpdated.textContent = `Last updated: ${now}`;
  
  showState('balance');
}

// Load and display balance
async function loadBalance() {
  if (!currentApiKey) {
    console.warn('loadBalance called without API key');
    showError('No API key loaded');
    return;
  }
  
  showState('loading');
  hideError();
  
  try {
    console.log('Fetching balance from OpenRouter...');
    const balance = await invoke('fetch_balance', { apiKey: currentApiKey });
    console.log('Balance received:', balance);
    displayBalance(balance);
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    showState('balance');
    showError(error);
  }
}

// Validate API key format (client-side)
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

// Save API key and load balance
async function saveAndLoad() {
  const key = apiKeyInput.value.trim();
  
  // Client-side validation
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
    console.log('API key saved successfully');
    currentApiKey = key;
    await loadBalance();
  } catch (error) {
    console.error('Failed to save API key:', error);
    showState('noKey');
    showError(error);
  } finally {
    saveKeyBtn.disabled = false;
  }
}

// Show settings (allow updating key)
function showSettings() {
  apiKeyInput.value = currentApiKey || '';
  showState('noKey');
}

// Quit application
async function quitApp() {
  await exit(0);
}

// Initialize app
async function init() {
  showState('loading');
  
  try {
    // Try to load saved API key
    const savedKey = await invoke('read_api_key');
    
    if (savedKey) {
      currentApiKey = savedKey;
      await loadBalance();
    } else {
      showState('noKey');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showState('noKey');
    showError(`Failed to initialize: ${error}`);
  }
}

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showError('An unexpected error occurred. Please try again.');
  event.preventDefault();
});

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

// Remove error class on input change
apiKeyInput.addEventListener('input', () => {
  apiKeyInput.classList.remove('error');
  hideError();
});

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  console.log('window.__TAURI__ available?', !!window.__TAURI__);
  
  if (!window.__TAURI__) {
    console.error('Tauri API not ready on DOMContentLoaded');
    showState('noKey');
    showError('Tauri API not loaded. Please restart the app.');
    return;
  }
  
  // Load Tauri APIs
  invoke = window.__TAURI__.tauri.invoke;
  exit = window.__TAURI__.process.exit;
  
  console.log('Starting init()...');
  init();
});
