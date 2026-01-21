import { invoke } from '@tauri-apps/api/tauri';
import { exit } from '@tauri-apps/api/process';

// State management
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
  
  showState('balance');
}

// Load and display balance
async function loadBalance() {
  if (!currentApiKey) {
    showError('No API key loaded');
    return;
  }
  
  showState('loading');
  hideError();
  
  try {
    const balance = await invoke('fetch_balance', { apiKey: currentApiKey });
    displayBalance(balance);
  } catch (error) {
    showState('balance');
    showError(error);
  }
}

// Save API key and load balance
async function saveAndLoad() {
  const key = apiKeyInput.value.trim();
  
  if (!key) {
    showError('Please enter an API key');
    return;
  }
  
  showState('loading');
  hideError();
  saveKeyBtn.disabled = true;
  
  try {
    await invoke('save_api_key', { key });
    currentApiKey = key;
    await loadBalance();
  } catch (error) {
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
    showState('noKey');
    showError(`Failed to initialize: ${error}`);
  }
}

// Event listeners
saveKeyBtn.addEventListener('click', saveAndLoad);
refreshBtn.addEventListener('click', loadBalance);
settingsBtn.addEventListener('click', showSettings);
quitBtn.addEventListener('click', quitApp);

apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveAndLoad();
  }
});

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
