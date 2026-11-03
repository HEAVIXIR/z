# HEAVIX — P0 Implementation Plan
## ترتیب اجرایی پیشنهادی

این سند برای جلوگیری از ادامه توسعه روی پایه‌های ناامن یا دوگانه تهیه شده است.

## STEP 0 — Freeze

تا پایان P0:

- Feature جدید غیرضروری اضافه نشود.
- schema contract تغییرات فقط از طریق migration باشد.
- Seedها idempotent بمانند.
- هر تغییر با worklog ثبت شود.

## STEP 1 — Database Authority

### هدف
تعیین PostgreSQL به‌عنوان Production DB.

### کارها

1. ایجاد `prisma/migrations`.
2. baseline کردن schema موجود.
3. تهیه migration برای تغییرات بعدی.
4. تعریف Preview/Local DB strategy.
5. حذف `db push --accept-data-loss` از مسیر Production.
6. CI: `prisma validate` + migration check.

## STEP 2 — Authentication Hardening

### Admin

- User-based admin authentication
- Argon2id/bcrypt password hash
- random session token
- hashed session token in DB
- session revocation
- Secure + HttpOnly + SameSite cookie
- MFA

### User

- password hashing
- verification state
- session expiry
- logout all sessions
- login throttling

### Registration

Public request هرگز نمی‌تواند ADMIN بسازد.

## STEP 3 — RBAC

Models:

```text
Role
Permission
RolePermission
UserRole
```

Permission naming:

`resource.action`

Examples:

- taxonomy.read
- taxonomy.write
- brand.publish
- listing.moderate
- user.suspend
- security.manage
- ai.execute

## STEP 4 — Audit

`AuditLog` append-only.

ثبت:

- actor
- action
- resource
- before
- after
- IP
- user agent
- request ID
- timestamp
- reason

برای AI نیز:

- prompt hash
- model
- tool calls
- decision
- approval

## STEP 5 — Rate Limit / Abuse

Endpoints:

- login
- register
- verify
- resend
- upload
- AI
- messaging
- offer
- bid

هر endpoint policy مستقل داشته باشد.

## STEP 6 — Upload Pipeline

```text
Upload
 ↓
Size
 ↓
Magic bytes
 ↓
Decode
 ↓
Malware scan
 ↓
EXIF sanitize
 ↓
Resize/WebP/AVIF
 ↓
Private/Object storage
 ↓
Signed/public URL
```

## STEP 7 — AI Gateway

AI Gateway فقط از taskهای allow-list استفاده کند.

برای هر task:

- auth requirement
- quota
- max input
- max output
- model policy
- timeout
- cost ceiling
- audit

## STEP 8 — Product/Machine

ساخت Product و Machine قبل از توسعه Compatibility و Catalog گسترده.

## STEP 9 — Compatibility

مدل generic:

`CompatibilityEdge`

با:

- sourceEntityType
- sourceEntityId
- targetEntityType
- targetEntityId
- relationType
- confidence
- source
- verified

## STEP 10 — Canonical Location

Migration از string به IDs.

Legacy fields موقتاً نگه داشته شوند تا migration کامل شود.

## STEP 11 — Transaction Normalization

Listingها به TransactionType متصل شوند.

## STEP 12 — Tests

قبل از اعلام Production Ready:

- unit
- integration
- e2e
- security
- regression

اجباری.

## Exit Criteria P0

P0 تمام نشده مگر اینکه:

- password plaintext = صفر
- public ADMIN creation = صفر
- admin session cryptographically secure = بله
- audit coverage عملیات حساس = 100%
- RBAC فعال = بله
- migration baseline = بله
- production DB contract = مشخص
- upload hardening = بله
- AI quota/policy = بله
- CI build/lint/test = سبز
