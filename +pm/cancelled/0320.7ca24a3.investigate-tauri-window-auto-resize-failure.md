# Title: investigate-tauri-window-auto-resize-failure

## Description
The application uses a transparent macOS menubar window. We need the window height to automatically adjust to its content (loading, balance, and settings states). Currently, the content is frequently cut off, especially in the Settings screen.

## Priority
0500

## Attempts So Far (Failed)
1. **Manual `setTimeout` with `setSize`**: Tried measuring `.container` height after state changes with various delays (10ms to 150ms). Results were inconsistent; often cut off the footer or error messages.
2. **CSS `height: auto` and `max-content`**: Tried letting the browser define the height and measuring `scrollHeight` or `getBoundingClientRect()`. Tauri window boundaries did not reliably expand to match.
3. **`ResizeObserver` on `.container`**: Observed the main container and added calculated padding. Still resulted in cut-offs.
4. **`ResizeObserver` on `document.body` + `height: fit-content`**: Attempted the most "professional" approach by observing the entire body and using `offsetHeight`. Content still gets clipped by the OS window boundary.

## Root Cause Hypotheses
- **Draggable Region Conflict**: The `-webkit-app-region: drag` on the container might be interfering with how the browser engine reports the layout height to the OS.
- **Tauri v2 Window Lifecycle**: In Tauri v2, window resizing might need to be coordinated with the main thread more strictly, or there's a race condition between DOM rendering and the `setSize` call.
- **Flexbox Margin Collapsing**: The nested flexbox layout in Settings might have collapsing margins that aren't being captured by standard height measurements.

## Proposed Solution (Best Guess)
Implement a **Rust-side Auto-Resize**:
1. Use the `tauri-plugin-autoresize` if available, or implement a window shadow listener in Rust.
2. Use a MutationObserver in JS to send the *exact* required height to a Rust command.
3. In Rust, use `set_size` and potentially trigger a window "refresh" or "nudge" to force the macOS window server to acknowledge the new dimensions.
4. Alternatively, use a fixed large height for the window but make the *webview* background transparent, and handle the "fake" window height purely in CSS/JS by making the container have the shadow and border.

## Acceptance Criteria
- [ ] Window height adjusts instantly when switching states.
- [ ] No content (footer, buttons, errors) is cut off in any screen.
- [ ] No scrollbars are visible.
- [ ] Works reliably on macOS Sonoma/Sequoia.
