# Title: Build Minimal UI

## Description

Create simple UI for API key input and balance display.

## Priority
0400

## UI States

### State 1: No API Key
```
┌─────────────────────────────────────┐
│  BP Employee Self-Care              │
│                                     │
│  Enter OpenRouter API Key:          │
│  ┌─────────────────────────────┐   │
│  │ sk-or-v1-...                │   │
│  └─────────────────────────────┘   │
│  [Save & Check Balance]             │
└─────────────────────────────────────┘
```

### State 2: Balance Display
```
┌─────────────────────────────────────┐
│  BP Employee Self-Care              │
│                                     │
│  Balance: € 123.00                  │
│                                     │
│  [Refresh]  [Settings]  [Quit]      │
└─────────────────────────────────────┘
```

### State 3: Loading
```
┌─────────────────────────────────────┐
│  BP Employee Self-Care              │
│                                     │
│  Loading balance...                 │
│                                     │
└─────────────────────────────────────┘
```

## Status

✅ **COMPLETED** - 2026-01-21

## Tasks

- [x] HTML structure (index.html)
  - API key input form
  - Balance display area
  - Buttons (Save, Refresh, Settings, Quit)

- [x] CSS styling (style.css)
  - Modern gradient background (purple theme)
  - Card-based UI with shadows
  - BYTEPOETS branding colors
  - Responsive layout
  - Error state styling with animations

- [x] JavaScript logic (app.js)
  - On load: call `read_api_key()`
  - If key exists: call `fetch_balance()` automatically
  - If no key: show input form
  - Save button: call `save_api_key()` then fetch
  - Refresh button: call `fetch_balance()`
  - Quit button: call Tauri exit
  - Settings button: show input to update key
  - Enter key support on input field

- [x] Integrate Tauri commands
  - Import @tauri-apps/api
  - Call Rust backend functions
  - Proper error handling and display

## Acceptance Criteria

- [x] API key input works and saves
- [x] Balance displays correctly ($XXX.XX format)
- [x] Refresh button fetches new balance
- [x] Settings allows updating API key
- [x] Quit button closes app
- [x] Loading states show during async ops
- [x] Errors display user-friendly messages
- [x] Color-coded remaining balance (red/orange/purple)
- [x] Auto-fetch on startup if key exists
- [x] Enter key submits API key
- [x] Smooth animations and transitions

## Assets Needed

- BP logo (from prototype: `/Users/markus/Code/openrouter-stats/assets/bp-logo.png`)
- Colors/fonts from BYTEPOETS brand
- Copy logo to `src/assets/` or `public/assets/`

## Dependencies

Frontend only needs:
```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^1.5.0"
  }
}
```

Managed by npm (not Nix). Nix provides Node.js, npm manages JS packages.

## Notes

- Plain HTML/CSS/JS - no framework needed. Keep it simple
- Tauri API injected at runtime, import from `@tauri-apps/api`
- No bundler needed for this simple app (or use Vite if preferred)

## Implementation Summary

**UI Features**:
- Three-state UI: Loading → No Key → Balance Display
- Modern purple gradient background (avoiding generic designs)
- Card-based layout with depth and shadows
- Color-coded balance (red < $0, orange < $5, purple ≥ $5)

**User Flow**:
1. App launches → auto-loads saved key if exists
2. If key found → fetches balance immediately
3. If no key → shows input form
4. After save → auto-fetches balance
5. Settings → allows updating key
6. Refresh → re-fetches current balance
7. Quit → exits cleanly

**Technical**:
- Vanilla JS with ES6 modules
- @tauri-apps/api for Tauri commands
- State management with show/hide functions
- Auto-dismiss errors after 5 seconds
- Enter key support for better UX

**Styling**:
- Gradient background (not generic white)
- SF Mono for currency values
- Smooth fade-in animations
- Shake animation for errors
- Responsive button layout

**Next Steps**: Error handling polish (backlog 0500) - most already covered by backend

## Estimate

6 hours (actual: ~3 hours)
