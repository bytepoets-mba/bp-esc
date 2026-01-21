# OpenRouter API Research Notes

**Source**: Existing prototype at `/Users/markus/Code/openrouter-stats`

---

## API Endpoint

**Balance Check**:
```
GET https://openrouter.ai/api/v1/key
```

**Headers**:
```javascript
{
  "Authorization": "Bearer sk-or-v1-xxxxx...",
  "Content-Type": "application/json"
}
```

**Response Structure**:
```javascript
{
  "data": {
    // Balance and usage information
    // (exact fields TBD - inspect prototype response)
  }
}
```

**Error Handling**:
- Non-200 response: `data.error` contains error message
- Network errors: catch and display

---

## Implementation Notes from Prototype

### What We Need (Minimal)
1. **API key storage** - `~/.config/bpesc-balance/.env`
2. **Single fetch call** - GET to `/api/v1/key`
3. **Display balance** - Format currency (€ XXX.XX)
4. **Error handling** - Invalid key, network failure

### What We DON'T Need (Overcomplicated)
- ❌ Multi-user system (admin panel, TOTP, sessions)
- ❌ Multiple API keys per user
- ❌ User management
- ❌ Encryption (single-user, local storage)
- ❌ Rate limiting (single user)
- ❌ Express server (Tauri backend instead)
- ❌ Login/logout flows

---

## Simplified Flow for bp-esc

```
1. App launches
2. Check ~/.config/bpesc-balance/.env for OPENROUTER_API_KEY
3. If exists:
   - Fetch balance from API
   - Display result
4. If not exists:
   - Show input field
   - Save key to .env
   - Fetch balance
```

---

## API Key Format

```
sk-or-v1-{random_characters}
```

**Validation** (basic):
- Starts with `sk-`
- Non-empty string

---

## Error Cases to Handle

1. **No API key** - Show input field
2. **Invalid API key** - API returns error, show message
3. **Network failure** - Timeout, connection error
4. **File I/O errors** - Can't read/write .env

---

## Dependencies We Actually Need

**Tauri**:
- File system access (read/write .env)
- HTTP client (fetch balance)
- UI framework (HTML/CSS/JS or React/Vue/Svelte)

**No need for**:
- Express, sessions, cookies
- Encryption libraries
- Rate limiting
- Authentication middleware

---

## UI Components (Minimal)

1. **API Key Input** (if no key saved)
   - Text field
   - Save button

2. **Balance Display**
   - Show balance: € XXX.XX
   - Refresh button (optional)

3. **Quit Button**

4. **Settings Button** (optional)
   - Edit/update API key

---

## Files to Create

```
src-tauri/          # Rust backend
  - main.rs         # Tauri setup
  - api.rs          # OpenRouter API client
  - config.rs       # .env file handling

src/                # Web frontend
  - index.html      # Main UI
  - app.js          # Balance fetch logic
  - style.css       # Styling

+pm/
  - backlog/        # Implementation tasks
```

---

## Next Steps

Create minimal backlog items:
1. Tauri project setup
2. .env file I/O (~/.config)
3. OpenRouter API client
4. Basic UI (input + display)
5. Error handling

**Estimate**: 2 days (per PRD)
