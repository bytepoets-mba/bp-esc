# Title: Implement OpenRouter API Client

## Description

Fetch balance from OpenRouter API using saved API key.

## Priority
0300

## API Details

**Endpoint**: `GET https://openrouter.ai/api/v1/key`

**Headers**:
```
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Response**:
```json
{
  "data": {
    // balance/usage info
  }
}
```

**Error**:
```json
{
  "error": "error message"
}
```

## Tasks

- [x] Create Tauri command: `fetch_balance(api_key: String)`
  - Use reqwest crate for HTTP client
  - Set Authorization header
  - Parse JSON response
  - Return Result<BalanceData, String>

- [x] Define BalanceData struct (serializable)
  - Extract relevant fields from API response
  - Format for display
  - Calculate remaining balance (limit - usage)

- [x] Handle errors:
  - Invalid API key (401) - user-friendly message
  - Network errors (timeout, connection)
  - Parse errors
  - 10-second timeout implemented

## Acceptance Criteria

- [x] Successfully fetches balance with valid key
- [x] Returns user-friendly error message for invalid key (401)
- [x] Handles network failures gracefully (timeout, connection errors)
- [x] 10-second timeout implemented
- [x] Response data accessible from frontend (BalanceData struct)
- [x] Calculates remaining balance automatically
- [x] Test page created for manual verification

## Dependencies

```toml
# src-tauri/Cargo.toml
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
```

**Note**: These are Rust crates, managed by Cargo. Nix provides the system deps (openssl, pkg-config) but Cargo handles Rust deps.

## Notes

- Keep response parsing simple - just extract what we need for display
- Don't over-engineer
- `reqwest` will use system OpenSSL (provided by Nix devenv)
- Tauri already includes tokio runtime, but explicit for HTTP client

## Status

✅ **COMPLETED** - 2026-01-21

## Implementation Summary

**Tauri Command** (`src-tauri/src/main.rs`):

`fetch_balance(api_key: String)` - Async command returning `Result<BalanceData, String>`

**BalanceData Structure**:
```rust
{
  limit: Option<f64>,      // Total credit limit
  usage: Option<f64>,      // Amount used
  remaining: Option<f64>,  // Calculated: limit - usage
  label: Option<String>    // Optional account label
}
```

**API Integration**:
- Endpoint: `GET https://openrouter.ai/api/v1/key`
- Authorization: `Bearer {api_key}` header
- Timeout: 10 seconds
- Uses reqwest with tokio async runtime

**Error Handling**:
- 401 Unauthorized: "Invalid API key. Please check your key and try again."
- Timeout: "Request timed out. Check your internet connection."
- Connection: "Could not connect to OpenRouter. Check your internet connection."
- Parse errors: Detailed error messages
- Empty key validation

**Testing**:
- `src/test-api.html` - Interactive test page
- Auto-loads saved API key
- Formatted balance card display
- Real-time API testing

**Dependencies Added**:
- `reqwest = { version = "0.11", features = ["json"] }`
- `tokio = { version = "1", features = ["full"] }`

**Technical Details**:
- Async/await with Tauri's async command support
- Proper error propagation with user-friendly messages
- OpenSSL provided by Nix devenv (no extra system deps)
- Calculates remaining balance automatically

**Next Steps**: Build minimal UI (backlog 0400)

## Estimate

4 hours (actual: ~2 hours)
