# Title: Implement Cargo Workspace SSOT for Version Management

## Description
Implement a modern, script-free Single Source of Truth (SSOT) for application versioning using Cargo workspace inheritance. This eliminates manual version sync across package.json, tauri.conf.json, Cargo.toml, and Cargo.lock.

## Problem Analysis (Complete Coverage)
**Files requiring version sync:**
1. **`package.json`** (line ~3): `"version": "0.2.0"` - Node.js dev metadata (not bundled/released)
2. **`src-tauri/tauri.conf.json`** (line ~11): `package.version` - Tauri bundle metadata
3. **`src-tauri/Cargo.toml`** (line ~3): `version = \"0.2.0\"` - Rust crate identity
4. **`src-tauri/Cargo.lock`** (line ~307): `[package] version = \"0.2.0\"` - Regenerated on `cargo build`

**Current Pain Points:**
- 3-4 manual edits per release
- Drift risk (e.g. Cargo.toml 0.2.0, tauri.conf 0.1.5)
- No runtime/dynamic access beyond existing `env!(\"CARGO_PKG_VERSION\")`
- Script-based workarounds violate \"no scripts\" rule

## Requirements

### Functional (All Files Covered)
- [ ] **Cargo.toml + Cargo.lock**: Single edit propagates automatically via workspace
- [ ] **tauri.conf.json**: Native env substitution `${TAURI_VERSION}`
- [ ] **package.json**: Manual sync documented (dev-only, low risk) OR one-liner alias
- [ ] **Runtime**: Leverage existing `get_app_version()` using `env!(\"CARGO_PKG_VERSION\")`
- [ ] SSOT edit → full build success with consistent versions

### Non-Functional
- [ ] Zero custom scripts (env vars only)
- [ ] Native Cargo/Tauri features (no hacks)
- [ ] Cross-platform (macOS/Linux/Windows)
- [ ] No breaking changes to build/dev process
- [ ] Works with `cargo tauri dev/build`

## Recommended Solution: Cargo Workspace SSOT (Production Standard)

**Why Best (Senior/Modern):**
- Native Rust ecosystem (Cargo 1.31+ workspaces)
- Used by Tauri templates, leptos/tauri, cargo-dist (ripgrep/deno)
- Zero glue code; `cargo build` handles propagation
- Scales to semantic-release/conventional-commits
- Matches existing `build.rs` + `env!` runtime access

**Step-by-Step Implementation:**

1. **Create root `Cargo.toml` (New SSOT File):**
```toml
[workspace]
members = [\"src-tauri\"]

[workspace.package]
version = \"0.2.0\"
name = \"bp-esc\"
description = \"BYTEPOETS Employee Self-Care - OpenRouter Balance Checker\"
```

2. **Update `src-tauri/Cargo.toml` (2 lines):**
```toml
[package]
name = \"bp-esc\"
version.workspace = true  # Inherits from root!

# Rest unchanged
```

3. **Update `src-tauri/tauri.conf.json` (1 line):**
```json
\"package\": {
  \"productName\": \"BYTEPOETS - ESC\",
  \"version\": \"${TAURI_VERSION}\"  // Native Tauri subst
}
```

4. **package.json** (Dev-only handling):
   - Manual: Edit when bumping root Cargo.toml (safest, zero code)
   - OR alias: `alias bump-version='sed -i \"s/\\\"version\\\": \\\"[0-9.]\\+\\\"/\\\"version\\\": \\\"$(grep -oP \"version = \\\\\\\"\\K[^\\\"]+\" Cargo.toml)\\\"/\" package.json'` (one-liner, optional)

5. **Build Process (Zero Scripts Added):**
```
# Dev: cargo tauri dev
# Release: TAURI_VERSION=0.2.0 cargo tauri build  # Env from root Cargo.toml
export TAURI_VERSION=$(grep -oP \"version = \\\\\\\"\\K[^\\\"]+\" Cargo.toml)
```

**File Coverage Verification:**
| File | How Synced | Manual? | Auto-Regen? |
|------|------------|---------|-------------|
| Cargo.toml | workspace=true | No | Yes |
| Cargo.lock | cargo build | No | Yes |
| tauri.conf.json | ${TAURI_VERSION} | No (env) | Build-time |
| package.json | Manual/doc | Yes (dev-only) | N/A |

**Runtime Access (Already Implemented):**
- `src-tauri/src/main.rs`: `env!(\"CARGO_PKG_VERSION\")` → JS `invoke('get_app_version')`

## Acceptance Criteria

### Functional (Strict)
- [ ] Edit root `Cargo.toml` version → `cargo build` succeeds, Cargo.lock updates
- [ ] `TAURI_VERSION=0.2.0 cargo tauri build` → tauri.conf substitutes correctly
- [ ] App bundle shows 0.2.0 (Info.plist/DMG name)
- [ ] JS `get_app_version()` returns workspace version
- [ ] `cargo metadata` shows unified version across workspace
- [ ] package.json version matches (manual check passes)

### Quality/Edge Cases
- [ ] `cargo tauri dev` works unchanged
- [ ] Cross-platform builds (macOS x64/arm64)
- [ ] No new dependencies/tooling
- [ ] Git clean after workspace setup

### Documentation Updates
- [ ] README.md: \"Version Management\" section with workflow
- [ ] docs/DEVELOPMENT-ENVIRONMENT-GUIDE.md: Build instructions
- [ ] +pm/done: Move this item

## Priority
0040 (High - eliminates release toil)

## Estimate
Small (30-60min + docs/testing)

## Dependencies
None (leverages existing tauri-build/env!)

## Risks/Mitigations
- package.json drift: Document as dev-only, add git hook if needed
- Workspace conflicts: Test `cargo check` immediately

## Alternatives Discarded
- VERSION file + scripts: Violates \"no scripts\"
- build.rs embed only: Doesn't cover bundle metadata
- npm as SSOT: Ignores Rust-native priority
