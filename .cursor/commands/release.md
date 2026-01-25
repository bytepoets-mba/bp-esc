# /release

Trigger the professional CI/CD release pipeline.

## Logic

0. **Sync Check:** Ensure everything is saved, staged, and properl pushed.
    -   Check if there are any uncommitted changes: `git status`.
    -   If there are uncommitted changes, **STOP** and inform the user. Ask them if they want to commit now!
    -   If there are no uncommitted changes, continue.
1.  **Version Check:** 
    - Read `version` from `src-tauri/tauri.conf.json`.
    - Fetch remote tags: `git fetch --tags`.
    - Verify `v<version>` does **not** already exist on remote or locally: `git tag -l v<version>`.
    - **Sync Check:** Ensure `version` is consistent across `src-tauri/Cargo.toml` and `package.json`.
    - If inconsistent or tag exists, **STOP** and inform the user. Ask them if they want to sync and bump now!
2.  **Git Tagging:**
    -   Verify the working directory is clean.
    -   Create a tag matching the version (e.g., `v1.2.3`).
    -   Push the specific tag to `origin`: `git push origin v<version>`.
3.  **CI Monitoring:** 
    -   Open the GitHub Actions Page in Zen browser: `open -a "Zen" "https://github.com/bytepoets-mba/bp-esc/actions"`.
    -   Explain that a Draft Release will be created upon completion.
    -   Run a watch command in shell: `gh run watch`. 
    -   Once finished, open the releases page in Zen browser: `open -a "Zen" "https://github.com/bytepoets-mba/bp-esc/releases"`.

## Requirements

-   Ensure `tauri.conf.json` version is bumped before calling.
-   Requires `origin` to be a GitHub repository.
-   GitHub operations (`gh`) must be authenticated as `bytepoets-mba` (handled via `.env.secrets` and `direnv`).

## Safety

-   Will not tag if there are uncommitted changes.
-   Will not push if the tag already exists on remote.
