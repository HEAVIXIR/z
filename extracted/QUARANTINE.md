# Quarantine — Not Extracted

The following ZIP archives were NOT extracted to this branch because they contain
sensitive data, build artifacts, or binary content that should not enter version control:

| Archive | Reason |
|---------|--------|
| `db.zip` | Contains database files (SQLite/PostgreSQL data) — sensitive |
| `upload.zip` | Contains user-uploaded files — sensitive |
| `bun.zip` | Contains Bun runtime + node_modules — build artifact, not source |

These archives remain on the `main` branch as ZIP files only.
They should NOT be committed to any branch in extracted form.
