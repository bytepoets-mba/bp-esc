# /release

Trigger the professional CI/CD release pipeline.

## Logic

1.  **Version Check:** 
    - Read `version` from `src-tauri/tauri.conf.json`.
    - Fetch remote tags: `git fetch --tags`.
    - Verify `v<version>` does **not** already exist on remote or locally: `git tag -l v<version>`.
    - If it exists, **STOP** and inform the user we must bump the version in `tauri.conf.json` before releasing. Ask them if they want to do that now!
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
