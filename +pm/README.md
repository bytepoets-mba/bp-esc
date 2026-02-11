# Project Management (+pm)

Backlog items, completed tasks, and product requirements.

---

## Structure

```
+pm/
├── README.md              # This file
├── PRD.md                 # Product requirements document
├── backlog/               # Active items
│   └── LNN--hash--description.md
├── done/                  # Completed items
│   └── LNN--hash--description.md
└── canceled/              # Canceled items
│   └── LNN--hash--description.md
```

---

## Priority System

Tasks use **LNN** format (Letter + 2 digits):

```
LNN--hash--description.md
```

**Examples**: `P50--abc1234--fix-bug.md`, `A10--def5678--critical-issue.md`

### Priority Levels

| Letter  | Range | Priority    | Description                             |
| ------- | ----- | ----------- | --------------------------------------- |
| **A-E** | 00-99 | 🔴 Critical | Blocking bugs, security, fix now        |
| **F-O** | 00-99 | 🟠 High     | Important bugs/issues, fix soon         |
| **P**   | 00-99 | 🟡 Medium   | Features and improvements (P50 default) |
| **Q-V** | 00-99 | 🟢 Low      | Nice-to-have, do when time permits      |
| **W-Z** | 00-99 | ⚪ Backlog  | Ideas, future enhancements, someday     |

### Priority Examples

| Priority   | Examples                                              |
| ---------- | ----------------------------------------------------- |
| 🔴 A00-E99 | Security incidents, app crashes, data loss prevention   |
| 🟠 F00-O99 | Important fixes, API changes, breaking changes          |
| 🟡 P00-P99 | UI improvements, new features, refactoring              |
| 🟢 Q00-V99 | Cleanup, cosmetic fixes, documentation                  |
| ⚪ W00-Z99 | Future ideas, nice-to-have, research                    |

---

## Workflow

```
┌──────────┐                      ┌──────┐
│ Backlog  │─────────────────────▶│ Done │
└──────────┘                      └──────┘
      │
      ▼
┌───────────┐
│ Canceled  │
└───────────┘
```

| State         | Folder       | Description                                               |
| ------------- | ------------ | --------------------------------------------------------- |
| **Backlog**   | `backlog/`   | All tasks: ideas, planned work, in-progress items         |
| **Done**      | `done/`      | Verified complete, kept indefinitely as historical record |
| **Canceled**  | `canceled/`  | No longer relevant/needed, kept for reference             |

### Moving Tasks

- **Backlog → Done**: Task complete, verified working
- **Backlog → Canceled**: No longer needed, add note explaining why

---

## When to Create a Task

| Situation                        | Create +pm task?                 |
| -------------------------------- | -------------------------------- |
| Quick fix, single file, <15 min  | ❌ No, just do it                |
| Change affects multiple files    | ✅ Yes                           |
| Change takes >30 min             | ✅ Yes                           |
| New feature or capability        | ✅ Yes                           |
| Refactoring or migration         | ✅ Yes                           |
| Bug fix with root cause analysis | ✅ Yes                           |
| Documentation-only change        | ❌ No (unless major restructure) |

**Rule of thumb**: If you need to track progress or might get interrupted, create a task.

---

## Creating Backlog Items

### Using Scripts (REQUIRED)

**ALWAYS use the script to create backlog items.** Never manually create files.

```bash
# Infrastructure-wide item (default)
./scripts/create-backlog-item.sh P50 fix-bug-description

# With explicit directory
./scripts/create-backlog-item.sh P30 audit-code --dir docs/backlog
```

### File Naming Convention

Format: `LNN--hash--description.md`

**Components**:

- **L**: Letter (A-Z) for priority level
- **NN**: 2-digit sub-priority (00-99)
- **hash**: 7-char hex (auto-generated, collision-checked)
- **description**: kebab-case slug (a-z, 0-9, hyphens)

**Examples**:

- `P50--abc1234--fix-bug.md` (Medium priority, default)
- `A10--def5678--critical-issue.md` (Critical priority)
- `Z99--ghi9012--nice-to-have.md` (Lowest priority)

---

## Backlog Item Template

The script automatically creates this template:

```markdown
# description

**Priority**: LNN
**Status**: Backlog
**Created**: YYYY-MM-DD

---

## Problem

[Brief description of what needs to be fixed or built]

## Solution

[How we're going to solve it]

## Implementation

- [ ] Task 1
- [ ] Task 2
- [ ] Documentation update
- [ ] Test

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass

## Notes

[Optional: Dependencies, risks, references, related items]
```

### Template Guidelines

- **Keep concise**: Problem/Solution should be 1-3 sentences each
- **Actionable tasks**: Implementation uses checkboxes for tracking
- **Testable**: Acceptance criteria must be verifiable
- **Optional Notes**: Dependencies, risks, related items, rollback plans

---

## Test Requirements

Every task should have tests defined:

| Test Type       | Description                               | Required    |
| --------------- | ----------------------------------------- | ----------- |
| **Manual Test** | Human verification steps in the task      | ✅ Yes      |
| **Automated**   | Script or commands that verify the change | Recommended |

### Testing Approaches

| Test Type      | How to Test                                      |
| -------------- | ------------------------------------------------ |
| **Rust**       | `cargo test`, `cargo clippy`, `cargo fmt --check` |
| **JavaScript** | `npm test`, `npm run lint`                       |
| **Tauri**      | `cargo tauri dev`, build and run the app          |
| **CI/CD**      | GitHub Actions workflow run                      |

---

## Related

- [Main README](../README.md) - Project overview
- [Development Guide](../docs/DEVELOPMENT-ENVIRONMENT-GUIDE.md) - Setup and workflow
