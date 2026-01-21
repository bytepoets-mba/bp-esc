# Scripts

Utility scripts for project management and development workflows.

---

## Overview

This directory contains scripts for managing backlog items with unique, collision-free identifiers.

**Design Philosophy**: Keep it simple, DRY, and dependency-free (bash built-ins only).

---

## Available Scripts

### `lib/generate-hash.sh`

Generates unique 7-character hex hash for backlog items.

**Usage (standalone)**:
```bash
./scripts/lib/generate-hash.sh
# Output: a1b2c3d
```

**Usage (sourced)**:
```bash
source scripts/lib/generate-hash.sh
hash=$(generate_unique_hash)
echo "Generated: $hash"
```

**Features**:
- 7-character hex identifier (0-9, a-f)
- Collision-checked against existing files in `+pm/`
- Uses bash `$RANDOM` (no external dependencies)
- 28 bits entropy (~268 million possible values)

---

### `create-backlog-item.sh`

Creates new backlog item with template and unique hash.

**Usage**:
```bash
# Run from repository root
./scripts/create-backlog-item.sh [priority] [description]

# Examples:
./scripts/create-backlog-item.sh 0100 implement-oauth
./scripts/create-backlog-item.sh 5000 refactor-auth-module
./scripts/create-backlog-item.sh  # Uses defaults
```

**Arguments**:
- `priority`: 4-digit number (default: 5000)
  - Must be numeric
  - Auto-padded to 4 digits
- `description`: Kebab-case slug (default: timestamp YYYY-MM-DD-HH-MM-SS)
  - Only a-z, 0-9, hyphens allowed
  - Validation enforced

**Output**:
```
Created file: +pm/0100.a7f3e9c.implement-oauth.md
```

**Template**:
```markdown
# Title: {description}

## Description
[Detailed description of the backlog item goes here.]

## Priority
{priority}

## Additional Requirements
[Add any other details, such as dependencies, estimates, or acceptance criteria.]
```

**Validation**:
- Checks for `+pm/` directory (must run from repo root)
- Validates priority is numeric
- Validates description matches `[a-z0-9-]+` pattern
- Auto-generates collision-free hash

---

## File Naming Convention

Format: `PPPP.hhhhhhh.description.md`

**Components**:
- **PPPP**: Priority (0000-9999, padded to 4 digits)
- **hhhhhhh**: Hash (7-char hex, collision-checked)
- **description**: Slug (a-z, 0-9, hyphens)

**Examples**:
```
0000.a1b2c3d.document-pm-structure.md
0100.f3e8a91.implement-user-auth.md
5000.c7d2b4a.refactor-legacy-code.md
```

---

## Technical Details

### Hash Generation Algorithm

```bash
# Generate 8-char hex from two $RANDOM values
full_hash=$(printf "%04x%04x" $RANDOM $RANDOM)
hash=${full_hash:0:7}  # Take first 7 chars

# Check collision
if ! ls +pm/*."${hash}".*.md > /dev/null 2>&1; then
  # Unique - use it
fi
```

**Why 7 characters?**
- Balance between brevity and collision resistance
- 28 bits entropy = ~268 million possible values
- Git uses 7 chars for short SHAs (good precedent)
- Short enough for filenames, long enough for uniqueness

**Why not cryptographic?**
- Don't need cryptographic security for task IDs
- `$RANDOM` is sufficient for project-scale uniqueness
- Keeps scripts dependency-free (no external tools)
- Collision check provides safety net

### Collision Handling

Script checks existing files before accepting a hash:
```bash
ls +pm/*."${hash}".*.md > /dev/null 2>&1
```

If collision detected (extremely rare), generates new hash and retries.

---

## Workflow

### 1. Create Backlog Item
```bash
./scripts/create-backlog-item.sh 0100 add-user-settings
```

### 2. Edit the File
```bash
# File created: +pm/backlog/0100.a7f3e9c.add-user-settings.md
# Edit to add details, acceptance criteria, etc.
```

### 3. Track Progress
Update the `## Status` field as work progresses.

### 4. Complete
```bash
mkdir -p +pm/done
mv +pm/backlog/0100.a7f3e9c.add-user-settings.md +pm/done/
```

---

## Priority Guidelines

| Range | Use Case |
|-------|----------|
| 0000-0999 | Critical, blocking, infrastructure |
| 1000-2999 | High priority features |
| 3000-4999 | Standard features |
| 5000-6999 | Medium priority (default) |
| 7000-8999 | Nice-to-have, improvements |
| 9000-9999 | Low priority, future ideas |

---

## LLM/Agent Usage

**Important**: When using Cursor or other AI agents, always use these scripts for creating backlog items.

**Never**:
- Manually create hash values
- Create files without using the scripts
- Generate hashes with other methods

**Always**:
- Use `./scripts/create-backlog-item.sh` for new items
- Use `./scripts/lib/generate-hash.sh` if you need just a hash
- Run from repository root

This ensures:
- Collision-free hashes
- Consistent file naming
- Proper validation
- Standard templates

---

## Error Handling

### "Error: +pm/ directory not found"
**Solution**: Run script from repository root (where `+pm/` exists)

### Invalid priority
**Result**: Defaults to 5000, continues with warning

### Invalid description
**Result**: Uses timestamp (YYYY-MM-DD-HH-MM-SS) as fallback

---

## Examples

### High Priority Feature
```bash
./scripts/create-backlog-item.sh 0100 implement-oauth
# Creates: +pm/backlog/0100.a7f3e9c.implement-oauth.md
```

### Default Priority
```bash
./scripts/create-backlog-item.sh "" refactor-auth
# Creates: +pm/backlog/5000.c7d2b4a.refactor-auth.md
```

### Generate Hash Only
```bash
hash=$(./scripts/lib/generate-hash.sh)
echo "Use this hash: $hash"
# Output: Use this hash: f3e8a91
```

### Sourced Hash Generation
```bash
source scripts/lib/generate-hash.sh
hash=$(generate_unique_hash)
filename="+pm/backlog/5000.${hash}.my-task.md"
```

---

## Design Decisions

### Why Bash?
- Available everywhere (macOS, Linux)
- No external dependencies
- Simple, transparent logic
- Easy to audit and modify

### Why Not UUIDs?
- Too long for filenames (36 chars)
- Overkill for project-scale task tracking
- 7-char hex is industry standard (Git)
- Collision check adds safety

### Why Separate Hash Script?
- **DRY**: Reusable hash generation
- **Flexibility**: Use standalone or sourced
- **Testing**: Easy to verify collision checking
- **Composability**: Use in other scripts

---

## Future Enhancements

Possible additions (only if needed):
- Move completed items script
- Bulk priority update script
- Backlog stats/reporting
- Integration with git hooks

Current scripts are intentionally minimal - add features only when clear need emerges.