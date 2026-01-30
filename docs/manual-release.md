# Manual Release Guide

Guide for releasing BP-ESC without LLM assistance.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated as `bytepoets-mba`
- Node.js installed
- Clean working directory (no uncommitted changes)
- Version bumped in all three files (see Version Management below)

## Version Management

Three files must stay in sync:
- `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` → `version = "X.Y.Z"`
- `package.json` → `"version": "X.Y.Z"`

### Check Version Sync

```bash
./scripts/release.sh --check
```

### Sync Versions (if mismatched)

```bash
# Force all files to specific version
./scripts/release.sh --sync 0.3.7
```

## Option 1: Using the Release Script (Recommended)

The script automates all checks and steps:

```bash
./scripts/release.sh
```

**What it does:**
1. Checks git status (fails if uncommitted changes)
2. Checks version sync across all files
3. Fetches tags and verifies tag doesn't exist
4. Prompts for confirmation
5. Creates and pushes tag
6. Opens GitHub Actions in browser
7. Monitors CI run with `gh run watch`
8. Opens releases page when complete

**Help:**
```bash
./scripts/release.sh --help
```

## Option 2: Manual Steps (No Script)

If you prefer to run commands manually:

### 1. Check Git Status

```bash
git status
```

Ensure working directory is clean. Commit or stash changes if needed.

### 2. Check Version Sync

```bash
# Read versions from each file
grep '"version"' src-tauri/tauri.conf.json
grep '^version = ' src-tauri/Cargo.toml | head -1
grep '"version"' package.json
```

Verify all three show the same version. If not, manually edit files or use:

```bash
./scripts/release.sh --sync <version>
```

### 3. Fetch Tags and Check

```bash
git fetch --tags

# Check if tag exists (replace <VERSION> with your version)
git tag -l v<VERSION>
```

If tag already exists, stop. Otherwise continue.

### 4. Create and Push Tag

```bash
# Replace <VERSION> with your version number
git tag v<VERSION>
git push origin v<VERSION>
```

### 5. Monitor CI Run

```bash
# Open GitHub Actions in browser
open "https://github.com/bytepoets-mba/bp-esc/actions"

# Monitor from terminal
gh run watch
```

Wait ~10 minutes for build to complete.

### 6. Review Draft Release

```bash
# Open releases page in browser
open "https://github.com/bytepoets-mba/bp-esc/releases"
```

Review the draft release, edit if needed, then publish.

## Performance Note

Release builds take ~10 minutes on cold cache.

To speed up future releases, run cache warming after dependency updates:
```bash
./scripts/warm-cache.sh
```

See [manual-warm-cache.md](./manual-warm-cache.md) for details.

## Troubleshooting

### "Tag already exists"

```bash
# List existing tags
git tag -l

# Delete tag locally and remotely (dangerous!)
git tag -d v<VERSION>
git push origin :refs/tags/v<VERSION>
```

Only delete tags if you made a mistake. Never delete published release tags.

### "Uncommitted changes"

```bash
git status
git diff

# Commit changes
git add .
git commit -m "Prepare for release"
git push

# Or stash temporarily
git stash
```

### "CI run failed"

```bash
# View run details
gh run list --limit 5
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

Check logs for errors. Common issues:
- Signing credentials missing/expired
- Build errors (fix in code, commit, delete tag, retry)
- Network timeouts (rerun workflow)

### Version Mismatch After Sync

If `./scripts/release.sh --sync` doesn't work, manually edit files:

**src-tauri/tauri.conf.json:**
```json
{
  "version": "0.3.7",
  ...
}
```

**src-tauri/Cargo.toml:**
```toml
[package]
version = "0.3.7"
```

**package.json:**
```json
{
  "version": "0.3.7",
  ...
}
```

Then commit:
```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml package.json
git commit -m "Bump version to 0.3.7"
git push
```

## Cost

- ~10 minutes × 10x macOS multiplier = **100 GitHub Actions minutes per release**
- Plan accordingly based on your GitHub plan limits
