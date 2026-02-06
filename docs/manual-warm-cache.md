# Cache Warming

Warms the Rust build cache on `main` so release builds (which run on tag refs) can restore it.

## When to Run

- After updating Rust dependencies (`Cargo.lock` changed)
- Before a planned release if cache is >7 days old (GitHub evicts after 7 days)
- Typically once per month or less

## Usage

```bash
./scripts/warm-cache.sh
```

The script triggers the `cache-warming.yml` workflow, opens Actions in browser, and monitors via `gh run watch`.

**Manual alternative:**
```bash
gh workflow run cache-warming.yml --ref main
gh run watch
```

## Cost

~10 min build time x 10x macOS multiplier = **100 GitHub Actions minutes per run**.
Saves 3-5 minutes per subsequent release.

## Troubleshooting

**"No cache found" on next release:** Check cache scope with:
```bash
gh api repos/bytepoets-mba/bp-esc/actions/caches --jq '.actions_caches[] | select(.ref == "refs/heads/main") | {key: .key, created_at: .created_at}'
```

**Workflow fails:** View logs with `gh run list --workflow=cache-warming.yml --limit 5` then `gh run view <id> --log`.
