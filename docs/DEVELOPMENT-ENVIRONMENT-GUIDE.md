# Development Environment Guide

## Setup

### Prerequisites

- Nix with direnv installed
- macOS 11.0+ (Big Sur or later)

### Initial Setup

1. Clone the repository
2. Allow direnv (auto-loads environment):
   ```bash
   cd /path/to/bp-esc
   direnv allow
   ```
   
   Environment will load automatically when entering the directory.
   First time takes a few minutes to download and build dependencies.
   
   The environment will automatically:
   - Install Node.js and npm via Nix
   - Run `npm install` to install `@tauri-apps/cli` and other dependencies
   - Set up Rust toolchain and system libraries

**Note**: The `.envrc` uses `devenv direnvrc` which provides the `use devenv` function for direnv integration.

## Development Workflow

### Running in Development Mode

```fish
# Recommended: build frontend assets + run Tauri dev
npm run build:frontend && npm run dev
```

The app will launch with hot-reload enabled.

**Build-only debug (no extra dev run):** If a dev instance is already running, use `npm run build` to surface build errors without starting another dev process. This runs the frontend copy step plus `tauri build`.

**Note**: The Tauri CLI is provided via npm (`@tauri-apps/cli` in `devDependencies`), not via cargo install. This ensures the environment is fully declarative and reproducible.

### Building for Production

**Production Builds (Local):**
```bash
npm run build
```

**Output:** `target/release/bundle/macos/BP-ESC.app`

**CI/CD Build (Recommended):**
The project uses a professional GitHub Actions pipeline for signing and notarization.
1. Bump version in `src-tauri/tauri.conf.json`.
2. Run `/build` command in Cursor (or manually create a `v*` tag).
3. The build happens on GitHub, producing a signed and notarized DMG.

### macOS Code Signing & Notarization

To distribute the app outside the Mac App Store, it must be signed with a **Developer ID Application** certificate and notarized by Apple.

### Dual GitHub Identity (bytepoets-mba)

This project uses the `bytepoets-mba` identity. While Git is handled via SSH aliases, the GitHub CLI (`gh`) and local Git commits need specific configuration to avoid using your global `markus-barta` account.

#### 1. Git User Identity
Set local user details to match the repository owner:
```bash
git config --local user.name "bytepoets-mba"
git config --local user.email "markus@bytepoets.com"
```

#### 2. API Identity (gh CLI)
The most seamless way to switch `gh` identity per-directory is using `direnv` to load a specific token.

1.  **Generate a Token**: Create a [Fine-grained Personal Access Token](https://github.com/settings/tokens?type=beta) for the `bytepoets-mba` account.
    *   **Name**: `bp-github-cli-home`
    *   **Repository access**: Select **"All repositories"** (to use one token for all your BP projects).
    *   **Permissions**: `Actions` (R/W), `Contents` (R/W), `Workflows` (R/W).
    *   **Note on Annotations**: Fine-grained tokens may cause a `403 Forbidden` error when `gh` tries to fetch build annotations (e.g., in `gh run watch`). This is a known GitHub limitation. If you need annotations, use a **Classic PAT** with `repo` scope instead; otherwise, this error can be safely ignored.
2.  **Set up Secrets**: Create a file named `.env.secrets` in the root of the project (git-ignored). You can use `.env.secrets.example` as a template:
    ```bash
    cp .env.secrets.example .env.secrets
    # Then edit .env.secrets and add your token
    ```
3.  **Reload**: Run `direnv allow`.
4.  **Verify**: Run `gh api user --jq '.login'`. It should return `bytepoets-mba`.

#### 3. Verifying the Setup
You can verify both Git and API identities are correctly overridden by running:
```bash
# Verify Git Committer Identity
git config user.name && git config user.email

# Verify GitHub CLI Identity
gh api user --jq '.login'

# Verify Repository Context
gh repo view
```

#### 4. Solving "Could not resolve to a Repository"
Because the git remote uses an SSH alias (`github-bp`), `gh` might not automatically recognize it as a GitHub repository. If `gh` commands fail, manually set the default repository:
```bash
gh repo set-default bytepoets-mba/bp-esc
```

#### 4. SSH Configuration (Reference)
Your `~/.ssh/config` should have an entry like this:
```text
Host github-bp
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_bytepoets
```
And the git remote should use this host:
```bash
git remote set-url origin git@github-bp:bytepoets-mba/bp-esc.git
```

### Version Management

The version must be kept in sync across multiple files. **NEVER** bump only one.

#### Files to Update:
1.  **`src-tauri/tauri.conf.json`**: Primary version source for Tauri.
2.  **`src-tauri/Cargo.toml`**: Rust package version.
3.  **`package.json`**: Node.js/Frontend version.

#### Sync Command:
To verify synchronization, you can run:
```bash
grep -r "\"version\": \"$(node -e "console.log(require('./src-tauri/tauri.conf.json').version)")\"" .
```
Or simply check all three files. The `/release` command now performs this check automatically.

### CI & Caching

The project uses `Swatinem/rust-cache@v2` in GitHub Actions to minimize build times.

#### Caching Strategy
- **Workspace Root**: The cache is configured for the root workspace (`. -> target`). This is important because Tauri's build process artifacts are stored in the root `target/` directory in this workspace setup.
- **Shared Key**: We use `shared-key: "release-build"`. This allows different release tags to share the same cache, which is critical since tags are often unique and wouldn't hit a cache otherwise.
- **Persistence**: `add-job-id-key: false` ensures the cache persists across different workflow runs.

#### Troubleshooting "No cache found"
If a release run reports "No cache found", it is usually because it's the first build after changing the `shared-key` or the workspace path. Subsequent releases on different tags will still benefit from the `shared-key: "release-build"` setup.

### Usage & Billing (macOS Minutes)

macOS runners are significantly more expensive than Linux runners on GitHub Actions.

- **The 10x Multiplier**: GitHub Free provides 2,000 minutes/month, but macOS consumes these at a **10x rate**.
- **The Math**: You effectively have **200 real macOS minutes** per month.
- **Budgeting**: A typical Tauri build takes 10-15 minutes. This means you can afford roughly **15 builds per month** (about 3-4 per week) before hitting the free tier limit.

**Check remaining minutes:**
Visit the **[GitHub Billing Summary](https://github.com/settings/billing/summary)** page. Look for "GitHub Actions" to see your current month's usage.

**Check the cost of the last release build (via CLI):**
```bash
gh api /repos/bytepoets-mba/bp-esc/actions/runs/(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')/timing --jq '.billable'
```

#### Local Setup Requirements:
1. **Certificate:** Must be specifically "Developer ID Application". "Apple Development" or "Mac App Distribution" will fail.
2. **Entitlements:** Standard entitlements for Tauri apps (Hardened Runtime) are located in `src-tauri/entitlements/release.entitlements`.
3. **Hardened Runtime:** Always build with `ENABLE_HARDENED_RUNTIME=true` for production.

#### Sparkle Framework Integration (Auto-Updates)

**Critical Lessons Learned:**

The Sparkle framework (v2.8.1) is used for native macOS auto-updates. Integration requires specific handling for notarization to succeed.

**1. Framework Location:**
- Sparkle.framework is NOT committed to git (in `.gitignore`)
- CI must download it from: `https://github.com/sparkle-project/Sparkle/releases/download/2.8.1/Sparkle-2.8.1.tar.xz`
- Extract to `src-tauri/Sparkle.framework`
- Also extract tools from `bin/` → `src-tauri/sparkle-bin/` (contains `generate_appcast`, `generate_keys`)

**2. Code Signing Requirements (CRITICAL):**

Sparkle.framework contains embedded binaries that MUST be code-signed with hardened runtime AFTER Tauri builds the app.

**CRITICAL: Sign AFTER build, inside the app bundle!**

```bash
# Get the actual signing identity from keychain (same method Tauri uses)
SIGNING_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F'"' '{print $2}')

# Path to framework INSIDE the built app bundle
APP_BUNDLE="target/universal-apple-darwin/release/bundle/macos/BP-ESC.app"
SPARKLE="$APP_BUNDLE/Contents/Frameworks/Sparkle.framework"

# Sign in correct order (DO NOT use --deep flag!)
# 1. Installer.xpc
codesign --force --sign "$SIGNING_IDENTITY" \
  --options runtime \
  "$SPARKLE/Versions/B/XPCServices/Installer.xpc"

# 2. Downloader.xpc (preserve entitlements for Sparkle 2.6+)
codesign --force --sign "$SIGNING_IDENTITY" \
  --options runtime \
  --preserve-metadata=entitlements \
  "$SPARKLE/Versions/B/XPCServices/Downloader.xpc"

# 3. Autoupdate
codesign --force --sign "$SIGNING_IDENTITY" \
  --options runtime \
  "$SPARKLE/Versions/B/Autoupdate"

# 4. Framework itself
codesign --force --sign "$SIGNING_IDENTITY" \
  --options runtime \
  "$SPARKLE"

# 5. Re-sign app bundle (NO --deep!)
codesign --force --sign "$SIGNING_IDENTITY" \
  --options runtime \
  --entitlements src-tauri/entitlements/release.entitlements \
  "$APP_BUNDLE"
```

**Why this matters:**
- Tauri builds and signs the app, but doesn't sign Sparkle's internal binaries with hardened runtime
- Must sign AFTER build, targeting the framework INSIDE the app bundle (not the standalone framework)
- If you hardcode the certificate name, you'll get "item could not be found in keychain" - must query keychain
- NEVER use `--deep` flag - it corrupts XPC service signatures
- Must re-sign app bundle after modifying internal components

**3. CI Workflow Order (CRITICAL - DO NOT CHANGE):**

Based on real-world production implementation (VibeMeter, June 2025):

```yaml
1. Download Sparkle framework to src-tauri/
2. Build Tauri app (bundles framework into .app)
3. Re-sign Sparkle binaries INSIDE the app bundle:
   a. Installer.xpc (with --options runtime)
   b. Downloader.xpc (with --options runtime --preserve-metadata=entitlements)
   c. Autoupdate (with --options runtime)
   d. Sparkle.framework (with --options runtime)
4. Re-sign the app bundle (with --options runtime, NO --deep flag)
5. Notarize
6. Staple (optional, may fail - that's OK)
```

**Why this order:**
- Tauri builds and signs the app, but doesn't know to sign Sparkle's internal binaries with hardened runtime
- We must re-sign AFTER build, targeting the framework INSIDE the app bundle
- Never use `--deep` flag - it corrupts XPC service signatures
- Re-sign app bundle last to update its signature after modifying internal components

**4. Environment Variable for Rust Build:**

The plugin looks for Sparkle.framework in the workspace. Set in `.cargo/config.toml`:
```toml
[env]
SPARKLE_FRAMEWORK_PATH = { value = "", relative = true }
```

This tells the build system to look in the current directory (where src-tauri/Sparkle.framework exists).

**5. Appcast Generation:**

The `generate_appcast` tool is inside the Sparkle archive (`bin/generate_appcast`), NOT a separate download:

```bash
# Extract tools when downloading framework
tar -xf Sparkle-2.8.1.tar.xz -C /tmp
cp -R /tmp/bin/* src-tauri/sparkle-bin/
chmod +x src-tauri/sparkle-bin/*

# Later, generate appcast
./src-tauri/sparkle-bin/generate_appcast \
  --ed-key-file <(echo "$PRIVATE_KEY") \
  --download-url-prefix "https://github.com/org/repo/releases/download/v1.0.0/" \
  output-dir/
```

**6. Appcast & Distribution:**

The appcast.xml is hosted as a GitHub Releases asset. Feed URL (set in Info.plist):
`https://github.com/bytepoets-mba/bp-esc/releases/latest/download/appcast.xml`

CI generates the appcast, signs it with EdDSA, and attaches it to each published release.

**7. References:**

- [Sparkle Documentation](https://sparkle-project.org/documentation/)
- [Code Signing and Notarization: Sparkle and Tears](https://steipete.me/posts/2025/code-signing-and-notarization-sparkle-and-tears) (Peter Steinberger)
- Full Sparkle architecture details: [`docs/SPARKLE-AUTO-UPDATE.md`](./SPARKLE-AUTO-UPDATE.md)

#### GitHub Secrets for CI/CD:
The following secrets must be set in the repository for the `Release` workflow to function:
- `APPLE_CERTIFICATE`: Base64 encoded `.p12` file containing the Developer ID Application certificate and private key.
- `APPLE_CERTIFICATE_PASSWORD`: Password for the `.p12` file.
- `APPLE_ID`: Apple ID email (e.g., `dev@company.com`).
- `APPLE_PASSWORD`: App-specific password generated at [appleid.apple.com](https://appleid.apple.com).
- `APPLE_TEAM_ID`: 10-character team identifier.

#### DMG Creation (node-appdmg):
The project uses `node-appdmg` via `scripts/build-dmg.js` instead of the default Tauri DMG bundler. This bypasses system-level `hdiutil` conflicts common on macOS build machines.

### Verifying Dylib Links (No Nix on Target)

Check the app bundle binary for any `/nix` references:

```bash
otool -L "src-tauri/target/release/bundle/macos/BYTEPOETS - ESC.app/Contents/MacOS/BYTEPOETS - ESC" | grep -i nix
```

If the command prints nothing, the app is clean.

Check the DMG by mounting and inspecting the bundled app:

```bash
hdiutil attach "src-tauri/target/release/bundle/dmg/BYTEPOETS - ESC_0.2.0_x64.dmg" -nobrowse -noverify -noautoopen
otool -L "/Volumes/BYTEPOETS - ESC/BYTEPOETS - ESC.app/Contents/MacOS/BYTEPOETS - ESC" | grep -i nix
hdiutil detach "/Volumes/BYTEPOETS - ESC"
```

### Monitoring Release Progress

To monitor the CI/CD pipeline with live updates and green checkmarks (NixFleet style), you can use this Fish one-liner:

```fish
gh run watch (gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

This will:
1. Find the latest run of the `release.yml` workflow.
2. Provide a live-updating view of every step.
3. Exit with a success/failure code once finished.

## Project Structure

```
bp-esc/
├── src/                       # Frontend (vanilla HTML/CSS/JS)
│   ├── index.html             # Main UI
│   ├── style.css              # Styles
│   ├── app.js                 # Application logic
│   └── assets/                # Images (bp-logo.png, opencode.png)
├── src-tauri/                 # Rust backend
│   ├── src/main.rs            # All Tauri commands (single file)
│   ├── Cargo.toml             # Rust dependencies
│   ├── tauri.conf.json        # Tauri config
│   ├── Info.plist             # macOS plist (Sparkle keys, version)
│   └── entitlements/          # Code signing entitlements
├── scripts/                   # Release, cache warming, backlog tools
├── +pm/                       # Project management (backlog, done, PRD)
├── +agents/                   # AI agent rules and commands
├── docs/                      # Technical documentation
├── devenv.nix                 # Nix development environment
└── .envrc                     # direnv configuration
```

Tauri commands are all in `src-tauri/src/main.rs` — read the source for current signatures.

## Troubleshooting

### Environment not loading

```bash
# Reload direnv
direnv reload
```

### Rust compilation errors

```bash
# Clean build artifacts
cd src-tauri
cargo clean
cd ..
```

### Tauri CLI not found

```bash
# Reinstall npm dependencies
npm install

# Or reload direnv to trigger automatic npm install
direnv reload
```


