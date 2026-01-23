# Implement Rust Build Caching for CI

**Priority:** 0640  
**Hash:** 031e4c5  
**Status:** Backlog  
**Created:** 2026-01-23

---

## Objective

Optimize the GitHub Actions release pipeline by implementing intelligent Rust caching. This will significantly reduce build times by avoiding redundant compilation of ~100+ dependencies on every run.

---

## 📋 Requirements

### 1. Integrate `Swatinem/rust-cache`
- Add the `Swatinem/rust-cache` action to the `release.yml` workflow.
- This is the industry standard for Rust CI as it intelligently caches the `target` directory and Cargo registry without exceeding storage limits.

### 2. Configuration
- Ensure the cache is scoped correctly to avoid poisoning between different build configurations.
- Map the cache to the `Cargo.lock` file so it invalidates only when dependencies change.

---

## 🛠️ Implementation Snippet

```yaml
- name: Rust Cache
  uses: Swatinem/rust-cache@v2
  with:
    # Use the same cache for all release tags to maximize hits
    shared-key: "release-build"
```

---

## 🧱 Benefits

| Metric               | Without Cache | With Cache (Est.) |
|:---------------------|:--------------|:------------------|
| **Download Time**    | 30-60s        | < 5s              |
| **Compilation Time** | 5-8 min       | 1-2 min           |
| **GitHub Minutes**   | ~10 min       | ~3 min            |

---

## Success Criteria

✅ First build (cold) populates the cache.  
✅ Subsequent builds (warm) show significantly reduced compilation times.  
✅ Cache automatically refreshes when `Cargo.lock` or `src-tauri/Cargo.toml` is modified.
