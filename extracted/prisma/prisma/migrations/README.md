# Prisma Migrations — HEAVIX

This directory is the **canonical schema-change history** for the
HEAVIX project. It is the source of truth that production deploys
replay, in order, to reconstruct the database schema.

The strategy, rationale, and SQLite↔PostgreSQL cutover plan are
governed by **`docs/ADR-001-database-strategy.md`**. Read that ADR
before adding migrations or touching this directory.

## What lives here

```
prisma/migrations/
├── README.md                     ← this file
├── migration_lock.toml           ← locks the Prisma provider
└── 0_init/
    └── migration.sql             ← baseline migration
```

- `0_init/migration.sql` was generated with:
  ```bash
  bunx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script > prisma/migrations/0_init/migration.sql
  ```
  It captures the **entire** current schema (every model, index,
  and relation present in `prisma/schema.prisma` at the time the
  baseline was taken) as the initial state. There is no
  pre-baseline migration history — anything before this point is
  treated as "the schema was born here".

- `migration_lock.toml` locks the Prisma provider. Today it says
  `sqlite` because the dev/preview environment is SQLite. When the
  project cuts over to PostgreSQL (see ADR-001), this file is
  replaced with `provider = "postgresql"` and a fresh baseline is
  taken if needed.

## Rules

1. **Production uses PostgreSQL.** This is non-negotiable
   (`HEAVIX-CORRECTED-REFERENCE-V1.1.md`,
   `HEAVIX-PROJECT-PRINCIPLES.md` §اصل ۸).
2. **`prisma/migrations/` is the source of truth** for schema
   changes. Committed to git, reviewed in PRs, never hand-edited
   except for genuine bug fixes (each fix gets a worklog entry).
3. **`db push` is dev/preview only.** It mutates the local SQLite
   file (`db/custom.db`) without leaving a migration trail. It
   must NEVER be run against a production-shaped connection string.
4. **`db push --accept-data-loss` is forbidden in production.**
   The production deploy path uses `prisma migrate deploy`, which
   is non-interactive and never accepts `--accept-data-loss`.
5. **Adding a schema change:**
   1. Edit `prisma/schema.prisma`.
   2. Run `bunx prisma migrate dev --name <short_name>` against
      the local SQLite DB. This generates a new timestamped
      migration folder under `prisma/migrations/`.
   3. Commit the new migration folder alongside the schema change.
   4. The CI guard (P1) will validate that the migration history
      matches `schema.prisma` exactly.
6. **Do not delete existing data.** Schema changes that would
   drop columns or tables must preserve data via a backfill/alias
   step in the migration. Hard-delete migrations are forbidden
   for business data
   (`HEAVIX-PROJECT-PRINCIPLES.md` §اصل ۵:
   "Hard delete ممنوع برای داده‌های business؛ ARCHIVE > DELETE").

## SQLite → PostgreSQL cutover (planned, P1)

The cutover plan is documented in
`docs/ADR-001-database-strategy.md` §3 (Required follow-up
actions). It is a one-shot, well-scoped operation:

1. Apply the migration history to a fresh PostgreSQL DB.
2. Backfill data from SQLite (per model, in FK-dependency order).
3. Validate row counts and referential integrity.
4. Switch `datasource db { provider = "sqlite" }` →
   `provider = "postgresql"`.
5. Replace `migration_lock.toml` accordingly.

Until the cutover is complete, the dev provider stays SQLite and
the migration history is portable to PostgreSQL (no SQLite-only
SQL constructs are emitted by `prisma migrate diff` against a
PostgreSQL-compatible schema).
