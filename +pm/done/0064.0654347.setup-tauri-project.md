# Title: Setup Tauri Project

## Description

Initialize Tauri project structure for bp-esc macOS app.

## Priority
0100

## Requirements

- Nix with direnv for reproducible dev environment
- Rust toolchain (via Nix)
- Node.js/npm (via Nix)
- Tauri dependencies (pkg-config, openssl)
- macOS 11.0+ target

## Tasks

### 1. Nix Environment Setup

- [x] Create `devenv.nix`:
  ```nix
  { pkgs, ... }:
  {
    packages = with pkgs; [
      rustc
      cargo
      nodejs
      pkg-config
      openssl
      # tauri-cli  # if available in nixpkgs, or install via cargo
    ];
    
    env = {
      PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
    };
    
    enterShell = ''
      echo "🦀 Tauri dev environment loaded"
      echo "Rust: $(rustc --version)"
      echo "Node: $(node --version)"
    '';
  }
  ```

- [x] Create `.envrc`:
  ```bash
  use devenv
  ```

- [x] Run `direnv allow` and verify environment loads

- [x] Install Tauri CLI: `cargo install tauri-cli`
  (or add to devenv if available in nixpkgs)

### 2. Tauri Project Initialization

- [x] Run `cargo tauri init` or use create-tauri-app

- [x] Configure `tauri.conf.json`:
  - App name: "BP Employee Self-Care"
  - Bundle identifier: com.bytepoets.bp-esc
  - macOS target: 11.0+
  - Window config (size, resizable, etc.)

- [x] Choose frontend: Plain HTML/CSS/JS (simplest)

- [x] Basic HTML/CSS/JS placeholder created

## Acceptance Criteria

- [x] `direnv allow` loads environment without errors
- [x] Rust and Node.js available in shell
- [x] Project structure created
- [x] Tauri v1.8.0 configured
- [x] Bundle identifier: com.bytepoets.bp-esc
- [x] macOS 11.0+ target set
- [x] Window: 600x500, centered, resizable
- [x] `.envrc` and `devenv.nix` committed to repo
- [x] Basic frontend placeholder (src/index.html, style.css, app.js)
- [x] .gitignore excludes build artifacts and dev files

## Notes

- Keep it minimal - no fancy frontend framework needed
- Nix ensures reproducible builds across machines
- `devenv.nix` is simpler than traditional `shell.nix`
- If `tauri-cli` not in nixpkgs, install via cargo (fine for dev tools)

## Status

✅ **COMPLETED** - 2026-01-21

## Implementation Summary

Created complete Tauri project setup with Nix/direnv for reproducible development:

**Nix Environment** (`devenv.nix`):
- Rust 1.91.1, Cargo 1.91.0
- Node.js 22.21.1
- pkg-config, openssl system dependencies
- Auto-loads via direnv

**Tauri Configuration**:
- Bundle ID: `com.bytepoets.bp-esc`
- macOS 11.0+ minimum
- Window: 600x500px, centered
- Build system ready

**Frontend Structure**:
- Basic HTML/CSS/JS placeholder in `src/`
- Will be implemented in backlog 0400

**Next Steps**: Implement config file I/O (backlog 0200)

## Estimate

4 hours (actual: ~2 hours including setup)
