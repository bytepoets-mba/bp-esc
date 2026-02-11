# Title: implement-multi-api-key-management

## Description
Refactor the application to support multiple OpenRouter API keys with user-defined labels (e.g., "Work", "Home"). This evolution moves the app from a single-user tool to a profile-managed utility, allowing seamless switching between different budget environments.

### Core Requirements
- **Dynamic List UI**: 
    - Implement a row-based interface in the Settings screen.
    - Add `+` and `-` buttons to dynamically manage the list of keys.
    - Each row must include a **Label** field and the **API Key** (password) field.
- **Active Profile Selection**:
    - Add a selection mechanism (dropdown or radio) to designate one key as the "Primary/Active" key.
    - Visual feedback for the currently active profile.
- **Space-Saving UI (Unified Styling)**:
    - Maintain the "side-by-side" control layout established in previous refactors (labels and inputs on the same line).
    - Ensure new dynamic rows fit within the scrollable `content-area` without breaking the auto-resize logic.
- **Global Routing & State**:
    - All background logic (`fetch_balance`, `update_menubar_display`, hexagon drawing) must automatically route through the designated "Active" key.
    - The "Last Updated" timestamp and manual refresh must apply to the *currently selected* key.
- **Persistence & Migration**:
    - Update Rust `AppSettings` struct to store a collection of profiles instead of a single string.
    - **CRITICAL**: Automatically migrate the user's existing single API key into a default profile (e.g., labeled "Default" or "Account 1") on first run to avoid data loss.

## Priority
P50

## Technical Implementation Notes
- **Backend (main.rs)**: Define a new `ApiKeyProfile` struct: `{ id: String, label: String, key: String }`.
- **Frontend (app.js)**: 
    - Update `syncSettingsToUI` and `saveSettingsAction` to handle the array of keys.
    - Implement a template-based row renderer for the dynamic list.
- **Validation**: Every key in the list must undergo the standard `sk-` format and length validation before persistence.
- **Error Logging**: Ensure any failures during multi-key switching or fetching are captured in the `error.log` paper trail.

## Acceptance Criteria
- [ ] User can add a second API key with a custom label.
- [ ] Switching the "Active" key immediately triggers a background refresh of the hexagon and menubar icon.
- [ ] Deleting the active key forces a selection of another available key or reverts to the settings screen.
- [ ] Existing API key remains functional after the update (successful migration).
