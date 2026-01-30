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
- **Auto-Updates**: Native macOS Sparkle updates (checks every 24h)
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

Versions must be synced across three files:
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `package.json`

**Automated scripts:**
```bash
# Check version sync
./scripts/release.sh --check

# Force sync all files to specific version
./scripts/release.sh --sync 0.4.0

# Full release (checks sync, tags, pushes, monitors CI)
./scripts/release.sh
```

See `docs/manual-release.md` for details.

## Auto-Updates

BP-ESC uses Sparkle for native macOS auto-updates:
- Checks for updates every 24 hours
- Native macOS update dialog with progress bar
- EdDSA signed updates for security
- Manual check: Settings → "Check for Updates"

See `docs/SPARKLE-AUTO-UPDATE.md` for technical details.

## Security Note

Your API key is stored locally in a `.env` file. Ensure this file is not shared or committed to version control.

---**© 2026 BYTEPOETS GmbH - Internal Use Only**
