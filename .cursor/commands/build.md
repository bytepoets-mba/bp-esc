# /build

Trigger the professional CI/CD release pipeline.

## Logic

1.  **Version Check:** Read `version` from `src-tauri/tauri.conf.json`.
2.  **Git Tagging:**
    -   Verify the working directory is clean.
    -   Create a tag matching the version (e.g., `v0.2.3`).
    -   Push the tag to `origin`.
3.  **CI Monitoring:** 
    -   Provide the link to the GitHub Actions run.
    -   Explain that a Draft Release will be created upon completion.

## Requirements

-   Ensure `tauri.conf.json` version is bumped before calling.
-   Requires `origin` to be a GitHub repository.

## Safety

-   Will not tag if there are uncommitted changes.
-   Will not push if the tag already exists on remote.
