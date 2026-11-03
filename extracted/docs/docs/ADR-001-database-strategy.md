# ADR-001 — Database Strategy

- **Status:** Accepted — PostgreSQL cutover EXECUTED 2026-09-22
- **Date:** 2026-09-20 (P0 baseline)
- **Decision owners:** HEAVIX core team
- **Supersedes:** none
- **Superseded by:** —

## 0. Cutover log (2026-09-22)

Section 2.4 / §4 action "Switch `provider = \"sqlite\"` → `provider =
\"postgresql\"` at cutover time" has been executed for both databases:

- `prisma/schema.prisma` and `prisma/store-schema.prisma` now declare
  `provider = "postgresql"`, reading `DATABASE_URL` and
  `STORE_DATABASE_URL` respectively (two separate Postgres databases —
  see `.env` and `docker-compose.yml` for a local dev setup).
- The old SQLite migration history was archived to
  `prisma/migrations-sqlite-archive/` (reference only). A fresh
  PostgreSQL migration history starts from an empty
  `prisma/migrations/` the first time `prisma migrate dev` is run
  against a live Postgres connection.
- `prisma/legacy-sqlite/` holds temporary copies of both schemas still
  pointed at the original SQLite files (`db/custom.db`, `db/store.db`)
  so `scripts/migrate-sqlite-to-postgres.ts` can read the existing data
  out in FK-safe order and insert it into Postgres — implementing
  §3 "Required follow-up actions (P1)" step 1. Delete
  `prisma/legacy-sqlite/` and the two
  `src/lib/generated/legacy-sqlite-*-client` folders once the data
  migration has been run and verified.
- **Not yet done** (still open, see §3 P1 list below): the CI guards
  (`prisma validate` + migration-drift check, and a guard forbidding
  `db:push` in production deploy scripts) have not been added in this
  pass — this ADR update only covers the schema/provider cutover and
  the data-migration script, not CI.
- This sandbox has no network access to an actual Postgres server, so
  the migration script above has been written and reviewed but not
  executed end-to-end here. Whoever runs it next should follow the
  steps in the script's header comment and paste the row-count report
  into this log once verified.
- **Related documents:**
  - `docs/HEAVIX-CORRECTED-REFERENCE-V1.1.md` (authoritative architecture reference)
  - `docs/HEAVIX-SECURITY-BASELINE-V1.md` §11 (backup)
  - `docs/HEAVIX-PROJECT-PRINCIPLES.md` §اصل ۸ (Database Authority)
  - `docs/HEAVIX-P0-IMPLEMENTATION-PLAN.md` STEP 1 (Database Authority)

---

## 1. Context

HEAVIX is developed and previewed in a constrained sandbox that only
ships a local file-based database (SQLite via Prisma). At the same
time, `HEAVIX-CORRECTED-REFERENCE-V1.1.md` mandates **PostgreSQL**
as the production database.

This creates a dual-database reality:

| Environment | Database   | Purpose                          |
| ----------- | ---------- | -------------------------------- |
| Local dev   | SQLite     | Fast iteration, no infra setup   |
| Preview     | SQLite     | Sandboxed demos for stakeholders |
| Production  | PostgreSQL | Scale, concurrency, types, JSONB |

The risks of leaving this ambiguity unaddressed:

1. **Schema drift.** Developers using `prisma db push` (the
   `db:push` npm script) mutate the dev DB without leaving a
   migration trail. Production would then have no reproducible
   path from "empty DB" → "current schema".
2. **SQLite-only types.** SQLite has no native JSON, ENUM, ARRAY,
   or full-text-search types that PostgreSQL provides. If schema
   design leans on SQLite's looseness, the production migration
   will require destructive refactors late in the project.
3. **`db push --accept-data-loss` in production.** Prisma emits
   this flag whenever a change would drop data. If a developer
   muscle-memory-runs `db:push` against a production-shaped DB,
   data is lost silently. This is explicitly forbidden by
   `HEAVIX-PROJECT-PRINCIPLES.md` §اصل ۸.
4. **No migration baseline.** Without an initial migration
   capturing the current schema, any future `prisma migrate`
   workflow has no starting point.

---

## 2. Decision

### 2.1 PostgreSQL is the production source of truth.

The Prisma schema (`prisma/schema.prisma`) is written to be
PostgreSQL-compatible first. SQLite is a tolerated dev/preview
compatibility target, not the design target.

Implications:

- Avoid SQLite-only features in schema design (e.g. do not rely on
  SQLite's loose type affinity).
- Prefer `String`-encoded enums (current convention) over
  Prisma `enum` until the production migration lands, at which
  point enums can be introduced as a follow-up migration.
- Do not use Prisma features that emit divergent SQL between
  SQLite and PostgreSQL (e.g. `@db.JsonB` must wait for the
  PostgreSQL cutover).

### 2.2 SQLite is permitted ONLY for dev/preview.

The `db:push` npm script (`prisma db push --accept-data-loss`) is
allowed against the local `db/custom.db` SQLite file ONLY. It must
NEVER be run against any production-shaped connection string.

CI must reject any PR that wires `db:push` into a production
deployment script. (Tracked as a CI guard in P1.)

### 2.3 Migrations are the canonical schema history.

The `prisma/migrations/` directory is the source of truth for
schema changes. The baseline migration
(`prisma/migrations/0_init/migration.sql`) captures the full
current schema as the initial state, produced via:

```bash
bunx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
```

All future schema changes MUST be applied through
`prisma migrate dev` (against SQLite dev) and reviewed before
promotion to PostgreSQL. The migration files are committed to the
repository and never hand-edited except for genuine bug fixes with
a paired worklog entry.

### 2.4 `db push --accept-data-loss` is forbidden in production.

This is restated here from `HEAVIX-PROJECT-PRINCIPLES.md` §اصل ۸
because it is the single most destructive mistake a developer can
make. The production deployment path uses `prisma migrate deploy`
ONLY. `prisma migrate deploy` never accepts `--accept-data-loss`
and never prompts interactively — it applies pending migration
files in order, or fails safely.

---

## 3. Consequences

### Positive

- **Reproducible production deploys.** Every production schema is
  reconstructible from `prisma/migrations/`.
- **Schema review forced into PR flow.** Because migrations are
  committed, schema changes become reviewable artifacts.
- **Clear cutover plan.** The SQLite → PostgreSQL cutover is a
  well-scoped, single-shot operation (apply migration history to a
  fresh PostgreSQL DB, backfill data, switch `DATABASE_URL`).

### Negative / Accepted risks

- **Deviation tax.** Some Prisma features (enums, JSON columns,
  native arrays, full-text search) cannot be used until the
  PostgreSQL cutover. Mitigation: encode as `String`/JSON-string
  for now and migrate in a dedicated post-cutover migration.
- **Drift risk between dev and prod.** Dev uses SQLite; prod uses
  PostgreSQL. Edge-case SQL differences (e.g. case-sensitivity of
  `LIKE`, `DATETIME` precision) may surface only in prod.
  Mitigation: P1 introduces a CI job that runs `prisma validate`
  plus a migration-dry-run against a throwaway PostgreSQL
  container so dev-side schema changes are validated against the
  production dialect before merge.
- **Manual data migration.** SQLite → PostgreSQL data migration is
  not automatic. It must be planned and tested before launch.

### Required follow-up actions (P1)

1. **Author SQLite → PostgreSQL migration plan.**
   - Export SQLite data (per model, ordered by FK dependencies).
   - Transform types (e.g. loose booleans → strict `BOOLEAN`).
   - Import into PostgreSQL via `prisma db seed` or a one-shot
     `tsx` script.
   - Validate row counts and referential integrity.
2. **CI guard: `prisma validate` + `prisma migrate diff --exit-code`
   against the committed migrations.** Fails the build if the
   schema and migration history diverge.
3. **CI guard: forbid `db:push` in production deployment scripts.**
4. **Switch `datasource db { provider = "sqlite" }` →
   `provider = "postgresql"` at cutover time.** Until then, keep
   SQLite as the dev provider.

---

## 4. Compliance

This ADR is the authoritative database-strategy reference. Any
deviation must be documented in a superseding ADR and approved by
the HEAVIX core team. The P0 exit criteria
(`docs/HEAVIX-P0-IMPLEMENTATION-PLAN.md` §"Exit Criteria P0")
require:

- ✅ migration baseline = yes (`prisma/migrations/0_init/`)
- ✅ production DB contract = specified (this ADR)

These two criteria are now satisfied by this ADR and the
accompanying baseline migration.
