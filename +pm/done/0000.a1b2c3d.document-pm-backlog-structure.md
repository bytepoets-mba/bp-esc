# Document PM Backlog Structure

## Priority: 0000

## Description

Create and document the PM folder structure for managing PRD and backlog items. The +pm folder will contain markdown files for backlog items with the format: priority.hash.short-description.md where priority is an integer (lower number = higher priority), hash is a unique identifier, and short-description is a brief name.

## Implementation Details

### Folder Structure

```
+pm/
├── README.md                 # PM system documentation
├── PRD.md                    # Product Requirements Document
├── backlog/                  # Active backlog items
│   └── PPPP.hhhhhhh.description.md
└── done/                     # Completed items (created as needed)
    └── PPPP.hhhhhhh.description.md
```

### File Naming Convention

**Format**: `[priority].[hash].[short-description].md`

- **Priority**: 4-digit number (0000-9999, lower = higher priority)
- **Hash**: 7-character hex identifier (collision-checked)
- **Description**: Kebab-case slug (a-z, 0-9, hyphens only)

**Example**: `0000.a1b2c3d.document-pm-backlog-structure.md`

### Tooling

Created two DRY scripts for backlog management:

1. **`scripts/lib/generate-hash.sh`**
   - Generates unique 7-char hex hash
   - Checks for collisions in +pm/
   - Can be sourced or run standalone

2. **`scripts/create-backlog-item.sh`**
   - Creates full backlog item with template
   - Takes priority (default: 5000) and description (default: timestamp)
   - Must be run from repo root

**Usage**:
```bash
# Create new backlog item
./scripts/create-backlog-item.sh 0100 implement-feature-x

# Just generate a hash
./scripts/lib/generate-hash.sh
```

### LLM Integration

Added guidance to `.cursor/rules/DEVELOPER.mdc` and `AGENTS.md` to always use these scripts when creating backlog items, ensuring consistency and collision-free hashes.

## Acceptance Criteria

- [x] +pm/ folder structure created
- [x] File naming convention documented
- [x] Hash generation script (DRY, collision-checked)
- [x] Backlog item creation script
- [x] README.md in +pm/ explaining the system
- [x] README.md in scripts/ documenting usage
- [x] Cursor rules updated for LLM usage
- [x] This backlog item documents itself

## Status

Complete - PM system fully documented and tooling in place.