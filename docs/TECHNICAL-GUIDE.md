# Technical Guide

Short, practical notes for maintainers. This document complements the public README.

## Version Management

- Versions must stay aligned across:
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
  - `package.json`
- Use the release script to check or sync versions:
  - `./scripts/release.sh --check`
  - `./scripts/release.sh --sync 0.4.0`
  - `./scripts/release.sh`

## Auto-Updates (Sparkle)

- macOS updates use Sparkle with EdDSA signing.
- The app checks roughly every 24 hours.
- Manual check: Settings → “Check for Updates”.
- Full details: `docs/SPARKLE-AUTO-UPDATE.md`.

## Security & Local Storage

- All settings (including API keys) live in `~/.config/bpesc-balance/settings.json` (0600 perms).
- Legacy `.env` file is auto-migrated on first launch — no longer the primary store.
- Log files: `~/.config/bpesc-balance/app.log` (rotates to `app.log.old` at 100KB).
- Never commit secrets or real credentials.

## Relevant Commands (Tauri)

- `read_settings`, `save_settings`, `reset_settings`
- `fetch_balance`
- `log_message`, `read_logs`, `clear_logs`
- `update_menubar_display`

## Related Docs

- `docs/manual-release.md`
- `docs/DEVELOPMENT-ENVIRONMENT-GUIDE.md`
