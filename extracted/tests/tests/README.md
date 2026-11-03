# HEAVIX — Test Suite (P1-20)

Per **HEAVIX-AUDIT-2026-09-20.md §11** and **HEAVIX-P0-IMPLEMENTATION-PLAN.md STEP 12**.

## Runner

- **Framework**: [Vitest](https://vitest.dev/) `^5.0.1` (dev dependency).
- **Config**: [`../vitest.config.ts`](../vitest.config.ts) — Node environment, globals enabled, `tests/**/*.test.ts` include, `@` alias → `src`.
- **Scripts** (in `package.json`):
  - `bun run test` — single run.
  - `bun run test:watch` — watch mode for local iteration.

```bash
bun run test            # run all tests once
bun run test:watch      # watch mode
bun run test -- tests/unit/password.test.ts   # one file
```

## Layout

```
tests/
├── README.md                       ← this file
├── unit/                           ← pure-function / mocked-DB tests
│   ├── password.test.ts            ← src/lib/password.ts
│   ├── rate-limit.test.ts          ← src/lib/rate-limit.ts (fake timers)
│   ├── brand-alias.test.ts         ← src/lib/brand-alias.ts
│   ├── upload-security.test.ts     ← src/lib/upload-security.ts (magic bytes)
│   └── rbac.test.ts                ← src/lib/rbac.ts (db mocked via vi.mock)
└── integration/
    └── auth.test.ts                ← validateLogin + password cycle;
                                        register→verify→login flow is
                                        spec'd via describe.skip blocks
```

## Strategy

### Unit tests (run with `bun run test`)

Pure-function tests that need no DB:

- **`password.test.ts`** — bcrypt hash format, verify true/false, salt randomness.
- **`rate-limit.test.ts`** — fixed-window enforcement, remaining count, window reset via `vi.useFakeTimers`, `retryAfterSeconds` RFC 6585 §4.
- **`brand-alias.test.ts`** — ZWNJ/ZWJ strip, Arabic→Persian YEH/KAF, lowercase, whitespace collapse, idempotence.
- **`upload-security.test.ts`** — magic-byte sniffing for JPEG/PNG/GIF/WebP/BMP, null for non-image / SVG / short buffers, size cap, filename sanitization.
- **`rbac.test.ts`** — `ForbiddenError` shape, `getUserPermissions` aggregation + dedup + fail-safe, `hasPermission`, `requirePermission` (throws), `isAdmin` (UserRole + legacy `User.role` fallback), `hasRole` (exact-match, no legacy fallback). The `db` Prisma client is mocked via `vi.mock("@/lib/db")` so these tests are hermetic.

### Integration tests (need a test DB)

- **`auth.test.ts`** — runs what it can without a DB:
  - `validateLogin` against `ADMIN_CREDENTIALS` (true / false / empty / case-sensitivity).
  - password hash/verify cycle end-to-end.
  - The full `register → verify-email → login → logout` flow and admin-session lifecycle (P0-3) are **spec'd via `describe.skip` blocks** with the exact steps a future e2e harness must execute. They are skipped because they need a running Prisma + isolated SQLite test DB + stubbed `next/headers` `cookies()`.

#### Test DB setup plan (future)

To un-skip the integration tests:

1. Add a `db-test` SQLite file (e.g. `db/test.db`) or a dedicated Postgres schema.
2. Set `DATABASE_URL=file:./db/test.db` in a `.env.test` file.
3. Run `bunx prisma db push --skip-generate --accept-data-loss` against the test DB.
4. Seed it with `bunx tsx prisma/seed-rbac.ts` (5 roles, 20 permissions).
5. Use `vi.mock("next/headers", ...)` to stub `cookies()` so `createSession` / `destroySession` can be observed in tests.
6. Move the `describe.skip` blocks to `describe` and implement the steps.

### E2E tests (planned — not yet written)

Per STEP 12 the project must also have e2e + regression coverage. The plan:

- **Framework**: Playwright (already compatible with Next.js 16 App Router).
- **Scope**:
  - Public: home `/`, `/listings`, `/listings/[slug]`, `/knowledge`, `/knowledge/[slug]`, `/brands`, `/brands/[slug]`.
  - Auth: `/login`, `/register`, `/dashboard`, logout flow.
  - Admin: `/admin/dashboard`, `/admin/listings`, `/admin/users`, `/admin/audit-log`, `/admin/jobs`.
  - API: every `POST /api/auth/*`, `POST /api/ai-gateway` (policy deny/allow), `POST /api/admin/upload` (magic-byte rejection).
- **DB**: a seeded Playwright fixture DB, reset between runs.

### Security tests (planned — not yet written)

Per **HEAVIX-SECURITY-BASELINE-V1.md §11**:

- **Privilege escalation**: a BUYER calling `POST /api/admin/*` returns 401/403. A SELLER calling `POST /api/admin/users` returns 403.
- **IDOR**: a SELLER editing another seller's Listing is rejected.
- **Rate limit**: `POST /api/auth/login` returns 429 after 10 attempts within the window.
- **CSRF**: every state-changing API requires a cookie (not just an Authorization header). Cross-origin requests are blocked by `SameSite=Lax`.
- **Upload**: SVG upload returns 422 (magic-byte reject). Oversized upload returns 413.
- **AI Gateway**: an unknown `taskType` is 403'd (deny-by-default). Quota-exceeded returns 429. Input-size exceeded returns 400.
- **AuditLog**: append-only — no `update` / `delete` API surface exists; verify with a DB probe that no `AuditLog.update` or `AuditLog.delete` calls are reachable from the API layer.

## What is intentionally NOT covered yet

- **Background-job queue (`src/lib/queue.ts`)** — pure in-process logic, easy to test, but deferred to a follow-up so this PR stays focused on P0/P1 security primitives.
- **AI policy engine (`src/lib/ai-policy.ts`)** — needs DB mock like rbac; deferred.
- **Audit log helper (`src/lib/audit.ts`)** — needs DB mock; deferred.
- **E2E + Security suites** — see "planned" sections above.

## CI integration (future)

When CI lands:

```yaml
- run: bun install --frozen-lockfile
- run: bun run lint
- run: bun run test
- run: bun run build
```

The P0 exit criterion **"CI build/lint/test = سبز"** (HEAVIX-P0-IMPLEMENTATION-PLAN Exit Criteria) is partially met: `bun run lint` and `bun run test` are both green; `bun run build` is not yet wired into CI.
