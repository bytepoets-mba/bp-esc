# /warm-cache

Manually trigger cache warming workflow to speed up future releases.

**For manual/human usage, see:** `docs/manual-warm-cache.md`

## When to Use

Run after updating Rust dependencies (`Cargo.lock` or `Cargo.toml` changed).
Typically needed once per month or less.

## LLM Agent Logic

### Step 1: Check Current Branch (Optional Warning)
- Run: `git branch --show-current`
- If not on `main`: inform user that cache warming should ideally run on `main`, but can proceed on current branch
- Continue regardless

### Step 2: Trigger Workflow
- Run: `gh workflow run cache-warming.yml --ref main`
- Confirm workflow triggered successfully

### Step 3: Monitor Workflow
- Run: `open "https://github.com/bytepoets-mba/bp-esc/actions/workflows/cache-warming.yml"`
- Inform user: "Cache warming in progress (~10 minutes)"
- Wait 3 seconds for workflow to start
- Run: `gh run watch` (will auto-detect latest run)
- When complete: inform user "Cache warming complete. Next release will restore from this cache."

## Alternative: Use Cache Warming Script

You can also run the automated script directly:
```bash
./scripts/warm-cache.sh
```

The script handles all steps automatically.

## Requirements

- GitHub CLI (`gh`) authenticated as `bytepoets-mba`
- Workflow file exists: `.github/workflows/cache-warming.yml`

## Cost

- ~10 minutes × 10x macOS multiplier = 100 GitHub Actions minutes per run
- Only run when dependencies change
