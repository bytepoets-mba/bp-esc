# Development Guide

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
   First time takes a few minutes to download and build.
   
3. Install Tauri CLI:
   ```bash
   cargo install tauri-cli --version 1.6.2
   ```

**Note**: The `.envrc` uses `devenv direnvrc` which provides the `use devenv` function for direnv integration.

## Development Workflow

### Running in Development Mode

```bash
# Enter devenv shell
devenv shell

# Run Tauri dev server
cargo tauri dev
```

The app will launch with hot-reload enabled.

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

```bash
# Build release .app bundle (includes Nix dylib fix for portability)
devenv shell npm run build

# Output: src-tauri/target/**/bundle/macos/BYTEPOETS - ESC.app
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
# Ensure cargo bin in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Or reinstall
cargo install tauri-cli --version 1.6.2
```

## Next Steps

See `+pm/backlog/` for upcoming features:
- 0300: OpenRouter API client
- 0400: Minimal UI implementation
- 0500: Error handling
