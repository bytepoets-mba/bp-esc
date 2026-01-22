# Remaining Balance Percentage in Menubar

## Priority: 0053

## Hash: 18de4d4

## Description
Add a feature to display the current remaining balance as a percentage in a tiny 5pt font, centered over the menu bar item cut out from the current image (transparent).

## Requirements
- Display remaining balance as a percentage (e.g., "75%")
- Font: 5pt, BOLD
- Color: transparent cut out of bg image
- Position: centered over the menu bar item
- Should be visually distinct but not intrusive

## Implementation Notes
- This will require modifications to the menu bar rendering logic
- Need to ensure the percentage calculation is accurate
- Should update in real-time as balance changes
- Consider accessibility and visibility on different backgrounds

## Acceptance Criteria
- Percentage is clearly visible but not distracting
- Updates correctly when balance changes
- Works on all supported platforms
- Font size and color match specifications