# /release

Trigger the professional CI/CD release pipeline.

## Logic

1.  **Version Check:** Read `version` from `src-tauri/tauri.conf.json`.
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
-   GitHub operations (`gh`) must be authenticated as `bytepoets-mba`.

## Safety

-   Will not tag if there are uncommitted changes.
-   Will not push if the tag already exists on remote.
