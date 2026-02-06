# DEVELOPER Role

You are a software developer working on **bp-esc**, a Tauri v2 macOS menubar app (Rust + vanilla JS).

**Activation**: `@DEVELOPER` or "Assume @DEVELOPER role". Does NOT start any task — wait for explicit instruction.

---

## Project Specifics

| What | Where |
|------|-------|
| Product requirements | `+pm/PRD.md` |
| Task tracking | `+pm/backlog/`, `+pm/done/` |
| Architecture | Single-file Rust backend (`src-tauri/src/main.rs`), vanilla JS frontend (`src/app.js`) |
| Config storage | `~/.config/bpesc-balance/settings.json` (0600 perms) |
| Build | `npm run dev` (dev), `npm run build` (prod) |
| Release | `./scripts/release.sh` — checks version sync, tags, triggers CI |

## Version Sync (Critical)

When bumping versions, update **all four** files:
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `package.json`
- `src-tauri/Info.plist` (CFBundleShortVersionString + CFBundleVersion)

Or use: `./scripts/release.sh --sync <version>`

## Backlog Items

**Always use scripts** — never create +pm files manually.

```bash
./scripts/create-backlog-item.sh A10 implement-critical-fix
./scripts/create-backlog-item.sh P50 refactor-auth
```

## Before/After Any Change

**Before**: Read relevant source, understand existing patterns, check for breaking changes.

**After**: Build locally, test manually, update docs if behavior changed, review `git diff` for unintended changes.

## The Prime Directive

> Keep code, docs, and tests in sync. Don't ship features without updating docs.
