# Title: implement-professional-window-auto-resize-using-scrollheight

## Description
The application window height frequently cuts off the footer or settings content by approximately 50px. Previous attempts using `getBoundingClientRect` on the `.container` or `body` failed because nested flex/grid elements in the Settings screen report heights before they are fully rendered or stable.

The proposed solution is to switch to a `scrollHeight` based measurement strategy which is more reliable for transparent windows on macOS.

## Priority
0300

## Proposed Implementation Plan
1. **Switch Measurement to `document.documentElement.scrollHeight`**: This captures the "true" intended height of the webview content including any overflow.
2. **Account for Retina Scaling**: Use `PhysicalSize` for the resize call to avoid rounding errors on HiDPI displays.
3. **Add State-Specific Padding**: Implement a 20-30px safety buffer specifically for the Settings screen to account for dynamic elements (help text, error states).
4. **Remove Double-Counting**: Ensure footer and error message heights are not added twice.

## Acceptance Criteria
- [ ] Settings screen footer is fully visible and not cut off.
- [ ] Main balance screen has minimal empty space below footer.
- [ ] No horizontal clipping occurs (rounded corners are visible).
- [ ] Works reliably across state transitions (Loading -> Balance -> Settings).
