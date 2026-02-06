# Project Management (+pm)

Backlog items, completed tasks, and product requirements.

## Structure

```
+pm/
├── PRD.md              # Product requirements
├── backlog/            # Active items
├── done/               # Completed items
└── canceled/           # Canceled items
```

## File Naming

Format: `LNN.hhhhhhh.description.md`

- **L**: A-Z priority letter (A highest, Z lowest)
- **NN**: 00-99 sub-priority
- **hhhhhhh**: 7-char hex hash (collision-checked)
- **description**: kebab-case slug

Example: `P50.c7d2b4a.refactor-auth.md`

## Creating Items

Always use the script — never create files manually:

```bash
./scripts/create-backlog-item.sh A10 implement-feature
./scripts/create-backlog-item.sh P50 refactor-auth
```

## Workflow

1. **Create** via script
2. **Work** — edit file, add acceptance criteria, update status
3. **Complete** — `mv +pm/backlog/P50.abc1234.task.md +pm/done/`
4. **Cancel** — `mv +pm/backlog/... +pm/canceled/`

## Priority

| Range | Use |
|-------|-----|
| A-E | Critical, blocking |
| F-O | High priority |
| P (default) | Standard |
| Q-V | Nice-to-have |
| W-Z | Low, experimental |
