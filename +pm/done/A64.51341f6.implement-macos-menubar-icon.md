# Title: Implement macOS Menubar Icon (System Tray)

## Description
Convert BYTEPOETS Employee Self-Care to a menubar-only app (no dock icon) with system tray integration:
- Display BP logo in macOS menubar (status bar)
- Click menubar icon → toggle window show/hide
- Remove app from dock (LSUIElement or activation policy)
- Window appears near menubar icon when shown

## Priority
0064

## Acceptance Criteria

### Functional
- [ ] Menubar icon appears in macOS status bar using existing BP icon (`icons/32x32.png` or template)
- [ ] Left-click menubar icon → toggles main window visibility
- [ ] Window hidden by default on launch (menubar-only mode)
- [ ] Application does NOT appear in macOS dock when running
- [ ] Window positioned near menubar icon (not center screen)
- [ ] All existing functionality intact (balance fetch, auto-refresh, settings, quit)
- [ ] Quit via menubar context menu OR existing ✕ Quit button

### UX/Polish
- [ ] Menubar icon uses template image (adapts to light/dark mode)
- [ ] Optional: Right-click menubar → context menu (Show/Hide, Quit)
- [ ] Window closes to menubar (not app quit) when ✕ clicked
- [ ] Cmd+Q or menubar Quit → full app exit
- [ ] Frameless window (no title bar, traffic lights)
- [ ] Transparent background (no gradient)
- [ ] Only white rounded content card visible (floating effect)

### Technical
- [ ] `tauri.conf.json`: Add `systemTray` config with icon path
- [ ] `main.rs`: Implement `SystemTray` + `SystemTrayEvent` handlers
- [ ] `tauri.conf.json`: Set `"decorations": false` (frameless window)
- [ ] `tauri.conf.json`: Set `"transparent": true` (transparent background)
- [ ] `style.css`: Remove gradient background, add transparent body
- [ ] `style.css`: Ensure `.container` white rounded card has shadow for depth
- [ ] macOS: `LSUIElement = true` in Info.plist OR `ActivationPolicy::Accessory`
- [ ] Window management: `show()`, `hide()`, `is_visible()` logic
- [ ] Handle close event → hide window (not quit)

## Implementation Plan

### 1. Icon Preparation
- **Use existing**: `src-tauri/icons/32x32.png` (already 32x32 for menubar)
- **Template mode**: Convert to monochrome template (SF Symbols style) for native look
- **Fallback**: Use `icon.png` if template not ready

### 2. Tauri Config (`tauri.conf.json`)
```json
"systemTray": {
  "iconPath": "icons/32x32.png",
  "iconAsTemplate": true,
  "menuOnLeftClick": false,
  "title": "ESC"
},
"windows": [{
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "skipTaskbar": true,
  "visible": false,
  "resizable": false,
  "width": 650,
  "height": 650
}],
"bundle": {
  "macOS": {
    "minimumSystemVersion": "11.0"
  }
}
```

### 3. Rust Backend (`main.rs`)
- Add `SystemTray::new()` with icon
- Handle `SystemTrayEvent::LeftClick` → toggle window
- Optional: `SystemTrayEvent::RightClick` → show menu (Quit)
- Window close event → hide (not quit)
- Quit command → `app.exit(0)`

### 4. Hide from Dock
**Option A** (Tauri v1.8+):
```rust
use tauri::ActivationPolicy;
app.set_activation_policy(ActivationPolicy::Accessory);
```

**Option B** (Info.plist):
Add `LSUIElement = true` via `tauri.conf.json` → `bundle.macOS.infoPlist`

### 5. CSS Updates (`style.css`)
```css
/* Transparent body (no gradient) */
body {
  background: transparent;
  -webkit-app-region: drag; /* Allow window dragging */
}

/* White rounded card with shadow */
.container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 2rem;
  -webkit-app-region: no-drag; /* Allow interactions */
}
```

### 6. Window Positioning
- Get menubar icon position (Tauri API or estimate)
- Position window below icon (x: icon_x, y: menubar_height)
- Or use `alwaysOnTop` + manual positioning near top-right

## Technical Notes

### Tauri v1.8 System Tray
- Native support via `tauri::SystemTray` + `tauri::SystemTrayEvent`
- Icon: 32x32 PNG (template mode for dark/light adapt)
- Menu: Optional `SystemTrayMenu` for right-click

### macOS Dock Hiding
- `LSUIElement = true`: Hides dock + menu bar (agent app)
- `ActivationPolicy::Accessory`: Hides dock, keeps menu bar (preferred)

### Window Management
- `window.show()` / `window.hide()` / `window.is_visible()`
- Close button → `window.hide()` (override default quit)
- Quit → `app.exit(0)` or `std::process::exit(0)`

### Cross-Platform
- System tray works on Windows/Linux (different icons)
- Dock hiding is macOS-only (no-op on other platforms)

## Dependencies
- Tauri 1.8+ (✅ already on 1.8)
- No additional crates needed

## Risks/Mitigations
- **Icon quality**: 32x32 may look pixelated on Retina → Use `@2x` or template
- **Window positioning**: Tauri v1 doesn't expose tray icon coords → Use fixed offset or center-top
- **Close behavior**: Users expect ✕ to quit → Add tooltip/docs explaining menubar mode

## Testing Checklist
- [ ] Launch app → No dock icon, menubar icon visible
- [ ] Click menubar → Frameless window appears (no title bar)
- [ ] Window shows transparent background with floating white card
- [ ] Click menubar again → Window hides
- [ ] Click ✕ in window → Window hides (app still running)
- [ ] Menubar Quit → App exits completely
- [ ] Auto-refresh works while window hidden
- [ ] Light/dark mode → Icon adapts (if template)
- [ ] Window draggable via white card area
- [ ] Shadow visible around white card (depth effect)

## Estimate
- **Medium** (3-4 hours)
  - Icon prep: 15min
  - Tauri config (tray + frameless): 45min
  - Rust handlers: 1hr
  - CSS updates (transparent + card): 45min
  - Dock hiding: 30min
  - Testing/polish: 45min

## References
- Tauri v1 System Tray: https://tauri.app/v1/guides/features/system-tray
- macOS LSUIElement: https://developer.apple.com/documentation/bundleresources/information_property_list/lsuielement
- Tauri ActivationPolicy: https://docs.rs/tauri/1.8/tauri/enum.ActivationPolicy.html
