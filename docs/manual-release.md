# Release Guide

## Prerequisites

- `gh` CLI authenticated as `bytepoets-mba`
- Node.js installed
- Clean working directory
- Version bumped and committed

## Using the Script (Recommended)

```bash
./scripts/release.sh
```

Checks version sync, creates tag, pushes, monitors CI (~10 min), opens release page when done.

**Check or sync versions:**
```bash
./scripts/release.sh --check
./scripts/release.sh --sync 0.5.1
```

## Manual Steps

If you need to do it by hand:

```bash
# 1. Verify versions match
grep '"version"' src-tauri/tauri.conf.json
grep '^version = ' src-tauri/Cargo.toml | head -1
grep '"version"' package.json

# 2. Tag and push
git tag v0.5.1
git push origin v0.5.1

# 3. Monitor
gh run watch
```

CI builds, signs, notarizes, and publishes the release automatically. The Sparkle appcast is generated and attached.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tag already exists | `git tag -d v0.5.1 && git push origin :refs/tags/v0.5.1` (only if unpublished) |
| Uncommitted changes | Commit or stash first |
| CI failed | `gh run view <id> --log` — common causes: expired signing creds, build errors |
| Version mismatch | `./scripts/release.sh --sync <version>`, commit, then release |

## Cost

~10 min x 10x macOS multiplier = **100 GitHub Actions minutes per release**.
