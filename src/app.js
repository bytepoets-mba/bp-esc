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
  
  // Settings Sub-Tab switching logic
  const settingsSubTabs = document.querySelectorAll('.settings-sub-tab');
  const openrouterTab = document.getElementById('openrouterTab');
  const generalTab = document.getElementById('generalTab');
  const defaultSubTab = document.querySelector('.settings-sub-tab[data-sub-tab="general"]');
  const openrouterSubTab = document.querySelector('.settings-sub-tab[data-sub-tab="openrouter"]');

  const setSettingsSubTab = (target) => {
    settingsSubTabs.forEach(t => t.classList.remove('active'));
    
    if (target === 'general') {
      generalTab.classList.remove('hidden');
      openrouterTab.classList.add('hidden');
      if (defaultSubTab) defaultSubTab.classList.add('active');
    } else {
      openrouterTab.classList.remove('hidden');
      generalTab.classList.add('hidden');
      if (openrouterSubTab) openrouterSubTab.classList.add('active');
    }
  };

  settingsSubTabs.forEach(subTab => {
    subTab.onclick = () => {
      const target = subTab.getAttribute('data-sub-tab');
      setSettingsSubTab(target);
    };
  });
  
  // DOM elements - Display
  const errorDisplay = document.getElementById('errorDisplay');
  const limitValue = document.getElementById('limitValue');
  const usageValue = document.getElementById('usageValue');
  const remainingValue = document.getElementById('remainingValue');
  const usageDailyValue = document.getElementById('usageDaily');
  const usageWeeklyValue = document.getElementById('usageWeekly');
  const paceText = document.getElementById('paceText');
  const pacePill = document.getElementById('pacePill');
  const paceDetails = document.getElementById('paceDetails');
  const percentCaption = document.getElementById('percentCaption');
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
  const launchAtLoginToggle = document.getElementById('launchAtLoginToggle');
  const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
  const unfocusedOverlayToggle = document.getElementById('unfocusedOverlayToggle');
  const decimalValue = document.getElementById('decimalValue');
  const decimalMinus = document.getElementById('decimalMinus');
  const decimalPlus = document.getElementById('decimalPlus');
  const shortcutInput = document.getElementById('shortcutInput');
  const shortcutEnabledToggle = document.getElementById('shortcutEnabledToggle');
  const debugLoggingToggle = document.getElementById('debugLoggingToggle');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // DOM elements - Actions
  const refreshBtn = document.getElementById('refreshBtn');
  const quitBtn = document.getElementById('quitBtn');
  const hideBtn = document.getElementById('hideBtn');
  const prevKeyBtn = document.getElementById('prevKeyBtn');
  const nextKeyBtn = document.getElementById('nextKeyBtn');
  const checkForUpdatesBtn = document.getElementById('checkForUpdatesBtn');

  // DOM elements - Confirm Dialog
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');
  let confirmCallback = null;

  const apiKeyList = document.getElementById('apiKeyList');
  const newApiKeyInput = document.getElementById('newApiKeyInput');
  const addApiKeyBtn = document.getElementById('addApiKeyBtn');

  function renderApiKeyList() {
    if (!currentSettings || !apiKeyList) return;
    apiKeyList.innerHTML = '';
    
    currentSettings.api_keys.forEach((api, index) => {
      const row = document.createElement('div');
      row.className = `api-key-row ${index === currentSettings.active_api_key_index ? 'active' : ''}`;
      row.draggable = true;
      row.setAttribute('data-index', index);
      
      const indicator = document.createElement('div');
      indicator.className = 'api-key-indicator';
      row.appendChild(indicator);
      
      // Drag handle
      const dragHandle = document.createElement('span');
      dragHandle.className = 'api-key-drag-handle';
      dragHandle.innerHTML = '<span class="material-symbols-rounded">drag_indicator</span>';
      dragHandle.setAttribute('draggable', 'false');
      row.appendChild(dragHandle);
      
      const label = document.createElement('span');
      label.className = 'api-key-label';
      label.textContent = api.label || `Key ${index + 1}`;
      
      // Edit pencil icon (hover only)
      const editIcon = document.createElement('span');
      editIcon.className = 'api-key-edit-icon';
      editIcon.innerHTML = '<span class="material-symbols-rounded">edit</span>';
      editIcon.onclick = (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'api-key-edit-input';
        input.value = label.textContent;
        
        const saveEdit = async () => {
          const newLabel = input.value.trim();
          if (newLabel && newLabel !== api.label) {
            api.label = newLabel;
            await saveSettingsAction(true);
          }
          renderApiKeyList();
        };

        input.onblur = saveEdit;
        input.onkeydown = (ke) => {
          if (ke.key === 'Enter') saveEdit();
          if (ke.key === 'Escape') renderApiKeyList();
        };

        label.replaceWith(input);
        input.focus();
        input.select();
      };
      
      // Double click to rename (fallback)
      label.ondblclick = (e) => {
        e.stopPropagation();
        editIcon.click();
      };

      row.onclick = async () => {
        console.log('Row clicked, index:', index, 'current active:', currentSettings.active_api_key_index);
        if (currentSettings.active_api_key_index !== index) {
          currentSettings.active_api_key_index = index;
          currentBalance = null;
          console.log('Saving settings with new index:', currentSettings.active_api_key_index);
          try {
            await invoke('save_settings', { settings: currentSettings });
            console.log('Settings saved successfully');
          } catch (e) {
            console.error('Failed to save settings:', e);
            showError('Failed to save: ' + e);
          }
          console.log('Re-rendering list');
          renderApiKeyList();
          console.log('Loading balance');
          try {
            await loadBalance();
            console.log('Balance loaded');
          } catch (e) {
            console.error('Failed to load balance:', e);
          }
        } else {
          console.log('Clicked same key, no change');
        }
      };

      const mask = document.createElement('span');
      mask.className = 'api-key-mask';
      mask.textContent = '••••' + api.key.slice(-4);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon-small';
      deleteBtn.innerHTML = '✕';
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (currentSettings.api_keys.length <= 1) {
          showError('Cannot delete the last API key.');
          return;
        }
        currentSettings.api_keys.splice(index, 1);
        if (currentSettings.active_api_key_index >= currentSettings.api_keys.length) {
          currentSettings.active_api_key_index = currentSettings.api_keys.length - 1;
        }
        await saveSettingsAction(true);
        renderApiKeyList();
        loadBalance();
      };

      row.appendChild(label);
      row.appendChild(editIcon);
      row.appendChild(mask);
      row.appendChild(deleteBtn);
      apiKeyList.appendChild(row);
    });
    
    // Setup drag and drop events
    setupDragAndDrop();
  }

  // Setup drag and drop for API key reordering
  function setupDragAndDrop() {
    const apiKeyRows = document.querySelectorAll('.api-key-row');
    const apiKeyList = document.getElementById('apiKeyList');

    if (!apiKeyList) return;

    let dragSrcEl = null;

    function handleDragStart(e) {
      dragSrcEl = this;
      this.classList.add('dragging');
      this.style.opacity = '0.4';
      this.style.cursor = 'grabbing';
    }

    function handleDragOver(e) {
      e.preventDefault();
      const rect = this.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const isAfter = offsetY > rect.height / 2;

      this.classList.toggle('drag-over-before', !isAfter);
      this.classList.toggle('drag-over-after', isAfter);
      return false;
    }

    function handleDragEnter() {
      this.classList.add('drag-over');
    }

    function handleDragLeave() {
      this.classList.remove('drag-over', 'drag-over-before', 'drag-over-after');
    }

    async function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();

      if (!dragSrcEl || dragSrcEl === this) return false;

      const srcIndex = Number(dragSrcEl.dataset.index);
      const rect = this.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const isAfter = offsetY > rect.height / 2;
      const rawDestIndex = Number(this.dataset.index);
      const destIndex = isAfter ? rawDestIndex + 1 : rawDestIndex;

      if (Number.isNaN(srcIndex) || Number.isNaN(destIndex)) return false;

      const adjustedDestIndex = srcIndex < destIndex ? destIndex - 1 : destIndex;
      if (adjustedDestIndex === srcIndex) return false;
      const movedItem = currentSettings.api_keys.splice(srcIndex, 1)[0];
      currentSettings.api_keys.splice(adjustedDestIndex, 0, movedItem);

      if (currentSettings.active_api_key_index === srcIndex) {
        currentSettings.active_api_key_index = adjustedDestIndex;
      } else if (currentSettings.active_api_key_index > srcIndex && currentSettings.active_api_key_index <= adjustedDestIndex) {
        currentSettings.active_api_key_index--;
      } else if (currentSettings.active_api_key_index < srcIndex && currentSettings.active_api_key_index >= adjustedDestIndex) {
        currentSettings.active_api_key_index++;
      }

      await saveSettingsAction(true);
      renderApiKeyList();
      return false;
    }

    function handleDragEnd() {
      this.style.opacity = '';
      this.style.cursor = '';
      this.classList.remove('dragging');

      const items = document.querySelectorAll('.api-key-row');
      items.forEach(item => item.classList.remove('drag-over', 'drag-over-before', 'drag-over-after'));
    }

    apiKeyRows.forEach(row => {
      row.addEventListener('dragstart', handleDragStart, false);
      row.addEventListener('dragstart', (e) => { e.dataTransfer && (e.dataTransfer.effectAllowed = 'move'); }, false);
      row.addEventListener('dragenter', handleDragEnter, false);
      row.addEventListener('dragover', handleDragOver, false);
      row.addEventListener('dragleave', handleDragLeave, false);
      row.addEventListener('drop', handleDrop, false);
      row.addEventListener('dragend', handleDragEnd, false);
    });
  }

  addApiKeyBtn.onclick = async () => {
    const key = newApiKeyInput.value.trim();
    if (!key) return;
    
    const validation = validateApiKeyFormat(key);
    if (!validation.valid) {
      showError('Invalid key format: ' + validation.reason);
      return;
    }

    try {
      const test = await testApiKey(key);
      if (!test.valid) {
        showError('Key validation failed: ' + test.error);
        return;
      }

      const label = test.balance.label || `Key ${currentSettings.api_keys.length + 1}`;
      currentSettings.api_keys.push({ key, label });
      currentSettings.active_api_key_index = currentSettings.api_keys.length - 1;
      newApiKeyInput.value = '';
      
      await saveSettingsAction(true);
      renderApiKeyList();
      loadBalance();
    } catch (e) {
      showError(e);
    }
  };

  function showError(message) {
    const ts = new Date().toISOString();
    console.error(`[${ts}] ${message}`);
    addLog(message, 'error');

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
let currentAnimatedPct = 0;
let animationFrameId = null;

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

    const finalHeight = Math.min(Math.max(totalContentHeight + 60, 520), 900);
    
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

  // Auto-refresh is now handled by Rust backend timer
  // This ensures updates work even when window is hidden

  // Format currency
  function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  }

  function animateHexagon(targetPct, paceRatio = null, paceStatus = null) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    const duration = 1200; // ms
    const startPct = currentAnimatedPct;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      
      currentAnimatedPct = startPct + (targetPct - startPct) * ease;
      drawPieChart(currentAnimatedPct, true, paceRatio, paceStatus);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        animationFrameId = null;
      }
    }
    animationFrameId = requestAnimationFrame(step);
  }

  // Display balance
  async function displayBalance(balance) {
    addLog(`Displaying balance: ${JSON.stringify(balance)}`);
    currentBalance = balance;

    // Update active key label next to hexagon
    const activeKeyLabel = currentSettings?.api_keys[currentSettings.active_api_key_index]?.label;
    const labelDisplay = document.getElementById('apiKeyLabelDisplay');
    if (labelDisplay) {
      labelDisplay.textContent = activeKeyLabel || '-';
    }
    
    // Check if we have valid balance data
    const hasData = balance && balance.limit != null && (balance.remaining_monthly != null || balance.usage_monthly != null);
    const monthlyUsage = balance?.usage_monthly ?? null;
    const monthlyRemaining = balance?.remaining_monthly ?? (balance?.limit != null && monthlyUsage != null ? balance.limit - monthlyUsage : null);
    const paceRatio = balance?.pace_ratio ?? null;
    const paceStatus = balance?.pace_status ?? null;
    const limitValueRaw = balance?.limit ?? null;
    
    // Calculate percentage
    const usageRatio = (hasData && limitValueRaw > 0 && monthlyUsage != null)
      ? (monthlyUsage / limitValueRaw) * 100
      : 0;
    const remainingRatio = (hasData && limitValueRaw > 0 && monthlyRemaining != null)
      ? (monthlyRemaining / limitValueRaw) * 100
      : 0;
    const rawPercentage = currentSettings?.show_remaining ? remainingRatio : usageRatio;
    
    // Exact percentage display
    const exactPercentEl = document.getElementById('exactPercent');
    if (exactPercentEl) {
      const decimals = Math.max(0, Math.min(2, currentSettings?.decimal_places ?? 1));
      exactPercentEl.textContent = hasData ? rawPercentage.toFixed(decimals) : '-';
    }

    if (percentCaption) {
      percentCaption.textContent = currentSettings?.show_remaining ? 'remaining' : 'used';
    }

    // Pie chart drawing with animation
    if (hasData) {
      animateHexagon(rawPercentage, paceRatio, paceStatus);
    } else {
      currentAnimatedPct = 0;
      drawPieChart(0, false);
    }

    // Dynamic value updates with a small fade effect to prevent flashing
    const updateValue = (el, newVal) => {
      if (el.textContent !== newVal) {
        el.style.opacity = '0';
        setTimeout(() => {
          el.textContent = newVal;
          el.style.opacity = '1';
        }, 150);
      }
    };

    updateValue(limitValue, formatCurrency(hasData ? balance.limit : null));
    updateValue(usageValue, formatCurrency(hasData ? monthlyUsage : null));
    updateValue(remainingValue, formatCurrency(hasData ? monthlyRemaining : null));
    updateValue(usageDailyValue, formatCurrency(hasData ? balance.usage_daily : null));
    updateValue(usageWeeklyValue, formatCurrency(hasData ? balance.usage_weekly : null));
    
    // Color code remaining
    if (hasData && monthlyRemaining !== null) {
      if (monthlyRemaining < 0) remainingValue.style.color = '#dc2626';
      else if (monthlyRemaining < 5) remainingValue.style.color = '#ea580c';
      else remainingValue.style.color = '#006497';
    } else {
      remainingValue.style.color = ''; // Reset to default
    }

    if (pacePill && paceText && paceDetails) {
      pacePill.classList.remove('pace-pill--ahead', 'pace-pill--on-track', 'pace-pill--behind', 'pace-pill--neutral');
      const status = paceStatus || 'neutral';
      const labelMap = {
        ahead: 'Over pace',
        behind: 'Slightly over',
        on_track: 'On pace',
        neutral: '-'
      };
      pacePill.classList.add(`pace-pill--${status}`);
      paceText.textContent = labelMap[status] || '-';

      if (paceRatio != null) {
        const decimals = Math.max(0, Math.min(2, currentSettings?.decimal_places ?? 1));
        const pacePercent = (paceRatio * 100).toFixed(decimals);
        const usedPercent = usageRatio.toFixed(decimals);
        paceDetails.textContent = `${pacePercent}% expected. ${usedPercent}% used`;
      } else {
        paceDetails.textContent = '-';
      }
    }
    
    // Update menubar icon
    try {
      const activeKeyLabel = currentSettings?.api_keys[currentSettings.active_api_key_index]?.label || '';
      await invoke('update_menubar_display', { balance, settings: currentSettings, active_key_label: activeKeyLabel });
    } catch (error) {
      console.error('Failed to update menubar icon:', error);
    }
    
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    lastUpdated.textContent = 'Last updated: ' + (hasData ? now : '-');
  }

  function drawPieChart(displayPct, hasData, paceRatio = null, paceStatus = null) {
    const canvas = document.getElementById('balancePie');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 60;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, size, size);
    if (!hasData) return;

    // Adjust dimensions to avoid cutoff (hexagon is taller than wide)
    const hexWidth = size - 12; // horizontal room
    const hexHeight = hexWidth / 0.866; 
    const center = size / 2;
    const xOff = (size - hexWidth) / 2;
    const yOff = (size - hexHeight) / 2;

    const points = [
      { x: center, y: yOff },
      { x: xOff + hexWidth, y: yOff + hexHeight * 0.25 },
      { x: xOff + hexWidth, y: yOff + hexHeight * 0.75 },
      { x: center, y: yOff + hexHeight },
      { x: xOff, y: yOff + hexHeight * 0.75 },
      { x: xOff, y: yOff + hexHeight * 0.25 }
    ];

    function pathHex(c) {
      c.beginPath();
      c.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 6; i++) c.lineTo(points[i].x, points[i].y);
      c.closePath();
    }

    // 1. Draw Fill (Bottom-to-Top)
    ctx.save();
    pathHex(ctx);
    ctx.clip();
    const fillPct = Math.max(0, Math.min(100, displayPct)) / 100;
    const fillY = yOff + hexHeight * (1 - fillPct);
    ctx.fillStyle = '#006497';
    ctx.fillRect(0, fillY, size, size);
    ctx.restore();

    if (paceRatio !== null) {
      const paceFill = Math.max(0, Math.min(1, paceRatio));
      const paceY = yOff + hexHeight * (1 - paceFill);
      const paceColor = paceStatus === 'ahead'
        ? 'rgba(239, 68, 68, 0.75)'
        : paceStatus === 'behind'
        ? 'rgba(234, 179, 8, 0.85)'
        : 'rgba(16, 185, 129, 0.7)';

      ctx.save();
      pathHex(ctx);
      ctx.clip();
      ctx.strokeStyle = paceColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(xOff + 2, paceY);
      ctx.lineTo(xOff + hexWidth - 2, paceY);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Real Inner Shadow
    ctx.save();
    pathHex(ctx);
    ctx.clip();
    
    // Use an inverted path to cast shadow inward
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    // Draw hex backwards (hole) to make shadow cast inside
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 5; i >= 0; i--) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fillStyle = 'black'; // Color doesn't matter, just needs fill for shadow
    ctx.fill();
    ctx.restore();

    // 3. Bright Gray Outline
    ctx.save();
    pathHex(ctx);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'; // Very bright gray like button hair lines
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Reset UI to empty state
  async function resetBalanceDisplay() {
    const emptyBalance = {
      limit: null,
      usage: null,
      remaining: null
    };
    await displayBalance(emptyBalance);
  }

  // Load balance
  async function loadBalance() {
    const activeKey = currentSettings?.api_keys[currentSettings.active_api_key_index]?.key;
    if (!activeKey) {
      addLog('No active API key found', 'warn');
      showState('settings');
      return;
    }
    
    addLog(`Fetching balance for: ${currentSettings.api_keys[currentSettings.active_api_key_index].label}`);
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.classList.add('spinning');
    hideError();
    
    try {
      const balance = await invoke('fetch_balance', { apiKey: activeKey });
      addLog('Balance fetch successful');
      await displayBalance(balance);
    } catch (error) {
      addLog(`Balance fetch failed: ${error}`, 'error');
      await resetBalanceDisplay();
      showError(error);
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
  }

  // Settings UI Sync
  function syncSettingsToUI() {
    if (!currentSettings) return;

    renderApiKeyList();
    refreshValue.textContent = currentSettings.refresh_interval_minutes;
    showUnitToggle.checked = currentSettings.show_unit;
    autocheckToggle.checked = currentSettings.auto_refresh_enabled;
    startWindowToggle.checked = currentSettings.show_window_on_start;
    launchAtLoginToggle.checked = currentSettings.launch_at_login;
    alwaysOnTopToggle.checked = currentSettings.always_on_top;
    unfocusedOverlayToggle.checked = currentSettings.unfocused_overlay;
    decimalValue.textContent = currentSettings.decimal_places || 0;

    shortcutInput.value = currentSettings.global_shortcut || 'F19';
    shortcutEnabledToggle.checked = currentSettings.global_shortcut_enabled;
    debugLoggingToggle.checked = currentSettings.debug_logging_enabled;
    
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
      refresh_interval_minutes: parseInt(refreshValue.textContent),
      show_unit: showUnitToggle.checked,
      auto_refresh_enabled: autocheckToggle.checked,
      show_window_on_start: startWindowToggle.checked,
      launch_at_login: launchAtLoginToggle.checked,
      always_on_top: alwaysOnTopToggle.checked,
      unfocused_overlay: unfocusedOverlayToggle.checked,
      decimal_places: parseInt(decimalValue.textContent),
      global_shortcut: shortcutInput.value.trim() || 'F19',
      global_shortcut_enabled: shortcutEnabledToggle.checked,
      debug_logging_enabled: debugLoggingToggle.checked,
      show_percentage: unitPercent.classList.contains('active'),
      show_remaining: typeRemaining.classList.contains('active'),
    };

    try {
      await invoke('save_settings', { settings: newSettings });
      
      // Update autostart state via plugin
      try {
        const { enable, disable, isEnabled } = window.__TAURI__.autostart;
        const currentlyEnabled = await isEnabled();
        if (newSettings.launch_at_login && !currentlyEnabled) {
          await enable();
        } else if (!newSettings.launch_at_login && currentlyEnabled) {
          await disable();
        }
      } catch (autostartError) {
        console.error('Failed to sync autostart via plugin:', autostartError);
      }

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
    // Rust backend will automatically restart timer with new settings
  };
  startWindowToggle.onchange = () => saveSettingsAction(true);
  launchAtLoginToggle.onchange = () => saveSettingsAction(true);
  alwaysOnTopToggle.onchange = () => saveSettingsAction(true);
  unfocusedOverlayToggle.onchange = () => {
    saveSettingsAction(true);
    if (!unfocusedOverlayToggle.checked) {
      document.body.classList.remove('unfocused');
    } else if (!document.hasFocus()) {
      document.body.classList.add('unfocused');
    }
  };
  
  decimalMinus.onclick = async () => {
    let val = parseInt(decimalValue.textContent);
    if (val > 0) {
      decimalValue.textContent = val - 1;
      await saveSettingsAction(true);
    }
  };
  decimalPlus.onclick = async () => {
    let val = parseInt(decimalValue.textContent);
    if (val < 2) {
      decimalValue.textContent = val + 1;
      await saveSettingsAction(true);
    }
  };

  shortcutInput.onblur = () => saveSettingsAction(true);
  shortcutEnabledToggle.onchange = () => saveSettingsAction(true);
  debugLoggingToggle.onchange = () => saveSettingsAction(true);

  // Reset button - confirm and wipe data
  resetSettingsBtn.onclick = () => {
    showConfirm('Reset all settings and clear your API key? This cannot be undone.', async () => {
      try {
        await invoke('reset_settings');
        currentSettings = await invoke('read_settings');
        currentBalance = null;
        syncSettingsToUI();
        showState('settings');
      } catch (error) {
        showError('Failed to reset: ' + error);
      }
    });
  };

  refreshBtn.onclick = () => {
    currentAnimatedPct = 0; // Reset for full build-up animation
    loadBalance();
  };
  quitBtn.onclick = () => invoke('quit_app');
  hideBtn.onclick = () => invoke('toggle_window_visibility');

  prevKeyBtn.onclick = async () => {
    if (!currentSettings || currentSettings.api_keys.length <= 1) return;
    currentSettings.active_api_key_index = (currentSettings.active_api_key_index - 1 + currentSettings.api_keys.length) % currentSettings.api_keys.length;
    currentBalance = null; // Clear cached balance so old data isn't redisplayed
    renderApiKeyList();
    await invoke('save_settings', { settings: currentSettings });
    await loadBalance();
  };

  nextKeyBtn.onclick = async () => {
    if (!currentSettings || currentSettings.api_keys.length <= 1) return;
    currentSettings.active_api_key_index = (currentSettings.active_api_key_index + 1) % currentSettings.api_keys.length;
    currentBalance = null; // Clear cached balance so old data isn't redisplayed
    renderApiKeyList();
    await invoke('save_settings', { settings: currentSettings });
    await loadBalance();
  };

  // Toggle debug info on logo double click
  const bpLogo = document.getElementById('bpLogo');
  const checkLabel = document.getElementById('checkLabel');
  const openLogBtn = document.getElementById('openLogBtn');
  
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

  const logContent = document.getElementById('logContent');
  const logDrawer = document.getElementById('logDrawer');
  const openLogFileBtn = document.getElementById('openLogFileBtn');
  const closeLogDrawerBtn = document.getElementById('closeLogDrawerBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  async function addLog(message, type = 'info') {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    const formatted = `[${ts}] [${type.toUpperCase()}] ${message}`;
    
    // SSOT: Log to file
    await invoke('log_message', { message: formatted }).catch(() => {});
    
    // Update drawer if visible
    if (!logDrawer.classList.contains('hidden')) {
      await refreshLogsInUI();
    }
  }

  async function refreshLogsInUI() {
    try {
      const logs = await invoke('read_logs');
      logContent.innerHTML = logs.map(line => {
        const type = line.includes('[ERROR]') ? 'error' : 
                     line.includes('[WARN]') ? 'warn' : 'info';
        return `<div class="log-line ${type}">${line}</div>`;
      }).join('');
    } catch (e) {
      console.error('Failed to read logs', e);
    }
  }

  if (openLogBtn) {
    openLogBtn.onclick = async () => {
      const isOpening = logDrawer.classList.contains('hidden');
      logDrawer.classList.toggle('hidden');
      
      const { getCurrentWindow } = window.__TAURI__.window;
      const appWindow = getCurrentWindow();
      await appWindow.setResizable(isOpening);
      
      if (isOpening) {
        await refreshLogsInUI();
      }
      performResize();
    };
  }

  closeLogDrawerBtn.onclick = async () => {
    logDrawer.classList.add('hidden');
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().setResizable(false);
    performResize();
  };

  clearLogsBtn.onclick = async () => {
    await invoke('clear_logs');
    logContent.innerHTML = '';
  };

  openLogFileBtn.onclick = () => {
    invoke('open_app_log').catch(err => showError(err));
  };

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

  // Setup event listener for auto-refresh from Rust backend
  async function setupRustAutoRefreshListener() {
    try {
      await window.__TAURI__.event.listen('rust-auto-refresh', () => {
        console.log('📍 Received rust-auto-refresh event');
        addLog('Auto-refresh triggered by Rust backend timer');
        loadBalance();
      });
    } catch (error) {
      console.error('Failed to setup Rust auto-refresh listener:', error);
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
    addLog(`Testing API key: ${key.slice(0, 8)}...`);
    try {
      const balance = await invoke('fetch_balance', { apiKey: key });
      addLog(`API key valid. Label: ${balance.label || 'none'}`);
      return { valid: true, balance };
    } catch (error) {
      addLog(`API key test failed: ${error}`, 'error');
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

  // Setup Sparkle update checker (macOS only)
  function setupUpdateChecker() {
    if (!checkForUpdatesBtn) return;
    
    checkForUpdatesBtn.onclick = async () => {
      try {
        const isMac = /Mac/i.test(navigator.userAgent);
        if (!isMac) {
          showError('Auto-update is only available on macOS');
          return;
        }

        const { checkForUpdates } = await import('tauri-plugin-sparkle-updater-api');
        await checkForUpdates();
      } catch (error) {
        console.error('Update check failed:', error);
        const message = String(error?.message || error);
        if (message.toLowerCase().includes('dev mode')) {
          showError('Auto-update not available in dev mode');
          return;
        }
        showError('Failed to check for updates: ' + message);
      }
    };
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
      
      // Setup Rust auto-refresh listener (works even when window hidden)
      await setupRustAutoRefreshListener();
      
      // Setup update checker (macOS only)
      setupUpdateChecker();
      
      // Validate API key and notify backend
      const activeKey = currentSettings.api_keys[currentSettings.active_api_key_index]?.key;
      if (activeKey) {
        const formatValidation = validateApiKeyFormat(activeKey);
        
        if (formatValidation.valid) {
          // Format is valid, test with actual API call
          const apiTest = await testApiKey(activeKey);
          
          if (apiTest.valid) {
            // API key works - update data and notify backend
            await displayBalance(apiTest.balance);
            await invoke('notify_api_key_valid');
            showState('balance'); // ONLY show balance on initial successful validation
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
