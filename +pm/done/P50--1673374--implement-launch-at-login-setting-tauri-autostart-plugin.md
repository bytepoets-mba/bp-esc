# Title: implement-launch-at-login-setting-tauri-autostart-plugin

## Description
Add "Launch at Login" toggle (default: true) to Settings UI.

1. Bump `rust-version = "1.77"` in `src-tauri/Cargo.toml` 
2. deps (devenv shell):
   - `npm i @tauri-apps/plugin-autostart`
   - `cargo add tauri-plugin-autostart --manifest-path src-tauri/Cargo.toml`
3. Init plugin in `main.rs` setup
4. Add to `AppSettings`: `#[serde(default = "default_true")] pub launch_at_login: bool,`
5. Rust commands: `enable_autostart()`, `disable_autostart()`, `is_autostart_enabled()`
6. JS: import plugin, toggle onclick calls invoke
7. On settings save: sync setting <-> plugin state
8. On app start: if setting true -> enable()

macOS only.

## Acceptance Criteria
- Toggle persists in settings.json
- Toggle reflects actual system state
- Works after reboot (test manual + via setting)
- No errors in logs
- Update README with new setting

## Priority
P50

## Estimate
2h (mostly glue + testing)
