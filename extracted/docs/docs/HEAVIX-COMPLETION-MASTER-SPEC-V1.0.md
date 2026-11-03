# HEAVIX — سند جامع اصلاح، توسعه و تکمیل پروژه
## HEAVIX COMPLETION / HARDENING / DEVELOPMENT MASTER SPECIFICATION — V1.0

**مبنای بررسی:** آرشیو پروژه ارسالی در 2026-09-22
**هدف:** تبدیل وضعیت فعلی کد به یک پلتفرم Marketplace صنعتی/معدنی Production-Ready

---

## 0. مقدمه و اصل حاکم

این سند بر مبنای خود آرشیو پروژه ارسالی، کد فعلی، Prisma schema، migration، package configuration، تست‌ها و اسناد موجود در `docs/` تنظیم شده است.

این سند جایگزین سند مادر پروژه نیست؛ بلکه سند اجرایی تکمیل و رفع Gap است و باید پس از تأیید به مرجع اجرای توسعه تبدیل شود.

**اصل مهم:**
> «هیچ قابلیت جدیدی صرفاً به‌خاطر وجود آن در سند یا Schema، تکمیل‌شده محسوب نمی‌شود. تکمیل فقط زمانی پذیرفته است که Code + DB + API + UI + Security + Test + Documentation + Monitoring همگی هم‌راستا و قابل اثبات باشند.»

بنابراین وضعیت هر قابلیت باید یکی از این موارد باشد:
- `IMPLEMENTED_AND_VERIFIED`
- `IMPLEMENTED_NEEDS_HARDENING`
- `SCHEMA_ONLY`
- `API_ONLY`
- `UI_ONLY`
- `PARTIAL`
- `PLANNED`
- `BLOCKED`

---

## 1. وضعیت واقعی نسخه بررسی‌شده

در آرشیو فعلی، نسبت به Audit مورخ 2026-09-20 پیشرفت قابل توجهی انجام شده است.

### 1.1 مواردی که اکنون در Schema وجود دارند

Schema فعلی شامل حدود 95 مدل است و حوزه‌های زیر را پوشش می‌دهد:
- Brand / BrandAlias / BrandFamily
- Category / Taxonomy
- Dynamic Attributes
- Country / Province / City
- ProductModel / Generation
- Product
- Machine
- Part
- Attachment
- CompatibilityEdge
- Listing
- BuyRequest
- RFQ / RFQQuote
- Auction / AuctionBid
- ListingOffer
- Company / CompanyBranch / CompanyVerification / CompanyDocument
- DealRoom / DealMessage
- PriceRecord
- SearchIndex
- AI Gateway / AI Budget / AI Task Policy
- AIAgent
- Opportunity / DemandSignal
- Payment
- Procurement / ProcurementQuote
- SEO Metadata
- User / Session / AdminSession
- Role / Permission / RolePermission / UserRole
- AuditLog
- Notifications / Favorites / SavedSearch / Follow
- MachinePassport
- Subscription / FoundingSeller
- Knowledge / Article

### 1.2 مواردی که باید همچنان Verification شوند

وجود Model در Prisma به‌تنهایی کافی نیست. برای هر Domain باید این زنجیره تکمیل شود:
```
Schema → Migration → Seed → Repository/Service → API → Admin UI → Public UI → Validation → Authorization → Audit → Tests → Monitoring
```

---

## 2. تصمیمات غیرقابل مذاکره

### 2.1 Database
- **Production:** PostgreSQL
- **Local:** می‌تواند PostgreSQL محلی باشد.
- **Test:** PostgreSQL تست یا SQLite فقط در صورتی که تفاوت رفتاری آن برای Domainهای مورد آزمایش قابل قبول و مستند باشد.
- **ممنوع:** استفاده از `prisma db push --accept-data-loss` در Production.
- **الزام:** تمام تغییرات Schema فقط از طریق Migration.

---

## 3. Migration و Database Governance

### اقدامات
- baseline migration تأیید شود.
- migration history با schema تطبیق داده شود.
- migration drift check اضافه شود.
- Production فقط `prisma migrate deploy`.
- CI باید migration validation داشته باشد.
- seedها idempotent باشند.
- destructive migration نیازمند approval باشد.
- backup قبل از migration حساس انجام شود.

### Acceptance
```
prisma validate = PASS
migration status = CLEAN
schema drift = 0
seed repeatability = PASS
```

---

## 4. اصلاح package و Runtime

### تصمیم پیشنهادی برای Production:
- Node.js
- Next.js
- PostgreSQL
- Object Storage
- Redis/Queue

Bun می‌تواند ابزار توسعه اختیاری باشد، اما نباید تنها مسیر اجرای Production باشد.

### Scripts نهایی باید شامل:
- dev, build, start, lint, typecheck
- test, test:e2e, test:security
- db:validate, db:migrate, db:migrate:deploy, db:seed
- catalog:health, security:check

---

## 5. Authentication — وضعیت هدف نهایی

### 5.1 Admin
- DB-backed admin identity
- password hash
- cryptographically random session
- hashed session token
- expiration, revocation, session rotation
- Secure, HttpOnly, SameSite
- MFA, login throttling, audit

### 5.2 User
- password hash
- email verification, mobile verification
- session expiry, logout, logout all sessions
- account lock, password reset, password change
- session revocation, suspicious login detection

### 5.3 حذف کامل Legacy Authentication
منبع نهایی authorization: `User → UserRole → Role → RolePermission → Permission`

---

## 6. RBAC — اصلاح بحرانی

RBAC باید روی تمام مسیرهای حساس enforce شود.

### Permissionهای پایه
- system.read/manage, security.read/manage
- user.read/create/update/suspend/delete
- company.read/verify/manage
- taxonomy.read/create/update/delete/publish
- brand.read/create/update/verify/publish
- model.read/create/update/publish
- product.read/create/update/publish
- listing.read/create/update/publish/moderate/delete
- price.read/estimate/review/override
- compare.read
- request.read/match, rfq.create/manage, offer.create/manage
- auction.manage, dealroom.manage, inspection.manage, transport.manage
- ai.read/execute/manage, ai.policy.manage, ai.budget.manage, ai.agent.manage
- media.read/upload/moderate/delete
- payment.read/manage, refund.manage
- audit.read/export
- jobs.read/run/retry
- seo.manage, knowledge.manage

---

## 7. Admin API Security

یک Guard مرکزی: `requireAdmin()`, `requirePermission()`, `requireAnyPermission()`, `requireOwnership()`

---

## 8. Audit Log

هر عملیات حساس باید ثبت کند: actor, actorType, action, entityType, entityId, before, after, IP, User-Agent, requestId, reason, timestamp.

Audit باید Append-only باشد.

---

## 9-10. Registration, Password, Verification
- ثبت‌نام عمومی فقط BUYER/SELLER
- Account Lifecycle: PENDING → EMAIL_VERIFIED → ACTIVE → SUSPENDED → BLOCKED → DELETED/ANONYMIZED
- bcrypt/Argon2id, password strength, breach-resistant
- Verification code hash شده

---

## 11-19. Catalog, Machine, Parts, Compatibility, Attributes, Location, Transaction, Listing Lifecycle
- Product ≠ Listing
- Machine = نمونه فیزیکی
- CompatibilityEdge با rules مشخص
- Attribute inheritance
- Canonical Location (Country → Province → City)
- TransactionType canonical
- Listing state machine رسمی

---

## 20-29. Seller/Company, Search, Price Intelligence, Compare, Request/RFQ, Offers, Deal Room, Payment
- Company verification levels
- Search با Persian normalization
- Price Estimate با confidence
- Compare در حالت‌های مختلف
- Deal Room با object-level access
- Payment idempotency و webhook verification

---

## 30. Upload / Media Security
Pipeline: Auth → Quota → Size → Magic Bytes → Decode → Malware Scan → EXIF Strip → Re-encode → Resize → WebP/AVIF → Object Storage → Metadata → Audit

---

## 31-36. AI Architecture
- حذف مسیرهای مستقیم AI خارج از Gateway
- AI Gateway GET = Admin-only
- AI Output Validation با Zod
- Prompt Injection protection
- Agent Security با scoped permissions
- Budget: per-user/role/agent/task/daily/monthly + hard stop + fallback

---

## 37-45. Jobs, Scraper, Data Governance, SEO, Knowledge Graph, Notification, Analytics, Observability, Backup
- Production Queue واقعی (Redis)
- Scraper داده = candidate، نه truth
- Duplicate detection
- Entity SEO
- Notification Center (In-App/Email/SMS/Push/Telegram)
- Event taxonomy
- Structured Logs + Error Tracking + Metrics + Tracing
- Daily backup + Point-in-time recovery + Restore test

---

## 46-48. Testing, CI/CD, Environment
- Unit + Integration + E2E + Security
- CI Pipeline: Install → Typecheck → Lint → Unit → Integration → Security → Build → Migration Check → Artifact → Deploy → Smoke Test
- Secrets مدیریت امن

---

## 49-51. CORS/CSRF/Headers, API Standards, Pagination
- CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Response format استاندارد
- Cursor pagination

---

## 52-58. Admin Command Center, Data Safety, Feature Flags, Launch Control, Performance, Mobile/PWA, i18n
- Admin = Control Plane واقعی
- Soft Delete اولویت
- Feature Flags با rollout
- Maintenance mode, read-only mode, emergency disable
- Performance Budget
- PWA
- fa/en/ar

---

## 59-63. Store/MEKANIX Separation, Data Contract, Price+Compare, Market Intelligence, Monetization
- HEAVIX = Catalog/Marketplace/Demand
- MEKANIX = Service/Maintenance/Repair
- Shared entities فقط از طریق Contract
- Market Heatmap, Price Trends, Demand Signals, Opportunity Radar
- Revenue: Subscription, Featured, Lead Fee, RFQ Fee, Inspection, Transaction Fee, Advertising, Enterprise, API

---

## 64-67. Definition of Done

### Foundation
- [ ] PostgreSQL production contract
- [ ] migration clean
- [ ] seed idempotent
- [ ] Auth secure
- [ ] RBAC enforced
- [ ] Audit complete
- [ ] rate limit
- [ ] upload secure
- [ ] AI gateway unified
- [ ] Product/Machine canonical
- [ ] location canonical
- [ ] transaction canonical
- [ ] tests green
- [ ] build green

### Marketplace
- [ ] Seller, Company, Listing lifecycle
- [ ] Search, Favorites, Saved Search
- [ ] Requests, Matching, Offers, RFQ
- [ ] Compare, Pricing, Messaging, Notifications
- [ ] Verification, Moderation, SEO

### Intelligence
- [ ] AI Gateway, AI Listing Builder, AI Search
- [ ] AI Compare, Price Intelligence, Recommendations
- [ ] Demand Engine, Knowledge Graph, Market Intelligence
- [ ] Opportunity Radar, AI Agents, AI Audit, AI Budget

### Production
- Build = PASS, Lint = PASS, Typecheck = PASS
- Unit = PASS, Integration = PASS, E2E = PASS, Security = PASS
- Migration = CLEAN, Backup Restore = PASS
- Monitoring = ACTIVE, Error Tracking = ACTIVE
- Rate Limit = ACTIVE, RBAC = ENFORCED, Audit = ACTIVE
- Secrets = SECURE, Payment = VERIFIED, Upload = HARDENED
- AI = POLICY CONTROLLED

---

## 68. ترتیب اجرایی قطعی

### Phase 0 — Freeze
هیچ Feature غیرضروری اضافه نشود.

### Phase 1 — Stabilize
DB, Migration, Runtime, Build, Typecheck

### Phase 2 — Secure
Auth, RBAC, Audit, Rate Limit, Upload, CSRF, Headers

### Phase 3 — Canonical Catalog
Taxonomy, Brand, Model, Generation, Product, Machine, Part, Attachment, Compatibility, Attributes, Location

### Phase 4 — Marketplace
Seller, Company, Listing, Request, Offer, RFQ, Deal, Messaging, Notification

### Phase 5 — Intelligence
Search, Price, Compare, Matching, Recommendation, Demand, Knowledge Graph

### Phase 6 — Automation
Jobs, AI Agents, Moderation, Catalog Automation, SEO Automation, Social Automation

### Phase 7 — Monetization
Subscription, Featured, Lead, RFQ, Inspection, Transaction, Enterprise

### Phase 8 — Scale
PostgreSQL HA, Redis, Search Cluster, Object Storage, CDN, Workers, Observability, DR

---

## 69. مواردی که باید فوراً Verify شوند

1. اعمال RBAC روی تمام 101 مسیر Admin
2. Admin-only بودن GET مربوط به AI Gateway
3. حذف مسیرهای مستقیم AI خارج از Gateway
4. اعتبارسنجی ساختاری خروجی LLM
5. تکمیل EXIF stripping و re-encoding
6. Malware scanning
7. canonical Location migration
8. حذف وابستگی عملی به legacy `User.role`
9. Object-level authorization برای Listing/Offer/Deal/Document
10. Payment idempotency و webhook verification
11. Production Queue
12. E2E و Security suites
13. Restore test
14. PostgreSQL production migration
15. Build روی محیط Production واقعی
16. حذف/تفکیک مسیرهای Store/MEKANIX از Marketplace Core
17. تطبیق تمام APIها با استاندارد response/error
18. Audit coverage واقعی
19. Catalog health و data snapshot
20. Data quality و duplicate control

---

## 70-73. خروجی نهایی، قانون نهایی، معیار موفقیت، دستور اجرایی

> **هیچ Feature جدیدی فقط به خاطر جذاب بودن ساخته نشود.**

هر Feature باید این مسیر را طی کند:
```
Requirement → Domain Model → Data Contract → Security → API → Service → UI → Admin → Audit → Tests → Monitoring → Documentation → DONE
```

### دستور اجرایی:
```
P0 → Database + Runtime → Security → RBAC → Audit → Canonical Catalog → Marketplace → Search → Pricing → Compare → AI Gateway → Agents → Automation → Monetization → Scale
```
