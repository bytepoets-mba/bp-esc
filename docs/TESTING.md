# Testing Checklist

Manual testing scenarios for BP Employee Self-Care app.

---

## Prerequisites

1. Build and run the app: `npm run dev` (or `cargo tauri dev`)
2. Have a valid OpenRouter API key ready for testing

---

## Test Scenarios

### ✅ Initial Launch (No API Key)

**Steps**:
1. Clean config: `rm -rf ~/.config/bpesc-balance/`
2. Launch app
3. Should show "Enter your OpenRouter API Key" screen

**Expected**:
- [ ] Loading state shows briefly
- [ ] No API key state displays
- [ ] Input field is visible and focused
- [ ] No errors displayed

---

### ✅ API Key Validation

**Steps**:
1. Try to save empty key
2. Try to save key without "sk-" prefix (e.g., "test123")
3. Try to save very short key (e.g., "sk-123")
4. Save valid key format (e.g., "sk-or-v1-test...")

**Expected**:
- [ ] Empty key: "API key cannot be empty"
- [ ] No "sk-" prefix: "API key must start with 'sk-'"
- [ ] Too short: "API key appears too short (minimum 20 characters)"
- [ ] Valid format: Proceeds to save and fetch
- [ ] Input field shakes on validation error

---

### ✅ API Key Save & Load

**Steps**:
1. Enter valid API key
2. Click "Save & Check Balance"
3. Check file: `cat ~/.config/bpesc-balance/.env`
4. Check permissions: `ls -la ~/.config/bpesc-balance/`

**Expected**:
- [ ] Loading state shows during save
- [ ] File created at `~/.config/bpesc-balance/.env`
- [ ] Directory permissions: `drwxr-xr-x` (755)
- [ ] File permissions: `-rw-------` (600)
- [ ] File contains: `OPENROUTER_API_KEY=sk-...`

---

### ✅ Balance Fetch (Valid Key)

**Steps**:
1. Use a valid OpenRouter API key
2. Save and check balance

**Expected**:
- [ ] Loading state shows briefly
- [ ] Balance card displays with values
- [ ] Credit Limit: $XX.XX
- [ ] Used: $XX.XX
- [ ] Remaining: $XX.XX (color-coded)
- [ ] Last updated timestamp shows
- [ ] Action buttons visible (Refresh, Settings, Quit)

---

### ✅ Balance Fetch (Invalid Key)

**Steps**:
1. Use an invalid key (e.g., "sk-or-v1-invalid-test-key-12345")
2. Save and check balance

**Expected**:
- [ ] Error message: "Invalid API key. Please check your key and try again."
- [ ] Error displays in red banner
- [ ] Balance state still shows (or returns to no-key state)
- [ ] No crash

---

### ✅ Network Errors

**Steps**:
1. Disconnect from internet
2. Click "Refresh" button
3. Reconnect and refresh again

**Expected**:
- [ ] Error message about connection issue
- [ ] "Could not connect to OpenRouter. Check your internet connection."
- [ ] No crash or hang
- [ ] Refresh works after reconnecting

---

### ✅ Refresh Balance

**Steps**:
1. Have balance loaded
2. Click "Refresh" button
3. Click multiple times rapidly

**Expected**:
- [ ] Loading state shows
- [ ] Balance updates
- [ ] Last updated timestamp changes
- [ ] Button disables during fetch (prevents spam)
- [ ] No duplicate requests

---

### ✅ Settings (Update Key)

**Steps**:
1. Have balance loaded
2. Click "Settings" button
3. Should see input form again
4. Enter new API key
5. Save

**Expected**:
- [ ] Returns to no-key state (input form)
- [ ] Previous key pre-filled in input
- [ ] Can update to new key
- [ ] New key saves and fetches balance

---

### ✅ Quit Application

**Steps**:
1. Click "Quit" button

**Expected**:
- [ ] Application closes immediately
- [ ] No confirmation dialog (simple tool)
- [ ] Clean exit (no errors in console)

---

### ✅ Persistent Storage

**Steps**:
1. Save API key and check balance
2. Quit app
3. Relaunch app

**Expected**:
- [ ] App loads saved key automatically
- [ ] Fetches balance immediately on startup
- [ ] No need to re-enter key

---

### ✅ Edge Cases

#### Empty Balance Data
**If API returns null values**:
- [ ] Displays "-" for missing values
- [ ] No JavaScript errors
- [ ] No crashes

#### Corrupted .env File
**Steps**:
1. Manually corrupt: `echo "garbage" > ~/.config/bpesc-balance/.env`
2. Launch app

**Expected**:
- [ ] Shows no-key state (treats as no key)
- [ ] No crash
- [ ] Can save new key (overwrites corrupted file)

#### Read-only Config Directory
**Steps**:
1. Make directory read-only: `chmod 555 ~/.config/bpesc-balance/`
2. Try to save new key

**Expected**:
- [ ] Error message: "Failed to write .env file" or permission error
- [ ] No crash
- [ ] User stays on input screen

---

## Performance Tests

### ✅ App Launch Time
- [ ] Cold start < 3 seconds
- [ ] With saved key: balance loads < 2 seconds

### ✅ Memory Usage
- [ ] Idle: < 100MB
- [ ] After multiple refreshes: no memory leak

---

## Security Tests

### ✅ API Key Security

**Steps**:
1. Check browser dev tools console
2. Check error messages
3. Check file permissions

**Expected**:
- [ ] API key not logged in console (except debug mode)
- [ ] File permissions correct (600)
- [ ] Error messages don't expose full key
- [ ] No API key in error messages

---

## Cleanup

After testing:
```bash
# Optional: Remove test config
rm -rf ~/.config/bpesc-balance/
```

---

## Known Limitations (MVP)

- No API key format validation beyond basic checks
- No offline mode or caching
- No multiple key support
- No usage history/graphs
- macOS only (by design)
