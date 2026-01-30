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

**Note**: The Tauri CLI is provided via npm (`@tauri-apps/cli` in `devDependencies`), not via cargo install. This ensures the environment is fully declarative and reproducible.

### Testing Config File I/O

To test the config file read/write functionality:

1. Start dev server: `cargo tauri dev`
2. Open `src/test-config.html` in the app
3. Test saving an API key
4. Test reading it back
5. Verify file created at `~/.config/bpesc-balance/.env` with correct permissions:
   ```bash
   ls -la ~/.config/bpesc-balance/
   # Should show:
   # drwxr-xr-x  .
   # -rw-------  .env
   ```

### Testing OpenRouter API Client

To test the balance fetching:

1. Ensure you have an API key saved (use `src/test-config.html`)
2. Open `src/test-api.html` in the app
3. Click "Load from Config" to load your saved key
4. Click "Fetch Balance" to test the API call
5. View the balance information returned

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

Sparkle.framework contains embedded binaries that MUST be code-signed with hardened runtime BEFORE the main app build.

**CRITICAL: Use the actual keychain identity, not a hardcoded string!**

```bash
# Get the actual signing identity from keychain (same method Tauri uses)
SIGNING_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F'"' '{print $2}')

# Sign Sparkle binaries with that identity
codesign --force --deep --sign "$SIGNING_IDENTITY" \
  --options runtime \
  "src-tauri/Sparkle.framework/Versions/B/XPCServices/Updater.xpc"

codesign --force --deep --sign "$SIGNING_IDENTITY" \
  --options runtime \
  "src-tauri/Sparkle.framework/Versions/B/Autoupdate"

codesign --force --deep --sign "$SIGNING_IDENTITY" \
  --options runtime \
  "src-tauri/Sparkle.framework"
```

**Why this matters:**
- If Sparkle binaries are NOT signed with hardened runtime, Apple notarization will REJECT with `status: Invalid`
- If you hardcode the certificate name (e.g., "Developer ID Application: BYTEPOETS GmbH"), you'll get "The specified item could not be found in the keychain" because the imported certificate might have a different exact name
- Must query the keychain for the actual identity (same as Tauri does internally)
- Must sign BEFORE building the app (Tauri bundles the framework)
- Cannot sign after - too late

**3. CI Workflow Order:**
```yaml
1. Download Sparkle framework
2. Code sign Sparkle binaries (with hardened runtime)
3. Build Tauri app (bundles signed framework)
4. Code sign main app
5. Notarize
6. Staple (optional, may fail - that's OK)
```

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

**6. Private Repos & GitHub Releases:**

GitHub Pages requires paid plan for private repos. Solution: host `appcast.xml` in GitHub Releases:
- Feed URL: `https://github.com/org/repo/releases/latest/download/appcast.xml`
- CI attaches `appcast.xml` to each release as an asset
- Works with private repos on free plan

**7. Common Mistakes:**

❌ **Don't:** Try to download `generate_appcast` separately - URL doesn't exist  
✅ **Do:** Extract it from the Sparkle archive

❌ **Don't:** Skip signing Sparkle framework before build  
✅ **Do:** Sign with hardened runtime BEFORE Tauri builds

❌ **Don't:** Hardcode certificate identity name (e.g., "Developer ID Application: BYTEPOETS GmbH")  
✅ **Do:** Query keychain with `security find-identity -v -p codesigning`

❌ **Don't:** Make stapling failures block the release  
✅ **Do:** Allow stapling to fail gracefully (app still works)

❌ **Don't:** Assume GitHub Actions cache works across tag refs  
✅ **Do:** Use `main` branch for cache warming, tags restore from there

**8. Cost Implications:**

Each failed release attempt costs ~100 GitHub Actions minutes (10x macOS multiplier).  
With Sparkle integration issues, we burned through ~500 minutes learning these lessons.  
**Lesson:** Test locally first, fix upfront before CI.

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
├── src/                    # Frontend (HTML/CSS/JS)
│   ├── index.html         # Main UI
│   ├── style.css          # Styles
│   ├── app.js             # Application logic
│   └── test-config.html   # Config I/O test page
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── main.rs        # Tauri commands
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── devenv.nix             # Nix development environment
└── .envrc                 # direnv configuration
```

## Available Tauri Commands

### `read_api_key()`

Reads the API key from `~/.config/bpesc-balance/.env`.

**Returns**: `Result<Option<String>, String>`
- `Some(String)` if key exists
- `None` if file doesn't exist or no key found
- `Err(String)` on read error

**Usage**:
```javascript
const key = await invoke('read_api_key');
if (key) {
  console.log('API key found:', key);
} else {
  console.log('No API key saved');
}
```

### `save_api_key(key: String)`

Saves the API key to `~/.config/bpesc-balance/.env` with proper permissions.

**Returns**: `Result<(), String>`
- `Ok(())` on success
- `Err(String)` on failure

**Behavior**:
- Creates `~/.config/bpesc-balance/` if it doesn't exist (755 permissions)
- Writes `.env` file with 600 permissions (owner read/write only)
- Overwrites existing key if present

**Usage**:
```javascript
try {
  await invoke('save_api_key', { key: 'sk-or-v1-...' });
  console.log('API key saved successfully');
} catch (error) {
  console.error('Failed to save:', error);
}
```

### `fetch_balance(api_key: String)`

Fetches balance information from OpenRouter API.

**Returns**: `Result<BalanceData, String>`
- `Ok(BalanceData)` with balance info on success
- `Err(String)` with user-friendly error message on failure

**BalanceData structure**:
```typescript
{
  limit: number | null,      // Total credit limit
  usage: number | null,      // Amount used
  remaining: number | null,  // Calculated: limit - usage
  label: string | null       // Optional account label
}
```

**Error handling**:
- Empty API key: "API key cannot be empty"
- Invalid key (401): "Invalid API key. Please check your key and try again."
- Timeout: "Request timed out. Check your internet connection."
- Network: "Could not connect to OpenRouter. Check your internet connection."

**Usage**:
```javascript
try {
  const balance = await invoke('fetch_balance', { 
    apiKey: 'sk-or-v1-...' 
  });
  console.log('Balance:', balance);
  console.log('Remaining:', balance.remaining);
} catch (error) {
  console.error('Failed to fetch:', error);
}
```

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

## Project Backlog

See `+pm/` for current tasks and progress.
