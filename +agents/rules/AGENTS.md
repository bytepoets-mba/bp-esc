# AGENTS.MD

Markus owns this. Start: say hi + 1 motivating line.
Work style: telegraph; noun-phrases ok; minimal grammar; min tokens.

## Project Overview

**BP-ESC** — macOS menubar app for OpenRouter spending tracking.
- **Stack**: Tauri v2 + Rust backend + Vanilla JS/CSS frontend (no framework/build step)
- **Target**: macOS 11+ (universal binary: Apple Silicon + Intel)
- **Rust**: 1.91+, edition 2021
- **Node**: 20+

## Response Style

**TL;DR placement rules:**

- Long answers: TL;DR at beginning AND end
- Short answers: TL;DR only at end
- Very short answers: no TL;DR needed
- Use this syntax for TL;DR: "📍 TL;DR: <summary>"

## Agent Protocol

- Contact: Markus Barta (@markus-barta, markus@barta.com).
- Devices: `imac0` (home iMac), `mba-imac-work` (work iMac), `mba-mbp-work` (portable MacBook).
- PRs: use `gh pr view/diff` (no URLs).
- Only edit AGENTS when user says "edit AGENTS.md" (file: `+agents/rules/AGENTS.md`)
- Guardrails: use `trash` for deletes, never `rm -rf`.
- Web: search early; quote exact errors; prefer 2026+ sources, fallback to 2025+, then older results.
- Style: Friendly telegraph. Drop filler/grammar. Min tokens.

## Screenshots ("use a screenshot")

- Pick newest PNG in `~/Desktop` or `~/Downloads`.
- Verify it's the right UI (ignore filename).
- Size check: `sips -g pixelWidth -g pixelHeight <file>`.
- Optimize tool: for macOS `imageoptim <file>` on Linux `image_optim <file>` - STOP and tell user if the tool is missing.

## Important Locations

| What                             | Location/Notes                                      |
| -------------------------------- | --------------------------------------------------- |
| Secrets / credentials            | 1Password (no agent access) — ping Markus for creds |
| Task/project mgmt                | `+pm/` per repo                                     |

### Creating +pm Backlog Items

**ALWAYS use scripts** for backlog items. Never manual file creation.

```bash
# From repo root
./scripts/create-backlog-item.sh [priority] [description]

# Examples
./scripts/create-backlog-item.sh A10 implement-critical-fix
./scripts/create-backlog-item.sh P50 refactor-auth

# Just hash
./scripts/lib/generate-hash.sh
```

**Priority Schema**: `[A-Z][0-9]{2}` (e.g., `P50`).
- `A00` = Highest priority.
- `P50` = Default starting point.
- `Z99` = Lowest priority.
- AI should "fit in" based on existing items. Higher priority means earlier letter (A-O) or lower number (00-49).

**Rules**:
- ✅ Use scripts (collision-free hashes, validation)
- ❌ Never create +pm files manually
- ❌ Never generate hashes yourself

## Docs

- Follow links until domain makes sense; honor existing patterns.
- Keep notes short; update docs when behavior/API changes (no ship w/o docs).

## Markdown Policy

- **NEVER** create new `.md` files unless user explicitly requests ("create a new doc for X").
- Prefer editing existing docs over creating new ones.
- When asked to "document X": update README.md or existing file, don't create new.
- If tempted to create: ask first ("Should I add this to README.md or create new file?").

## Command Timestamps

- Prefix potentially long-running commands (>10s) with `date &&` (bash) or `date; and` (fish).
- Applies to: searches, nix builds, docker ops, large file ops, test suites, package installs.
- When in doubt, add timestamp. Better unnecessary than wondering when it started.

## Build / Test Commands

### Development
```bash
# Run dev mode (with hot-reload)
npm run build:frontend && npm run dev

# Just frontend build (copies HTML/CSS/JS to dist/)
npm run build:frontend
```

### Production Build
```bash
# Full build: frontend + tauri + dylib fix
npm run build

# Output: target/release/bundle/macos/BP-ESC.app
```

### Testing
```bash
# Run all tests (if any exist)
cargo test

# Run specific test
cargo test test_name

# Run tests in workspace member
cargo test -p bp-esc

# No tests currently in repo; add to tests/ or inline #[cfg(test)] mods
```

### Release
```bash
# Full release (checks version sync, creates + pushes tag, monitors CI)
./scripts/release.sh

# Check version sync only (tauri.conf.json, Cargo.toml, package.json, Info.plist)
./scripts/release.sh --check

# Bump all version files at once (do this before releasing)
./scripts/release.sh --sync 0.6.0
```
- CI builds signed + notarized DMG on tag push (~10 min).
- Before handoff: verify build succeeds locally (`npm run build`).
- CI red: `gh run list/view`, rerun, fix, push, repeat til green.

## Git

- Safe by default: `git status/diff/log`. Push only when user asks.
- `git checkout` ok for PR review / explicit request.
- Branch changes require user consent.
- Destructive ops forbidden unless explicit (`reset --hard`, `clean`, `restore`, `rm`, …).
- Don't delete/rename unexpected stuff; stop + ask.
- No repo-wide S/R scripts; keep edits small/reviewable.
- No amend unless asked.
- Big review: `git --no-pager diff --color=never`.

## Git Security

**NEVER commit secrets.** Forbidden:

- Plain text passwords, API keys, tokens, bcrypt hashes
- Any `.env` files with real credentials

**Safe to commit:** `.env.secrets.example` with placeholders, code referencing env vars.

**Before every commit:** `git diff` to scan for secrets; `git status` to verify files.

**If secrets committed:** STOP AND IMMEDIATELY TELL USER, then discuss → rotate credential → if pushed, assume compromised.

**AI responsibility:** Detect potential secret → STOP → alert user → suggest env var → wait for confirmation.

## Encrypted Files

**NEVER touch `.age`/`.gpg`/`.enc` files without explicit permission.**

## Code Style Guidelines

### Rust (Backend)

**File structure:**
- Single-file architecture: `src-tauri/src/main.rs` (1873 lines).
- Use section comments for organization: `// ============ SECTION ============`

**Formatting:**
- No rustfmt/clippy configured — follow existing style manually.
- 4-space indent, no tabs.
- Keep lines under ~100 chars where reasonable.

**Imports:**
- Group by: std → external crates → tauri → platform-specific.
- Use explicit imports; avoid `use module::*`.
- Example:
  ```rust
  use std::fs;
  use std::path::PathBuf;
  use serde::{Deserialize, Serialize};
  use tauri::{AppHandle, Manager};
  #[cfg(target_os = "macos")]
  use cocoa::base::id;
  ```

**Naming:**
- Functions: `snake_case` (e.g., `read_settings`, `update_menubar_display`).
- Types: `PascalCase` (e.g., `AppSettings`, `BalanceData`).
- Constants: `SCREAMING_SNAKE_CASE`.
- Tauri commands: `#[tauri::command]` + `snake_case`.

**Types:**
- Prefer explicit types in function signatures.
- Use `Result<T, String>` for Tauri commands (frontend expects string errors).
- Serialize/deserialize with `serde`: `#[derive(Serialize, Deserialize)]`.
- Use `#[serde(default)]` for fields with defaults.

**Error handling:**
- Propagate with `?` when possible.
- Convert errors to strings: `.map_err(|e| format!("Context: {}", e))?`
- Print to stderr for debugging: `eprintln!("[Context] message")`.
- Never panic in production code paths.

**macOS-specific:**
- Use `#[cfg(target_os = "macos")]` for platform code.
- Cocoa/objc patterns: follow existing KVO/NSStatusBar examples.
- Always check for null pointers from Objective-C.

### JavaScript (Frontend)

**File structure:**
- Single-file app: `src/app.js` (1801 lines).
- Vanilla JS, no framework, no build pipeline.
- No transpilation — ES6+ features supported by Tauri webview.

**Formatting:**
- 2-space indent, no tabs.
- Semicolons required.
- Single quotes for strings (except HTML).

**Naming:**
- Variables: `camelCase` (e.g., `currentSettings`, `balanceState`).
- Functions: `camelCase` (e.g., `showState`, `syncSettingsToUI`).
- DOM elements: descriptive names (e.g., `limitValue`, `usageMonthBar`).
- Tauri invoke: `await invoke('command_name', { param: value })`.

**DOM:**
- Cache DOM refs at top of DOMContentLoaded.
- Use `querySelector`/`querySelectorAll` + IDs/classes.
- Event handlers: `element.onclick = () => {}` or `addEventListener`.
- No jQuery or similar — pure DOM APIs.

**Error handling:**
- Try/catch around Tauri invokes.
- Display errors in UI: `errorDisplay.textContent = message`.
- Log to console for debugging: `console.error()`.

### CSS (Frontend)

**File structure:**
- Single-file: `src/style.css` (1523 lines).
- No preprocessor, no build step.

**Formatting:**
- 2-space indent.
- Properties alphabetically sorted within rule (preferred but not strict).
- Use CSS custom properties (variables) for colors/spacing.
- Comments: `/* Section heading */`

**Patterns:**
- rgba() for transparency: `rgba(0, 0, 0, 0.1)`.
- Flexbox for layouts.
- Transitions for hover states: `transition: background 0.2s`.
- Scrollbar styling: `::-webkit-scrollbar` (macOS/webkit).

**Naming:**
- Classes: `kebab-case` (e.g., `.api-key-row`, `.settings-sub-tab`).
- IDs: `camelCase` (matches JS vars).
- BEM-ish but not strict: descriptive, scoped names.

### Shell (Fish/Bash)

- User runs fish shell on all machines.
- Shebang: prefer `#!/usr/bin/env bash` for scripts.
- Use shellcheck patterns.

## Critical Thinking

- **Clarity over speed**: If uncertain, ask before proceeding. Better one question than three bugs.
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Tools

### trash

- Move files to Trash: `trash <file>` (never use `rm -rf`).

### gh

- GitHub CLI for PRs/CI/releases.
- Examples: `gh issue view <url>`, `gh pr view <url> --comments --files`.

<frontend_aesthetics>
Avoid "AI slop" UI. Be opinionated + distinctive.

Do:

- Typography: pick a real font; avoid Inter/Roboto/Arial/system defaults.
- Theme: commit to a palette; use CSS vars; bold accents > timid gradients.
- Motion: 1–2 high-impact moments (staggered reveal beats random micro-animation).
- Background: add depth (gradients/patterns), not flat default.

Avoid: purple-on-white clichés, generic component grids, predictable layouts.
</frontend_aesthetics>
