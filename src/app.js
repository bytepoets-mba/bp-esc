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
  let sortableInstance = null; // SortableJS instance for API key reordering
  let toastTimeoutId = null;

  // DOM elements - States
  const loadingState = document.getElementById('loadingState');
  const balanceState = document.getElementById('balanceState');
  const timeState = document.getElementById('timeState');
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
      else if (target === 'time') showState('time');
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
  const usageMonthValue = document.getElementById('usageMonthValue');
  const usageWeekValue = document.getElementById('usageWeekValue');
  const usageDayValue = document.getElementById('usageDayValue');
  const usageMonthBar = document.getElementById('usageMonthBar');
  const usageWeekBar = document.getElementById('usageWeekBar');
  const usageDayBar = document.getElementById('usageDayBar');
  const usageMonthBarFill = document.getElementById('usageMonthBarFill');
  const usageWeekBarFill = document.getElementById('usageWeekBarFill');
  const usageDayBarFill = document.getElementById('usageDayBarFill');
  const usageMonthBarNotch = document.getElementById('usageMonthBarNotch');
  const usageWeekBarNotch = document.getElementById('usageWeekBarNotch');
  const usageDayBarNotch = document.getElementById('usageDayBarNotch');
  const usageMonthBarNotchLabel = document.getElementById('usageMonthBarNotchLabel');
  const usageWeekBarNotchLabel = document.getElementById('usageWeekBarNotchLabel');
  const usageDayBarNotchLabel = document.getElementById('usageDayBarNotchLabel');
  const usageMonthPaceValue = document.getElementById('usageMonthPaceValue');
  const usageWeekPaceValue = document.getElementById('usageWeekPaceValue');
  const usageDayPaceValue = document.getElementById('usageDayPaceValue');
  const usageBreakdown = document.getElementById('usageBreakdown');
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
  const menubarMonochromeToggle = document.getElementById('menubarMonochromeToggle');
  const paceWarnValue = document.getElementById('paceWarnValue');
  const paceWarnMinus = document.getElementById('paceWarnMinus');
  const paceWarnPlus = document.getElementById('paceWarnPlus');
  const paceOverValue = document.getElementById('paceOverValue');
  const paceOverMinus = document.getElementById('paceOverMinus');
  const paceOverPlus = document.getElementById('paceOverPlus');
  const shortcutInput = document.getElementById('shortcutInput');
  const shortcutEnabledToggle = document.getElementById('shortcutEnabledToggle');
  const debugLoggingToggle = document.getElementById('debugLoggingToggle');
  const debugModeToggle = document.getElementById('debugModeToggle');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // DOM elements - Actions
  const refreshBtn = document.getElementById('refreshBtn');
  const extractOpenCodeKeyBtn = document.getElementById('extractOpenCodeKeyBtn');
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
    
    // Destroy existing SortableJS instance before re-rendering
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
    
    apiKeyList.innerHTML = '';
    
    currentSettings.api_keys.forEach((api, index) => {
      const row = document.createElement('div');
      row.className = `api-key-row ${index === currentSettings.active_api_key_index ? 'active' : ''}`;
      row.setAttribute('data-index', index);
      
      const indicator = document.createElement('div');
      indicator.className = 'api-key-indicator';
      row.appendChild(indicator);
      
      // Drag handle
      const dragHandle = document.createElement('span');
      dragHandle.className = 'api-key-drag-handle';
      dragHandle.innerHTML = '<span class="material-symbols-rounded">drag_indicator</span>';
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

      row.onclick = async function() {
        // Read current index from data attribute (may have changed after drag reorder)
        const currentIndex = parseInt(this.getAttribute('data-index'));
        console.log('Row clicked, index:', currentIndex, 'current active:', currentSettings.active_api_key_index);
        if (currentSettings.active_api_key_index !== currentIndex) {
          currentSettings.active_api_key_index = currentIndex;
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
      deleteBtn.onclick = async function(e) {
        e.stopPropagation();
        if (currentSettings.api_keys.length <= 1) {
          showError('Cannot delete the last API key.');
          return;
        }
        // Read current index from parent row (may have changed after drag reorder)
        const currentIndex = parseInt(row.getAttribute('data-index'));
        currentSettings.api_keys.splice(currentIndex, 1);
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
    
    // Initialize SortableJS for drag-and-drop reordering
    initSortable();
  }

  // Initialize SortableJS for API key reordering
  function initSortable() {
    console.log('[SortableJS] initSortable called');
    console.log('[SortableJS] apiKeyList:', apiKeyList);
    console.log('[SortableJS] Sortable available:', typeof Sortable);
    
    if (!apiKeyList) {
      console.error('[SortableJS] apiKeyList is null!');
      return;
    }
    if (typeof Sortable === 'undefined') {
      console.error('[SortableJS] Sortable library not loaded!');
      return;
    }
    
    const handles = apiKeyList.querySelectorAll('.api-key-drag-handle');
    console.log('[SortableJS] Found drag handles:', handles.length);
    
    sortableInstance = new Sortable(apiKeyList, {
      animation: 150,
      handle: '.api-key-drag-handle',
      ghostClass: 'api-key-ghost',
      chosenClass: 'api-key-chosen',
      dragClass: 'api-key-drag',
      forceFallback: true,  // Force fallback to JS-based drag (better cross-platform)
      
      onStart: function(evt) {
        console.log('[SortableJS] onStart - dragging item:', evt.oldIndex);
      },
      
      onMove: function(evt) {
        console.log('[SortableJS] onMove - from:', evt.dragged, 'to:', evt.related);
        return true; // allow move
      },
      
      onEnd: function(evt) {
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;
        
        console.log(`[SortableJS] onEnd fired: ${oldIndex} -> ${newIndex}`);
        
        if (oldIndex === newIndex) {
          console.log('[SortableJS] Same position, skipping');
          return;
        }
        
        // Reorder the api_keys array to match DOM order
        const [movedItem] = currentSettings.api_keys.splice(oldIndex, 1);
        currentSettings.api_keys.splice(newIndex, 0, movedItem);
        
        console.log('[SortableJS] Array reordered:', currentSettings.api_keys.map(k => k.label));
        
        // Update active key index to follow the active item
        const oldActiveIndex = currentSettings.active_api_key_index;
        if (oldActiveIndex === oldIndex) {
          currentSettings.active_api_key_index = newIndex;
        } else if (oldIndex < oldActiveIndex && newIndex >= oldActiveIndex) {
          currentSettings.active_api_key_index--;
        } else if (oldIndex > oldActiveIndex && newIndex <= oldActiveIndex) {
          currentSettings.active_api_key_index++;
        }
        
        console.log(`[SortableJS] Active index: ${oldActiveIndex} -> ${currentSettings.active_api_key_index}`);
        
        // Update data-index attributes on DOM elements (SortableJS already moved them)
        const rows = apiKeyList.querySelectorAll('.api-key-row');
        rows.forEach((row, i) => {
          row.setAttribute('data-index', i);
          row.classList.toggle('active', i === currentSettings.active_api_key_index);
        });
        
        // Save to backend
        invoke('save_settings', { settings: currentSettings })
          .then(() => console.log('[SortableJS] Settings saved'))
          .catch(e => {
            console.error('[SortableJS] Save failed:', e);
            showError('Failed to save: ' + e);
          });
      }
    });
    
    console.log('[SortableJS] Instance created:', sortableInstance);
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

  function showToast(message, type = 'info', timeout = 3500) {
    if (!errorDisplay) return;
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden', 'toast-success', 'toast-info');
    if (type === 'success') {
      errorDisplay.classList.add('toast-success');
    } else if (type === 'info') {
      errorDisplay.classList.add('toast-info');
    }
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => {
      errorDisplay.classList.add('hidden');
    }, timeout);
  }

  function showError(message) {
    const ts = new Date().toISOString();
    console.error(`[${ts}] ${message}`);
    addLog(message, 'error');
    showToast(message, 'error', 5000);
  }

  function hideError() {
    errorDisplay.classList.add('hidden');
  }

  async function handleExtractOpenCodeKey() {
    addLog('Extracting OpenCode OpenRouter key');
    showToast('Extracting OpenCode key...', 'info');

    let extractedKey = null;
    try {
      extractedKey = await invoke('read_opencode_openrouter_key');
    } catch (error) {
      const message = error?.toString?.() || 'Failed to read OpenCode auth file.';
      addLog(`OpenCode key extraction failed: ${message}`, 'error');
      showError(message);
      return;
    }

    const key = (extractedKey || '').trim();
    if (!key) {
      addLog('OpenCode key extraction returned empty key', 'error');
      showError('OpenCode key not found in auth file.');
      return;
    }

    const existingIndex = currentSettings?.api_keys?.findIndex(k => k.key === key) ?? -1;
    if (existingIndex >= 0) {
      currentSettings.active_api_key_index = existingIndex;
      await saveSettingsAction(true);
      renderApiKeyList();
      addLog('OpenCode key already configured. Switched active key.');
      showToast('OpenCode key already configured. Switched active key.', 'success');
      loadBalance();
      return;
    }

    addLog('OpenCode key found but not configured. Opening settings.');
    showToast('OpenCode key found. Add it in settings.', 'info');
    showState('settings');
    setSettingsSubTab('openrouter');
    if (newApiKeyInput) {
      newApiKeyInput.value = key;
      newApiKeyInput.focus();
      newApiKeyInput.select();
    }
  }

  // State management
  async function showState(state) {
    [loadingState, balanceState, timeState, settingsState].forEach(s => s.classList.add('hidden'));
    
    // Update active tab UI if state change was programmatic
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === state) t.classList.add('active');
      else t.classList.remove('active');
    });

    if (state === 'loading') loadingState.classList.remove('hidden');
    else if (state === 'balance') balanceState.classList.remove('hidden');
    else if (state === 'time') timeState.classList.remove('hidden');
    else if (state === 'settings') {
      settingsState.classList.remove('hidden');
      if (!apiKeyInputSettings.value) apiKeyInputSettings.focus();
    }
    
    // Trigger resize on state change
    performResize();
  }

// --- SIMPLE AUTO-RESIZE LOGIC ---
const RESIZE_HEIGHT_OFFSET = 25;
let resizeTimeout = null;
let currentAnimatedPct = 0;
let animationFrameId = null;

async function performResize() {
  try {
    const container = document.querySelector('.container');
    if (!container) return;

    // Use offsetHeight of body for a stable measurement of the content
    // We add a small buffer (4px) to avoid rounding-related clipping
    const totalContentHeight = document.body.offsetHeight;

    // Update debug labels if visible
    const shLabel = document.getElementById('shValue');
    const chLabel = document.getElementById('chValue');
    const whLabel = document.getElementById('whValue');
    if (shLabel) shLabel.textContent = totalContentHeight;
    if (chLabel) chLabel.textContent = container.clientHeight;
    if (whLabel) whLabel.textContent = window.innerHeight;

    if (totalContentHeight === 0) return;

    // Call Rust command to set inner height (robustly handles chrome)
    await invoke('set_window_height', { height: totalContentHeight + RESIZE_HEIGHT_OFFSET });
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

document.addEventListener('contextmenu', (e) => {
  if (!currentSettings?.debugging_enabled) {
    e.preventDefault();
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

  function getPaceThresholds(settings) {
    const warn = Math.max(0, Number(settings?.pace_warn_threshold ?? 15));
    const over = Math.max(warn + 1, Number(settings?.pace_over_threshold ?? 25));
    return { warn, over };
  }

  function computePaceStatus(deltaPercent, settings) {
    if (deltaPercent == null) return null;
    const { warn, over } = getPaceThresholds(settings);

    if (deltaPercent > over) return 'ahead';
    if (deltaPercent > warn) return 'behind';
    return 'on_track';
  }

  function getDayProgress(date = new Date()) {
    const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    return Math.min(1, Math.max(0, hours / 24));
  }

  function getWeekElapsedDays(date = new Date()) {
    const day = date.getDay();
    const dayIndex = (day + 6) % 7; // Monday = 0
    return Math.min(7, Math.max(0, dayIndex + getDayProgress(date)));
  }

  function getMonthContext(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayFraction = getDayProgress(date);
    const elapsedDays = (date.getDate() - 1) + dayFraction;
    return { daysInMonth, elapsedDays, dayFraction };
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
    
    // Hide nav buttons if only one key
    const hasMultipleKeys = currentSettings?.api_keys?.length > 1;
    prevKeyBtn.style.display = hasMultipleKeys ? '' : 'none';
    nextKeyBtn.style.display = hasMultipleKeys ? '' : 'none';
    
    // Check if we have valid balance data
    const hasData = balance && balance.limit != null && (balance.remaining_monthly != null || balance.usage_monthly != null);
    const monthlyUsage = balance?.usage_monthly ?? balance?.usage ?? null;
    const monthlyRemaining = balance?.remaining_monthly ?? (balance?.limit != null && monthlyUsage != null ? balance.limit - monthlyUsage : null);
    const paceRatio = balance?.pace_ratio ?? null;
    const limitValueRaw = balance?.limit ?? null;
    let paceMonthTarget = balance?.pace_month_target ?? null;
    let paceWeekTarget = balance?.pace_week_target ?? null;
    let paceDayTarget = balance?.pace_day_target ?? null;
    let paceMonthDeltaPercent = balance?.pace_month_delta_percent ?? null;
    let paceWeekDeltaPercent = balance?.pace_week_delta_percent ?? null;
    let paceDayDeltaPercent = balance?.pace_day_delta_percent ?? null;
    let dailyBudget = null;
    
    // Calculate percentage
    const usageRatio = (hasData && limitValueRaw > 0 && monthlyUsage != null)
      ? (monthlyUsage / limitValueRaw) * 100
      : 0;
    const remainingRatio = (hasData && limitValueRaw > 0 && monthlyRemaining != null)
      ? (monthlyRemaining / limitValueRaw) * 100
      : 0;
    const rawPercentage = currentSettings?.show_remaining ? remainingRatio : usageRatio;

    if (limitValueRaw > 0) {
      const { daysInMonth, elapsedDays, dayFraction } = getMonthContext();
      dailyBudget = daysInMonth > 0 ? limitValueRaw / daysInMonth : 0;
      if (paceMonthTarget == null || paceWeekTarget == null || paceDayTarget == null) {
        const weekElapsed = getWeekElapsedDays();
        if (paceMonthTarget == null) paceMonthTarget = dailyBudget * elapsedDays;
        if (paceWeekTarget == null) paceWeekTarget = dailyBudget * weekElapsed;
        if (paceDayTarget == null) paceDayTarget = dailyBudget * dayFraction;
      }
    }

    if (limitValueRaw > 0) {
      if (paceMonthDeltaPercent == null && paceMonthTarget != null && monthlyUsage != null && paceMonthTarget > 0) {
        paceMonthDeltaPercent = ((monthlyUsage - paceMonthTarget) / paceMonthTarget) * 100;
      }
      if (paceWeekDeltaPercent == null && paceWeekTarget != null && balance?.usage_weekly != null && paceWeekTarget > 0) {
        paceWeekDeltaPercent = ((balance.usage_weekly - paceWeekTarget) / paceWeekTarget) * 100;
      }
      if (paceDayDeltaPercent == null && paceDayTarget != null && balance?.usage_daily != null && paceDayTarget > 0) {
        paceDayDeltaPercent = ((balance.usage_daily - paceDayTarget) / paceDayTarget) * 100;
      }
    }

    const paceStatus = computePaceStatus(paceMonthDeltaPercent, currentSettings);
    
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
    updateValue(usageMonthValue, formatCurrency(hasData ? monthlyUsage : null));
    updateValue(usageWeekValue, formatCurrency(hasData ? balance.usage_weekly : null));
    updateValue(usageDayValue, formatCurrency(hasData ? balance.usage_daily : null));
    
    // Color code remaining
    if (hasData && monthlyRemaining !== null) {
      if (monthlyRemaining < 0) remainingValue.style.color = '#dc2626';
      else if (monthlyRemaining < 5) remainingValue.style.color = '#ea580c';
      else remainingValue.style.color = '#006497';
    } else {
      remainingValue.style.color = ''; // Reset to default
    }

    const updatePaceBar = (bar, fill, notch, notchLabel, valueEl, deltaPercent, target, actualValue, budget) => {
      if (!bar || !fill || !notch || !notchLabel || !valueEl) return;
      fill.classList.remove('pace-bar-fill--ahead', 'pace-bar-fill--on_track', 'pace-bar-fill--behind', 'pace-bar-fill--neutral');
      valueEl.classList.remove('pace-value--ahead', 'pace-value--on_track', 'pace-value--behind', 'pace-value--neutral');
      const status = computePaceStatus(deltaPercent, currentSettings) || 'neutral';
      fill.classList.add(`pace-bar-fill--${status}`);
      valueEl.classList.add(`pace-value--${status}`);

      if (deltaPercent == null) {
        valueEl.textContent = '-';
      } else {
        const rounded = Math.round(deltaPercent);
        valueEl.textContent = rounded > 0 ? `+${rounded}%` : `${rounded}%`;
      }

      bar.title = target == null ? '-' : `Target: ${formatCurrency(target)}`;
      const maxBarWidth = 300;
      const fillRatio = budget > 0 && actualValue != null ? Math.min(actualValue / budget, 1) : 0;
      fill.style.width = `${Math.round(fillRatio * maxBarWidth)}px`;

      const notchRatio = budget > 0 && target != null ? Math.min(target / budget, 1) : null;
      if (notchRatio == null) {
        notch.style.display = 'none';
        notchLabel.textContent = '-';
      } else {
        notch.style.display = '';
        notch.style.left = `${Math.round(notchRatio * maxBarWidth)}px`;
        notchLabel.textContent = target == null ? '-' : `$${target.toFixed(2)}`;
      }
    };

    const monthBudget = limitValueRaw > 0 ? limitValueRaw : null;
    const weekBudget = dailyBudget != null ? dailyBudget * 7 : null;
    const dayBudget = dailyBudget != null ? dailyBudget : null;

    updatePaceBar(
      usageMonthBar,
      usageMonthBarFill,
      usageMonthBarNotch,
      usageMonthBarNotchLabel,
      usageMonthPaceValue,
      paceMonthDeltaPercent,
      paceMonthTarget,
      monthlyUsage,
      monthBudget
    );
    updatePaceBar(
      usageWeekBar,
      usageWeekBarFill,
      usageWeekBarNotch,
      usageWeekBarNotchLabel,
      usageWeekPaceValue,
      paceWeekDeltaPercent,
      paceWeekTarget,
      balance?.usage_weekly ?? null,
      weekBudget
    );
    updatePaceBar(
      usageDayBar,
      usageDayBarFill,
      usageDayBarNotch,
      usageDayBarNotchLabel,
      usageDayPaceValue,
      paceDayDeltaPercent,
      paceDayTarget,
      balance?.usage_daily ?? null,
      dayBudget
    );

    if (usageBreakdown) {
      usageBreakdown.classList.remove('usage-breakdown--ahead', 'usage-breakdown--on_track', 'usage-breakdown--behind', 'usage-breakdown--neutral');
      const bandStatus = paceStatus || 'neutral';
      usageBreakdown.classList.add(`usage-breakdown--${bandStatus}`);
    }
    
    // Update menubar icon
    try {
      await invoke('update_menubar_display', { balance, settings: currentSettings });
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

    // 1. Draw Fill (direction based on used/remaining)
    ctx.save();
    pathHex(ctx);
    ctx.clip();
    const fillPct = Math.max(0, Math.min(100, displayPct)) / 100;
    const fillHeight = hexHeight * fillPct;
    const fillFromTop = !currentSettings?.show_remaining;
    const fillY = fillFromTop ? yOff : yOff + (hexHeight - fillHeight);
    const fillColor = paceStatus === 'ahead'
      ? '#ef4444'
      : paceStatus === 'behind'
      ? '#f59e0b'
      : paceStatus === 'on_track'
      ? '#10b981'
      : '#006497';
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, fillY, size, fillHeight);
    ctx.restore();

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
    if (menubarMonochromeToggle) {
      menubarMonochromeToggle.checked = currentSettings.menubar_monochrome || false;
    }
    if (paceWarnValue && paceOverValue) {
      const { warn, over } = getPaceThresholds(currentSettings);
      paceWarnValue.textContent = Math.round(warn);
      paceOverValue.textContent = Math.round(over);
    }

    shortcutInput.value = currentSettings.global_shortcut || 'F19';
    shortcutEnabledToggle.checked = currentSettings.global_shortcut_enabled;
    debugLoggingToggle.checked = currentSettings.debug_logging_enabled;
    if (debugModeToggle) {
      debugModeToggle.checked = currentSettings.debugging_enabled;
    }
    applyDebugMode(currentSettings.debugging_enabled);
    
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

  function setPaceThresholds(nextWarn, nextOver, silent = true) {
    if (!paceWarnValue || !paceOverValue) return;

    const warn = Math.max(0, Math.min(100, Math.round(nextWarn)));
    const over = Math.max(warn + 1, Math.min(100, Math.round(nextOver)));
    paceWarnValue.textContent = warn;
    paceOverValue.textContent = over;
    saveSettingsAction(silent);
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
      menubar_monochrome: menubarMonochromeToggle ? menubarMonochromeToggle.checked : (currentSettings?.menubar_monochrome ?? false),
      pace_warn_threshold: paceWarnValue ? parseFloat(paceWarnValue.textContent) : (currentSettings?.pace_warn_threshold ?? 15),
      pace_over_threshold: paceOverValue ? parseFloat(paceOverValue.textContent) : (currentSettings?.pace_over_threshold ?? 25),
      global_shortcut: shortcutInput.value.trim() || 'F19',
      global_shortcut_enabled: shortcutEnabledToggle.checked,
      debug_logging_enabled: debugLoggingToggle.checked,
      debugging_enabled: debugModeToggle ? debugModeToggle.checked : (currentSettings?.debugging_enabled ?? false),
      show_percentage: unitPercent.classList.contains('active'),
      show_remaining: typeRemaining.classList.contains('active'),
    };

    const resetHexAnimation = currentSettings?.show_remaining !== newSettings.show_remaining;

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
      applyDebugMode(newSettings.debugging_enabled);
      if (resetHexAnimation) {
        currentAnimatedPct = 0;
      }
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
    if (currentBalance) displayBalance(currentBalance, false);
  };
  typeUsed.onclick = async () => {
    typeRemaining.classList.remove('active');
    typeUsed.classList.add('active');
    await saveSettingsAction(true);
    if (currentBalance) displayBalance(currentBalance, false);
  };
  
  // Click on "remaining/used" caption toggles the setting
  percentCaption.onclick = async () => {
    // Toggle the setting
    if (typeRemaining.classList.contains('active')) {
      typeRemaining.classList.remove('active');
      typeUsed.classList.add('active');
    } else {
      typeRemaining.classList.add('active');
      typeUsed.classList.remove('active');
    }
    await saveSettingsAction(true);
    if (currentBalance) displayBalance(currentBalance, false);
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
  if (menubarMonochromeToggle) {
    menubarMonochromeToggle.onchange = () => saveSettingsAction(true);
  }
  
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

  if (paceWarnMinus && paceWarnPlus && paceOverMinus && paceOverPlus) {
    paceWarnMinus.onclick = () => {
      const warn = parseInt(paceWarnValue.textContent);
      const over = parseInt(paceOverValue.textContent);
      setPaceThresholds(warn - 1, over, true);
    };
    paceWarnPlus.onclick = () => {
      const warn = parseInt(paceWarnValue.textContent);
      const over = parseInt(paceOverValue.textContent);
      setPaceThresholds(warn + 1, over, true);
    };
    paceOverMinus.onclick = () => {
      const warn = parseInt(paceWarnValue.textContent);
      const over = parseInt(paceOverValue.textContent);
      setPaceThresholds(warn, over - 1, true);
    };
    paceOverPlus.onclick = () => {
      const warn = parseInt(paceWarnValue.textContent);
      const over = parseInt(paceOverValue.textContent);
      setPaceThresholds(warn, over + 1, true);
    };
  }

  shortcutInput.onblur = () => saveSettingsAction(true);
  shortcutEnabledToggle.onchange = () => saveSettingsAction(true);
  debugLoggingToggle.onchange = () => saveSettingsAction(true);
  if (debugModeToggle) {
    debugModeToggle.onchange = () => saveSettingsAction(true);
  }

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
  if (extractOpenCodeKeyBtn) {
    extractOpenCodeKeyBtn.onclick = () => {
      handleExtractOpenCodeKey();
    };
  }
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

  // Debug UI helpers
  const bpLogo = document.getElementById('bpLogo');
  const checkLabel = document.getElementById('checkLabel');
  const openLogBtn = document.getElementById('openLogBtn');
  const logContent = document.getElementById('logContent');
  const logDrawer = document.getElementById('logDrawer');
  const openLogFileBtn = document.getElementById('openLogFileBtn');
  const closeLogDrawerBtn = document.getElementById('closeLogDrawerBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  
  async function openLogDrawer() {
    if (!logDrawer || !logDrawer.classList.contains('hidden')) return;
    logDrawer.classList.remove('hidden');
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().setResizable(true);
    await refreshLogsInUI();
    performResize();
  }

  async function closeLogDrawer() {
    if (!logDrawer || logDrawer.classList.contains('hidden')) return;
    logDrawer.classList.add('hidden');
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().setResizable(false);
    performResize();
  }

  function applyDebugMode(isEnabled) {
    if (checkLabel) {
      checkLabel.style.display = isEnabled ? 'block' : 'none';
      if (isEnabled) {
        const focusLabel = document.getElementById('focusValue');
        if (focusLabel) {
          focusLabel.textContent = document.hasFocus() ? 'FOCUSED' : 'BLURRED';
        }
      }
    }

    if (isEnabled) {
      openLogDrawer();
    } else {
      closeLogDrawer();
    }
  }

  // Toggle debug setting on logo double click
  if (bpLogo) {
    bpLogo.ondblclick = async () => {
      if (!currentSettings || !debugModeToggle) return;
      debugModeToggle.checked = !debugModeToggle.checked;
      await saveSettingsAction(true);
    };
  }

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
      const isOpening = logDrawer?.classList.contains('hidden');
      if (isOpening) {
        await openLogDrawer();
      } else {
        await closeLogDrawer();
      }
    };
  }

  closeLogDrawerBtn.onclick = async () => {
    await closeLogDrawer();
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

        if (window.location.protocol.startsWith('http')) {
          showError('Auto-update is only available in release builds');
          return;
        }

        let canCheck = null;
        try {
          canCheck = await invoke('plugin:sparkle-updater|can_check_for_updates');
        } catch (checkError) {
          canCheck = false;
        }

        if (canCheck !== true) {
          showError('Auto-update is only available in release builds');
          return;
        }

        await invoke('plugin:sparkle-updater|check_for_updates');
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
