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

```bash
# Run Tauri dev server (from project root)
npm run dev
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

This repository requires GitHub operations (`gh`) to be performed as the `bytepoets-mba` user. To automate this via `direnv`:

1.  **Generate a Token**: Create a [Fine-grained Personal Access Token](https://github.com/settings/tokens?type=beta) for the `bytepoets-mba` account with `repo` and `actions` permissions.
2.  **Set up Secrets**: Create a file named `.env.secrets` in the root of the project (this file is git-ignored):
    ```bash
    export GH_TOKEN=github_pat_...
    ```
3.  **Reload**: Run `direnv allow`. The `gh` CLI will now automatically use this token instead of your global account.

#### Local Setup Requirements:
1. **Certificate:** Must be specifically "Developer ID Application". "Apple Development" or "Mac App Distribution" will fail.
2. **Entitlements:** Standard entitlements for Tauri apps (Hardened Runtime) are located in `src-tauri/entitlements/release.entitlements`.
3. **Hardened Runtime:** Always build with `ENABLE_HARDENED_RUNTIME=true` for production.

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

## Next Steps

See `+pm/backlog/` for upcoming features:
- 0300: OpenRouter API client
- 0400: Minimal UI implementation
- 0500: Error handling
