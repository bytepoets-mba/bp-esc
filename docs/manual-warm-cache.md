# Manual Cache Warming Guide

Guide for warming the Rust build cache to speed up future releases.

## When to Use

Run cache warming after updating Rust dependencies:
- `Cargo.lock` changed
- `Cargo.toml` dependencies modified
- New Rust crates added

Typically needed **once per month or less**.

## Why Cache Warming?

- Release workflows run on unique tag refs (e.g., `v0.3.6`, `v0.3.7`)
- Each tag ref is isolated and can't access caches from other tags
- Tags CAN restore caches from the `main` branch
- Cache warming runs a build on `main` to create a cache for releases to use

**Performance:**
- Cold cache release: ~10 minutes
- Cached release: ~5-7 minutes (estimated)
- Savings: 3-5 minutes per release

## Option 1: Using the Script (Recommended)

```bash
./scripts/warm-cache.sh
```

**What it does:**
1. Checks current branch (warns if not on `main`)
2. Triggers cache warming workflow via GitHub API
3. Opens GitHub Actions in browser
4. Monitors workflow with `gh run watch`
5. Reports when complete

**Help:**
```bash
./scripts/warm-cache.sh --help
```

## Option 2: Manual Steps (No Script)

### 1. Trigger Workflow

```bash
gh workflow run cache-warming.yml --ref main
```

### 2. Monitor Workflow

```bash
# Open in browser
open "https://github.com/bytepoets-mba/bp-esc/actions/workflows/cache-warming.yml"

# Or monitor from terminal
gh run watch
```

Wait ~10 minutes for build to complete.

### 3. Verify Cache

```bash
# Check that cache was created
gh api repos/bytepoets-mba/bp-esc/actions/caches --jq '.actions_caches[] | select(.key | startswith("v0-rust-release-build")) | {key: .key, created_at: .created_at, ref: .ref}' | head -5
```

Look for recent cache with `ref: "refs/heads/main"`.

## Option 3: Via GitHub Web UI

1. Go to: https://github.com/bytepoets-mba/bp-esc/actions/workflows/cache-warming.yml
2. Click "Run workflow" button
3. Select branch: `main`
4. Click green "Run workflow" button
5. Watch progress in the Actions tab

## Workflow Details

**Workflow file:** `.github/workflows/cache-warming.yml`

**What it does:**
- Checks out code on `main` branch
- Installs Node.js and Rust toolchains
- Runs Rust cache action (same config as release)
- Builds Tauri app in **debug mode** (faster than release)
- Saves cache scoped to `refs/heads/main`

**Debug vs Release:**
- Cache warming uses debug build (faster compilation)
- Release workflow uses release build (optimized binaries)
- Both share the same dependency cache (crates registry/git)
- Debug mode is sufficient for cache warming

## Verification

After cache warming completes, next release should show:

```
Cache Configuration
  ...
  Restore Key: v0-rust-release-build-Darwin-arm64-XXXXXX
  Cache Key: v0-rust-release-build-Darwin-arm64-XXXXXX-YYYYYYYY
  ...
... Restoring cache ...
Cache restored from key: v0-rust-release-build-Darwin-arm64-XXXXXX-ZZZZZZZZ
```

Instead of:
```
... Restoring cache ...
No cache found.
```

## Cost

- ~10 minutes × 10x macOS multiplier = **100 GitHub Actions minutes per run**
- Only run when dependencies change (not every commit)
- Trade-off: spend 100 minutes now to save 3-5 minutes per release

## Troubleshooting

### "Workflow not found"

Ensure `.github/workflows/cache-warming.yml` exists and is pushed to `main`:

```bash
git ls-files .github/workflows/cache-warming.yml
```

If missing, commit and push it first.

### "No cache found" after warming

Check cache scope:

```bash
# View recent caches
gh api repos/bytepoets-mba/bp-esc/actions/caches --jq '.actions_caches[] | {key: .key, ref: .ref, created_at: .created_at}' | head -10
```

Verify cache has `ref: "refs/heads/main"`. If showing tag refs, workflow ran on wrong branch.

### Workflow fails

```bash
# View logs
gh run list --workflow=cache-warming.yml --limit 5
gh run view <run-id> --log
```

Common issues:
- Build errors (fix in code, commit to `main`, retry)
- Rust toolchain issues (usually transient, rerun workflow)
- Disk space (rare, contact GitHub support)

### Cache eviction

GitHub automatically evicts caches after 7 days of no access.

If releasing less frequently than weekly, you may need to warm cache before each release.

## Best Practices

1. **Warm cache after dependency updates:**
   ```bash
   # After updating Cargo.toml
   git add Cargo.toml Cargo.lock
   git commit -m "Update dependencies"
   git push
   ./scripts/warm-cache.sh
   ```

2. **Warm cache before planned releases:**
   ```bash
   # Day before release
   ./scripts/warm-cache.sh
   
   # Next day, release will be faster
   ./scripts/release.sh
   ```

3. **Don't over-warm:**
   - Cache warming costs 100 minutes
   - Only saves 3-5 minutes per release
   - Run when needed, not preventively

4. **Monitor cache age:**
   ```bash
   # Check last cache date
   gh api repos/bytepoets-mba/bp-esc/actions/caches --jq '.actions_caches[] | select(.ref == "refs/heads/main") | {key: .key, created_at: .created_at}' | head -1
   ```
   
   If cache is >7 days old and no releases planned, skip warming.
