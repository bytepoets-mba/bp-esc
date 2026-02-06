# BP-ESC

**A quiet companion for your AI budget.**

<p align="center">
  <a href="https://github.com/bytepoets-mba/bp-esc/releases/download/v0.5.1/BP-ESC_0.5.1_universal.dmg">
    <img src="https://img.shields.io/badge/Download-v0.5.1-006497?style=for-the-badge&logo=apple&logoColor=white" alt="Download BP-ESC" />
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/macOS_11+-universal-555?style=for-the-badge&logo=macos&logoColor=white" alt="macOS 11+" />
  &nbsp;
  <img src="https://img.shields.io/github/license/bytepoets-mba/bp-esc?style=for-the-badge&color=555" alt="License" />
</p>

BP-ESC is a native macOS menubar app that keeps your OpenRouter spending visible, paced, and under control. Built by [BYTEPOETS](https://bytepoets.com) — a team that believes writing code is an art form, and that good tools should feel like they belong on your desk.

<p align="center">
  <img src="docs/esc-app.png" alt="BP-ESC" width="520" />
</p>

## What it does

- **Live balance at a glance** — limit, used, remaining. Month, week, day. All in one calm view.
- **Menubar icon** — a tiny hexagon that fills as you spend, colored by pace. You never need to open the window to know where you stand.
- **Pace tracking** — are you ahead, on track, or behind your monthly budget? Visual bars and percentage deltas tell you instantly.
- **Multi-key management** — label your keys, reorder them, switch between them. One click.
- **OpenCode integration** — extract or set your active OpenRouter key directly into [OpenCode](https://opencode.ai)'s auth config.
- **Auto-refresh** — balance updates silently in the background, even when the window is hidden.
- **Native macOS feel** — launch at login, global keyboard shortcut, always-on-top, unfocused dimming, Sparkle auto-updates.

## Getting started

1. Download the latest `.dmg` from [Releases](https://github.com/bytepoets-mba/bp-esc/releases/latest)
2. Drag `BP-ESC.app` to Applications
3. Launch, add your OpenRouter API key in Settings, done

Your key stays on your machine. Config lives at `~/.config/bpesc-balance/` with `0600` permissions.

## Tech stack

| Layer | Tech |
|-------|------|
| Shell | [Tauri v2](https://v2.tauri.app) |
| Backend | Rust |
| Frontend | Vanilla JS, HTML, CSS — no framework, no build step |
| Updates | [Sparkle 2](https://sparkle-project.org) with EdDSA signatures |
| Platform | macOS 11+ (universal binary: Apple Silicon + Intel) |

## Development

```bash
# Prerequisites: Rust, Node.js 20+, Nix (optional, for devenv)
npm install
npm run dev
```

See [`docs/DEVELOPMENT-ENVIRONMENT-GUIDE.md`](docs/DEVELOPMENT-ENVIRONMENT-GUIDE.md) for the full setup guide.

## Contributing

Issues and pull requests are welcome. This is a small, opinionated project — if you're unsure about a direction, open an issue first and we'll talk.

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) — free to use, modify, and share under the same terms.

---

Crafted with care by [BYTEPOETS](https://bytepoets.com).
