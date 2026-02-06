# Product Requirements: BP-ESC

**Status:** Shipped (actively maintained)
**Last updated:** 2026-02

## Overview

BP-ESC is a native macOS menubar app that gives BYTEPOETS employees (and anyone using OpenRouter) real-time visibility into their AI API spending. It answers one question at a glance: *how much budget do I have left?*

## Target Audience

Built by BYTEPOETS for their team. Open source and available to anyone using OpenRouter API keys.

## Core Features

### Balance Monitoring
- Live balance display: limit, used, remaining
- Breakdowns by month, week, and day
- Pace tracking with visual delta indicators (ahead / on track / behind)

### Menubar Presence
- Hexagon icon with fill level reflecting current balance
- Color-coded by pace status (green/yellow/red)
- Value text next to icon (% or $ with configurable decimals)
- Monochrome mode for minimal menubar appearance

### Multi-Key Management
- Multiple OpenRouter API keys with labels
- Drag-to-reorder, rename, quick-switch
- Per-key balance tracking

### OpenCode Integration
- Extract OpenRouter key from OpenCode's `auth.json`
- Set active key back into OpenCode via right-click context menu
- Read-back verification with toast confirmation

### Auto-Refresh
- Configurable interval (default 5 minutes)
- Background refresh even when window is hidden
- Emits events for menubar icon updates

### Native macOS Experience
- Launch at login
- Global keyboard shortcut (configurable, default F19)
- Always-on-top option
- Unfocused dimming
- Sparkle auto-updates with EdDSA signatures

### Debugging & Observability
- Optional log file with rotation
- Debug bar with scroll/focus metrics
- In-app log drawer

## Technical Architecture

| Layer | Implementation |
|-------|---------------|
| Shell | Tauri v2 |
| Backend | Rust (single `main.rs`) |
| Frontend | Vanilla JS, HTML, CSS — no framework |
| Updates | Sparkle 2 (EdDSA signed appcast via GitHub Releases) |
| Config | `~/.config/bpesc-balance/settings.json` (0600 perms) |
| Platform | macOS 11+ universal binary (Apple Silicon + Intel) |

## Security

- API keys stored locally with restrictive file permissions (0600)
- No keys transmitted except to OpenRouter API over HTTPS
- No telemetry, no analytics, no external services beyond OpenRouter
- Signed with Developer ID, notarized by Apple

## Out of Scope

- Cross-platform (Windows/Linux) — macOS only by design
- Usage history or graphs — may revisit later
- Multiple provider support (only OpenRouter)
