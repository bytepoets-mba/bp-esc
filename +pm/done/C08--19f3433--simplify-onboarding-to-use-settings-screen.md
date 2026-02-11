# Title: simplify-onboarding-to-use-settings-screen

## Description
Instead of having a dedicated "No API Key" onboarding screen, the app should leverage the existing Settings screen for initial configuration. This simplifies the code, reduces UI redundancy, and allows users to configure all preferences (refresh interval, display unit) immediately. 

Additionally, we need a "Reset to Defaults" feature to allow users to completely wipe their configuration and start fresh.

## Proposed Changes
1. **Frontend (index.html)**:
   - Remove the `#noKeyState` div and its unique input/button logic.
   - Add a "Reset to Defaults" button in the Settings view (likely at the bottom or near the "Quit" action).
2. **Frontend (app.js)**:
   - On initial load, if no API key is found, transition directly to `showState('settings')`.
   - Update the "Done" button logic in the settings view to ensure it validates the presence of an API key before allowing the user to view the balance screen.
   - Implement `resetSettingsAction`: Calls a new backend command to delete the config file, clears local state, and returns the user to the initial setup (Settings screen).
   - Remove redundant event handlers for the old onboarding state (`saveKeyBtn`, `apiKeyInput`).
3. **Backend (main.rs)**:
   - Implement a `reset_settings` command that deletes the configuration file (`~/.config/bpesc-balance/.env`).
4. **UX Improvement**:
   - Auto-focus the API key field when Settings is shown as initial setup.
   - Add a confirmation dialog before resetting settings.

## Expected Behavior
- New user opens app -> Settings screen appears automatically.
- Existing user clicks "Reset" -> Config is wiped -> App returns to Settings screen state as if first install.

## Priority
0320

## Additional Requirements
- [ ] Remove `#noKeyState` from `index.html`.
- [ ] Add "Reset to Defaults" button to Settings UI.
- [ ] Implement `reset_settings` command in Rust.
- [ ] Update `init()` in `app.js` to default to `settings` state if `!currentSettings.api_key`.
- [ ] Ensure "Done" button handles transition to `balance` state only if key is valid.
