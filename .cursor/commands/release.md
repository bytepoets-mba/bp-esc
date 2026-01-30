# /release

Trigger the professional CI/CD release pipeline.

**For manual/human usage, see:** `docs/manual-release.md`

## LLM Agent Logic

### Step 0: Git Status Check
- Run: `git status`
- If uncommitted changes exist: **STOP**, inform user, ask if they want to commit now
- If clean: continue

### Step 1: Version Sync Check
- Read version from `src-tauri/tauri.conf.json` using: `node -e "console.log(require('./src-tauri/tauri.conf.json').version)"`
- Read version from `src-tauri/Cargo.toml` using: `grep '^version = ' src-tauri/Cargo.toml | head -1`
- Read version from `package.json` using: `node -e "console.log(require('./package.json').version)"`
- Compare all three versions
- If mismatch: **STOP**, inform user which files differ, suggest running `./scripts/release.sh --sync <version>` or manual edit
- If synced: continue with that version

### Step 2: Tag Check
- Run: `git fetch --tags`
- Run: `git tag -l v<version>`
- If tag exists: **STOP**, inform user, show existing tag
- If tag doesn't exist: continue

### Step 3: Create and Push Tag
- Run: `git tag v<version>`
- Run: `git push origin v<version>`
- Confirm success

### Step 4: Monitor CI
- Run: `open -a "Zen" "https://github.com/bytepoets-mba/bp-esc/actions"`
- Inform user: "Draft Release will be created upon completion (~10 minutes)"
- Run: `gh run watch` (this will block and monitor)
- When complete, run: `open -a "Zen" "https://github.com/bytepoets-mba/bp-esc/releases"`
- Inform user: "Release workflow complete. Review draft release and publish when ready."

## Alternative: Use Release Script

You can also run the automated script directly:
```bash
./scripts/release.sh
```

The script handles all checks and steps automatically.

## Requirements

- GitHub CLI (`gh`) authenticated as `bytepoets-mba`
- Clean working directory
- Version bumped and synced across all files
- Zen browser installed (for opening URLs)

## Performance Note

- Build takes ~10 minutes on cold cache
- To speed up future releases, run `/warm-cache` after dependency updates
- See `docs/manual-warm-cache.md` for details
