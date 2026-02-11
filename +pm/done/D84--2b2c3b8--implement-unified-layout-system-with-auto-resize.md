# Title: implement-unified-layout-system-with-auto-resize

## Description
The current layout is a mix of fixed widths (800px), absolute positioning, and manual resize observers that fight the framework. This leads to issues like the footer being cut off in settings, the window not resizing correctly to content, and difficulty adding new tabs or scrollable content.

We need a unified layout architecture that:
- Uses a "Base Frame" (Flexbox/Grid) with fixed-position Header and Footer.
- Implements a central "Content Area" that handles scrolling properly.
- Integrates with Tauri's window resizing in a predictable way (LogicalSize vs content height).
- Supports dynamic "States" (Tabs) without breaking the container flow.

## Priority
0384

## Plan
1.  **CSS Refactor**: Move away from `width: 800px` on `.container`. Use `width: 100%` and let the Tauri window control the max/min bounds.
2.  **Scrollable Content**: Wrap states in a `.content-area` with `flex: 1` and `overflow-y: auto`.
3.  **Sticky Footer**: Ensure `.footer` is always at the bottom of the visible area, not pushed off by content.
4.  **Auto-Resize Sync**: Refine the `performResize` logic in `app.js` to measure the content correctly and communicate with Rust more efficiently.
5.  **Tab System Foundation**: Structure the HTML to support multiple tabs beyond just "Balance" and "Settings".

## Acceptance Criteria
- [ ] Footer is visible in all app states.
- [ ] Settings grid is fully accessible via scroll if it exceeds window height.
- [ ] Main window resizes smoothly when switching between balance and settings states.
- [ ] No manual `px` heights in the main container (except for fixed elements like header).
