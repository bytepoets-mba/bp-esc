# Scripts

Utility scripts for releases, CI, and project management.

## release.sh

Automated release pipeline. Checks version sync, creates git tag, triggers CI, monitors build.

```bash
./scripts/release.sh              # Full release
./scripts/release.sh --check      # Check version sync only
./scripts/release.sh --sync 0.5.1 # Force-sync all version files
./scripts/release.sh --help
```

Requires: `gh` CLI authenticated, Node.js, clean working directory.

## warm-cache.sh

Triggers CI cache warming to speed up future releases (~3-5 min savings).

```bash
./scripts/warm-cache.sh
```

Run after `Cargo.lock` changes. Costs ~100 GitHub Actions minutes (10x macOS multiplier).

## create-backlog-item.sh

Creates a new `+pm/backlog/` item with collision-free hash.

```bash
./scripts/create-backlog-item.sh A10 implement-feature
./scripts/create-backlog-item.sh P50 refactor-auth
./scripts/create-backlog-item.sh     # Defaults: P50, timestamp slug
```

Priority format: `[A-Z][0-9]{2}` — `A00` highest, `P50` default, `Z99` lowest.

## lib/generate-hash.sh

Standalone 7-char hex hash generator. Used internally by `create-backlog-item.sh`.

```bash
./scripts/lib/generate-hash.sh    # Prints hash, e.g. a1b2c3d
```
