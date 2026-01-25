# BYTEPOETS Employee Self-Care App (ESC)

**Internal Tool - BYTEPOETS GmbH Employees Only**

Desktop macOS application for BYTEPOETS employees to securely monitor OpenRouter API credit balance and other self-care features.

**Completed Milestones** (+pm/done):
- Tauri desktop setup
- Secure config I/O (`~/.config/bpesc-balance/.env`)
- OpenRouter API integration
- Responsive UI build
- Error handling
- Cargo workspace versioning

## Features

- **Secure Storage**: API key in `~/.config/bpesc-balance/.env` (755 dir, 600 file)
- **Live Balances**: Limit/Used/Remaining (🟢 >$5, 🟠 <$5, 🔴 <0)
- **Auto-Refresh**: 5min toggle (background-safe)
- **UX Flow**: Startup auto-load → Balance or input → Controls
- **Controls**: 🔄 Refresh | ⚙️ Edit Key | ✕ Quit
- **Validation**: `sk-` prefix, len≥20 (client/server)
- **Errors**: Timeout(10s), 401, network/JSON/API w/ UX messages
- **Version**: Live `vX.Y.Z` (Cargo.toml)
- **Portable**: Nix-free .app/DMG bundles

## Quick Start

1. Launch `BYTEPOETS - ESC.app`
2. Enter `sk-or-v1-...` → **Save & Check**
3. Monitor balances → Toggle **Auto-refresh**
4. ⚙️ Settings → Edit/Quit

## Backend Commands

```rust
read_api_key()     // Option<String>
save_api_key(key)  // Validates + perms
fetch_balance(key) // {limit,usage,remaining,label?}
get_app_version()  // CARGO_PKG_VERSION
```

**API**: `GET openrouter.ai/api/v1/key` Bearer auth

**Dev Tests**: `src/test-config.html` | `src/test-api.html`

## Security Note

Your API key is stored locally in a `.env` file. Ensure this file is not shared or committed to version control.

## Version Management

Version is managed as Single Source of Truth via Cargo workspace in root `Cargo.toml`.

**To bump version:**
1. Edit `[workspace.package].version` in `Cargo.toml`
2. Sync `package.json` "version" manually (dev-only file)
3. Build: `export TAURI_VERSION=0.2.0 && npm run build`

**Runtime:** JS `invoke('get_app_version')` returns `CARGO_PKG_VERSION`

## Security Note

Your API key is stored locally in a `.env` file. Ensure this file is not shared or committed to version control.

---**© 2026 BYTEPOETS GmbH - Internal Use Only**
