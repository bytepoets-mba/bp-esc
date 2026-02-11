# Re-enable colored menubar icon when Liquid Glass tinting API available

## Description

As of macOS 26 (Tahoe), Liquid Glass breaks our `effectiveAppearance`-based
dark/light menubar tint detection. Two failure modes:

1. **Liquid Glass adaptive tinting** — glass material adapts per-element
   based on content behind it, independently of `NSAppearance` name.
   `effectiveAppearance` may not reflect actual visual state.
2. **Multi-monitor** — KVO sentinel lives on one screen. Tray icon on
   different monitor with different wallpaper/tint gets wrong detection
   (white text on light menubar = unreadable).

Apple has no public API for per-monitor menubar tint. Known gap since
Big Sur (Apple Forums thread 652540), worsened by Liquid Glass. Multiple
FBs open (FB20439311, FB20370553).

### Current workaround (implemented)

Forced `menubar_monochrome = true` with `set_icon_as_template(true)`.
macOS handles tinting automatically per-monitor. Checkbox disabled in UI
with info tooltip explaining why.

Colored icon rendering code (green/yellow/red pace indicators) is preserved
but unused.

### Trigger to revisit

- Apple ships a per-monitor menubar tint query API
- Tauri tray-icon PR #270 (colored theme-reactive icons) merges
- macOS Liquid Glass behavior changes in future betas/releases

### When re-enabling

- Restore `menubar_monochrome` as user-toggleable setting
- Re-enable `is_macos_dark_mode()` + KVO observer path
- Test on: multi-monitor, Liquid Glass on/off, Intel + Apple Silicon
- Remove info icon / disabled state from checkbox

## Priority
A20
