# Title: Implement Config File I/O

## Description

Read/write API key to `~/.config/bpesc-balance/.env` with proper permissions.

## Priority
0200

## Requirements

- Tauri filesystem API (`@tauri-apps/api/fs`)
- Path resolution (`@tauri-apps/api/path`)
- Rust backend for file permissions

## Tasks

- [x] Create Tauri command: `read_api_key()`
  - Check if `~/.config/bpesc-balance/.env` exists
  - Read OPENROUTER_API_KEY value
  - Return Option<String>

- [x] Create Tauri command: `save_api_key(key: String)`
  - Create `~/.config/bpesc-balance/` if needed (755 perms)
  - Write `OPENROUTER_API_KEY=sk-...` to .env (600 perms)
  - Return Result<(), String>

- [x] Add error handling:
  - Directory creation failure
  - Permission errors
  - File write errors
  - Empty key validation

## File Structure

```
~/.config/bpesc-balance/
  .env                    # OPENROUTER_API_KEY=sk-or-v1-...
```

## Acceptance Criteria

- [x] Can read existing API key from .env
- [x] Can save new API key to .env
- [x] Directory created with 755 permissions (rwxr-xr-x)
- [x] .env file created with 600 permissions (rw-------)
- [x] Errors returned as user-friendly messages
- [x] Empty key validation
- [x] Test page created for manual verification

## Notes

- Use Tauri's built-in filesystem APIs - they handle cross-platform paths properly
- Rust's `std::fs` for file operations (part of stdlib, no extra deps)
- `std::os::unix::fs::PermissionsExt` for setting Unix permissions on macOS

## Status

✅ **COMPLETED** - 2026-01-21

## Implementation Summary

**Tauri Commands** (`src-tauri/src/main.rs`):

1. `read_api_key()` - Returns `Result<Option<String>, String>`
   - Reads from `~/.config/bpesc-balance/.env`
   - Parses `OPENROUTER_API_KEY=value` format
   - Returns `None` if file doesn't exist
   - Returns `Some(key)` if found

2. `save_api_key(key: String)` - Returns `Result<(), String>`
   - Creates config directory with 755 permissions
   - Writes .env file with 600 permissions
   - Validates non-empty keys
   - Comprehensive error handling

**Testing**:
- `src/test-config.html` - Interactive test page
- `DEVELOPMENT.md` - Complete API documentation

**Technical Details**:
- Uses Rust `std::fs` (no extra dependencies)
- Unix permissions via `std::os::unix::fs::PermissionsExt`
- HOME directory resolution via env var
- Proper error propagation with user-friendly messages

**Security**:
- File permissions: 600 (owner read/write only)
- Directory permissions: 755 (standard config dir)
- Key validation prevents empty values

**Next Steps**: Implement OpenRouter API client (backlog 0300)

## Estimate

4 hours (actual: ~1.5 hours)
