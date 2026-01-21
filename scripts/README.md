# Scripts

This folder contains utility scripts for the project.

## Problem Statement

When creating backlog items, we need unique identifiers that:
1. **Are truly unique** - No collisions across the entire project
2. **Are cryptographically secure** - Generated using proper UUID generation
3. **Are filesystem-friendly** - Lowercase, no special characters that could cause issues
4. **Are meaningful** - Not just random strings, but proper UUIDs
5. **Don't require external dependencies** - Use built-in macOS tools

## Why Full UUIDs (Not Shortened)?

**❌ Bad Approach: Shortened UUIDs (8 characters)**
- Cutting off a UUID reduces entropy and increases collision risk
- While 8 hex chars (32 bits) is usually fine for small projects, it's not guaranteed unique
- We lose the cryptographic guarantees of UUIDs
- Not following UUID standards

**✅ Good Approach: Full UUIDs (36 characters)**
- Full UUIDs provide 128 bits of entropy - virtually impossible to collide
- Maintains cryptographic security guarantees
- Follows UUID standards (RFC 4122)
- Lowercase for filesystem compatibility

## Available Scripts

### generate-backlog-hash.sh

Generates a unique full UUID for backlog items using macOS's built-in `uuidgen`.

**Usage:**
```bash
./scripts/generate-backlog-hash.sh
```

**Output:**
- Returns a full UUID in lowercase (e.g., `32257bf5-1234-5678-9abc-def012345678`)
- Ensures the UUID doesn't conflict with existing files in the `+pm` folder
- Searches for files matching pattern `*.uuid.*.md`
- Uses cryptographically secure UUID generation (RFC 4122)

**Example:**
```bash
$ ./scripts/generate-backlog-hash.sh
Generating unique backlog UUID...
✓ Unique UUID generated: 32257bf5-1234-5678-9abc-def012345678
32257bf5-1234-5678-9abc-def012345678
```

### create-backlog-item.sh

Creates a new backlog item with a unique UUID and standardized template.

**Usage:**
```bash
./scripts/create-backlog-item.sh "Your backlog item title"
```

**Features:**
- Generates unique UUID automatically using macOS's built-in `uuidgen`
- Creates filename in format: `YYYYMMDD.uuid.slugified-title.md`
- Populates with PRD-style template
- Includes metadata (Document ID, Version, Status, Date, Author)
- Uses full UUID for maximum uniqueness guarantee

**Example:**
```bash
$ ./scripts/create-backlog-item.sh "Implement user authentication"
✓ Created backlog item: 20260121.32257bf5-1234-5678-9abc-def012345678.implement-user-authentication.md
  Location: /Users/markus/Code/bpesc/+pm/backlog/20260121.32257bf5-1234-5678-9abc-def012345678.implement-user-authentication.md

Next steps:
  1. Edit the file to add details
  2. Update status when ready
  3. Move to 'done' folder when complete
```

## File Naming Convention

Backlog items follow this pattern:
```
YYYYMMDD.uuid.slugified-title.md
```

Where:
- `YYYYMMDD`: Date of creation
- `uuid`: Full UUID in lowercase (e.g., `32257bf5-1234-5678-9abc-def012345678`)
- `slugified-title`: Title converted to lowercase, spaces to hyphens, special chars removed

## Technical Details

### UUID Generation
- Uses macOS's built-in `uuidgen` command
- Generates RFC 4122 compliant UUIDs
- Converts to lowercase for filesystem compatibility
- Full 36-character format (including hyphens)

### Uniqueness Guarantee
- Each UUID has 128 bits of entropy
- Collision probability: ~1 in 2^128 (effectively zero)
- Script checks entire `+pm` folder for conflicts
- Retries up to 100 times if needed (extremely unlikely)

### Filesystem Safety
- Lowercase only (no uppercase letters)
- Hyphens are safe in Unix filesystems
- No spaces or special characters that could cause issues
- Compatible with all modern operating systems

## Workflow

1. **Create new item:**
   ```bash
   ./scripts/create-backlog-item.sh "Your task title"
   ```

2. **Edit the created file** to add requirements, acceptance criteria, etc.

3. **Update status** as work progresses:
   - `Draft` → `In Progress` → `Review` → `Done`

4. **Move completed items** to the `done/` folder

5. **Archive canceled items** to the `canceled/` folder

## Why Not Use Short IDs?

While shorter IDs (like Git's 7-character hashes) are convenient, they come with trade-offs:

| Approach | Uniqueness | Collision Risk | Length | Standard |
|----------|------------|----------------|--------|----------|
| **Short UUID (8 chars)** | 32 bits | ~1 in 4 billion | 8 chars | Non-standard |
| **Full UUID (36 chars)** | 128 bits | ~1 in 3.4×10^38 | 36 chars | RFC 4122 |
| **Git SHA (7 chars)** | 28 bits | ~1 in 268 million | 7 chars | Git-specific |

For an internal tool where we want guaranteed uniqueness without any collision risk, full UUIDs are the safest choice. The extra characters in filenames are a small price to pay for cryptographic guarantees.