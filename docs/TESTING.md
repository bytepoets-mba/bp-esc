# Testing Checklist

Manual testing scenarios for BP-ESC.

## Prerequisites

1. Build and run: `npm run build:frontend && npm run dev`
2. Have a valid OpenRouter API key ready

---

## Core Flows

### Initial Launch (No Config)

1. Remove config: `trash ~/.config/bpesc-balance/`
2. Launch app
3. Should show settings with empty key list

- [ ] No errors, no crash
- [ ] Can add key via Settings > OpenRouter

### API Key Management (Multi-Key)

1. Add first key (Settings > OpenRouter > paste key > Add)
2. Add second key with different label
3. Switch between keys via nav arrows on balance view
4. Rename a key (click edit icon)
5. Drag to reorder keys
6. Delete a key

- [ ] Active key indicator updates
- [ ] Balance refreshes on key switch
- [ ] Labels persist after restart
- [ ] Order persists after restart

### API Key Validation

- [ ] Empty key → error toast
- [ ] Key without `sk-` prefix → rejected
- [ ] Key too short (<20 chars) → rejected
- [ ] Valid key → saves, fetches balance

### Balance Display

- [ ] Limit, used, remaining values shown
- [ ] Month/week/day usage rows with pace bars
- [ ] Pace status colors: green (on track), yellow (behind), red (ahead)
- [ ] Menubar icon updates with hex fill + value text
- [ ] Last updated timestamp updates on refresh

### OpenCode Integration

**Left-click** OpenCode icon:
- [ ] Extracts key from `~/.local/share/opencode/auth.json`
- [ ] Toast confirms extraction
- [ ] If key matches existing → switches to it
- [ ] If new key → opens settings with key pre-filled

**Right-click** OpenCode icon:
- [ ] Context menu appears with two options
- [ ] "Extract OpenCode key" works same as left-click
- [ ] "Set OpenCode key to [label]" writes active key to auth.json
- [ ] Read-back verification toast on success
- [ ] Menu dismisses on click-outside or Escape

### Auto-Refresh

- [ ] Balance updates at configured interval (default 5 min)
- [ ] Works when window is hidden
- [ ] Menubar icon updates after background refresh

### Settings

- [ ] Show unit toggle (% / $)
- [ ] Decimal places adjustment
- [ ] Remaining vs Used toggle
- [ ] Auto-refresh toggle + interval
- [ ] Pace thresholds (warn / over)
- [ ] Global shortcut (enable/disable, custom key)
- [ ] Show on start, Launch at login, Always on top
- [ ] Dim unfocused, Monochrome menubar
- [ ] Debug logging, Debug mode toggles
- [ ] All settings persist after restart

### Window Behavior

- [ ] Global shortcut toggles window
- [ ] Menubar icon click toggles window
- [ ] Close button hides (doesn't quit)
- [ ] Quit button exits cleanly
- [ ] Hide button hides window

---

## Edge Cases

- [ ] Disconnect network → refresh → meaningful error, no crash
- [ ] Reconnect → refresh works
- [ ] Corrupted settings.json → app handles gracefully, resets
- [ ] Rapid refresh clicks → no duplicate requests (button disables)
- [ ] Null/missing values from API → displays "-", no JS errors

---

## Security

- [ ] API key not logged in console (unless debug mode)
- [ ] `settings.json` permissions are 0600
- [ ] Error messages don't expose full API key
- [ ] Toast messages don't leak key content
