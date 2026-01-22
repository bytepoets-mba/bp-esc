
# Title

Refine macOS Menubar App UX & Functionality (Tauri v2)

---

## Description

Polish the macOS menubar implementation to production quality, following native macOS menubar app conventions and Tauri v2 constraints.

Goals:

* Window is visible on first launch
* Balance refreshes every time the window is shown
* App runs as a **true menubar-only app** (no Dock icon, no Cmd+Tab entry)
* Window positions correctly below the menubar on the active monitor
* Fully transparent window with an opaque content card
* Subtle, native-feeling drag handle with persisted position across restarts

---

## Priority

0053

---

## Acceptance Criteria

### Initial Launch

* [ ] App launches with window visible on first start
* [ ] Menubar icon visible immediately
* [ ] No Dock icon and no Cmd+Tab entry (bundled app)
* [ ] Balance auto-refreshes when window is first shown

**Hint:** Dock hiding must be verified on a bundled build, not in `tauri dev`.

---

### Window Positioning

* [ ] Window opens below the menubar on the active monitor
* [ ] Horizontal position centered relative to menubar anchor (heuristic-based)
* [ ] Window position persisted across restarts
* [ ] Window re-anchors correctly when switching monitors or changing screen layout

**Hint:**
Persist offset from a computed menubar anchor, not absolute screen coordinates, to avoid off-screen issues on monitor changes.

---

### Visual Polish

* [ ] Window background fully transparent
* [ ] Inner content card is opaque white with a proper drop shadow
* [ ] No window chrome, title bar, or native frame visible

**Hint:**
Any background on `html`, `body`, or root containers breaks transparency on macOS.

---

### Draggability

* [ ] Subtle drag handle (~20 px height) at top of content card
* [ ] Drag handle styled as a light macOS-like gradient
* [ ] Window draggable via handle only (content non-draggable)
* [ ] Drag interaction feels smooth and native

**Hint:**
Explicitly disable drag for all elements except the handle using `-webkit-app-region`.

---

### Interactions

* [ ] Clicking menubar icon toggles window visibility
* [ ] Showing window always triggers balance refresh
* [ ] Window close button hides window (does not quit app)
* [ ] Menubar “Quit” exits application fully
* [ ] All existing functionality preserved (balance, auto-refresh, etc.)

---

## Technical Implementation (Tauri v2)

### 1. Window Visibility on Launch

```json
// tauri.conf.json
"windows": [{
  "visible": true,
  "transparent": true,
  "decorations": false
}]
```

---

### 2. Hide Dock Icon Completely (macOS)

**Required (Tauri v2-safe):**

```rust
#[cfg(target_os = "macos")]
app.set_activation_policy(tauri::ActivationPolicy::Accessory);
```

Notes:

* No inline `bundle.macOS.infoPlist` (invalid in Tauri v2)
* Dock icon may still appear in `tauri dev`; verify via `cargo tauri build`

---

### 3. Window Positioning & Persistence

**Anchor-based positioning strategy:**

* Compute anchor from active monitor (top center, just below menubar)
* Persist user-defined offset relative to anchor

```rust
// Save offset on move or hide
window.on_window_event(|event| {
  if matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_)) {
    save_offset_from_anchor(&window);
  }
});

// Restore on show
let anchor = compute_menubar_anchor(&window);
let offset = load_saved_offset();
window.set_position(anchor + offset);
```

**Initial fallback (no saved offset):**

* y ≈ 28–32 px below top of active monitor
* x = center of active monitor − window_width / 2

**Hint:**
Recompute anchor every time the window is shown to follow menubar moves and monitor changes.

---

### 4. Transparent Background (macOS)

Requirements:

* `transparent: true`
* `decorations: false`
* No background on window root or body

```css
html, body {
  background: transparent !important;
}
```

All visual styling must live inside an inner content card.

---

### 5. Drag Handle

```css
* {
  -webkit-app-region: no-drag;
}

.drag-handle {
  height: 20px;
  background: linear-gradient(90deg, #f8fafc, #e2e8f0);
  border-radius: 8px 8px 0 0;
  cursor: grab;
  -webkit-app-region: drag;
  user-select: none;
}
```

HTML:

```html
<div class="drag-handle">⋮⋮⋮</div>
```

---

### 6. Hide vs Quit Behavior

```rust
window.on_window_event(|event| {
  if let WindowEvent::CloseRequested { api, .. } = event {
    api.prevent_close();
    window.hide().ok();
  }
});
```

Menubar Quit:

```rust
std::process::exit(0);
```

**Hint:**
Menubar apps should never destroy their main window on close.

---

### 7. Balance Refresh on Show

Avoid frontend timing issues by using explicit events:

```rust
window.show()?;
window.emit("refresh-balance", ())?;
```

Frontend listens and refreshes on event.

---



