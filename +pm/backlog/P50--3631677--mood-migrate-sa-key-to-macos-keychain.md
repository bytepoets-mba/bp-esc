# Mood: Migrate SA Private Key to macOS Keychain

**Priority**: P50
**Status**: Backlog
**Created**: 2026-02-24

---

## Problem

The Google Sheets service account private key (PEM) is stored as plaintext in `~/.config/bpesc-balance/settings.json` under `mood_service_account_private_key`. Any process or user with filesystem access can read it. A compiled binary with a baked-in secret offers no real protection — extraction via `strings` or disassembly is trivial.

## Solution

Store the private key in the macOS Keychain instead of `settings.json`. The Keychain encrypts secrets at rest, ties access to the user's login, and prevents other apps from reading the value without entitlements.

## Implementation

- [ ] Add `security-framework` or `keychain` crate to `Cargo.toml`
- [ ] On save: write `mood_service_account_private_key` to Keychain (service: `bpesc-balance`, account: `mood-sa-key`) instead of `settings.json`
- [ ] On read: retrieve from Keychain; fall back to `settings.json` for migration of existing installs
- [ ] On reset: delete Keychain entry
- [ ] Remove `mood_service_account_private_key` field from `AppSettings` struct (or keep as empty placeholder for migration)
- [ ] Update Settings UI — textarea still works the same, storage is transparent

## Acceptance Criteria

- [ ] Private key no longer appears in `settings.json`
- [ ] Key survives app restart (persisted in Keychain)
- [ ] Existing installs migrate automatically on first launch
- [ ] Reset App Data clears Keychain entry

## Notes

- macOS only — no cross-platform concern (app is macOS-only)
- `security-framework` crate is the idiomatic Rust approach
- The OR API keys have the same issue but are shorter-lived and rotatable; lower priority
