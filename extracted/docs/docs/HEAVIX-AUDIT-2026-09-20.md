# HEAVIX — Audit & Gap Assessment
## نسخه بررسی: 2026-09-20

### مبنای بررسی
این گزارش بر اساس آرشیو پروژه ارسالی، کد موجود، Prisma schema، دیتابیس SQLite موجود، Seedها و اسناد داخل `docs/` و `agent-ctx/` تهیه شده است.

> وضعیت اجرای build/lint: در آرشیو `node_modules` وجود ندارد؛ بنابراین اجرای واقعی `next build` و `eslint` در این بررسی انجام نشده است. نتایج زیر از بررسی استاتیک کد، schema و دیتابیس به‌دست آمده‌اند.

---

## 1. جمع‌بندی مدیریتی

HEAVIX از نظر **Taxonomy، Brand Registry، Dynamic Attributes، صفحات Admin و APIهای پایه** نسبت به یک MVP معمولی جلوتر است؛ اما هنوز بین «سند معماری» و «مدل اجرایی» چند شکاف مهم وجود دارد.

### مهم‌ترین مواردی که قبل از توسعه Phase 2 باید اصلاح شوند

1. **Database Contract دوگانه است:** اسناد PostgreSQL می‌گویند، schema و `.env` SQLite هستند.
2. **Migration discipline وجود ندارد:** پوشه `prisma/migrations` در پروژه نیست.
3. **امنیت احراز هویت فعلی برای Production کافی نیست:** admin cookie قابل جعل ساختاری است، رمز کاربر plaintext ذخیره می‌شود و ثبت‌نام از client می‌تواند `ADMIN` تعیین کند.
4. **RBAC واقعی وجود ندارد:** فقط `role` رشته‌ای در User وجود دارد؛ Permission/Role/Policy مستقل وجود ندارد.
5. **Audit Log واقعی در schema وجود ندارد** در حالی که سند امنیت آن را الزامی می‌داند.
6. **Product و Machine entity هنوز پیاده نشده‌اند**؛ `ProductModel` با Product اشتباه گرفته شده است.
7. **Compatibility Graph وجود ندارد.**
8. **Location در Listing هنوز string است** و با Country/Province/City مستقل یکپارچه نشده است.
9. **TransactionType وجود دارد ولی Listing هنوز `listingType` string دارد** و این دو لایه کاملاً یکپارچه نشده‌اند.
10. **AI Gateway عمومی است و برای برخی عملیات محدودیت/احراز هویت/Quota روشن ندارد**؛ ریسک abuse و هزینه دارد.
11. **Upload عمومی فقط MIME اعلام‌شده توسط client را بررسی می‌کند** و antivirus/content sniffing/storage isolation ندارد.
12. **برخی شمارش‌های اسناد با دیتابیس فعلی متفاوت‌اند** و باید یک Snapshot رسمی از وضعیت داده ساخته شود.

---

# 2. تناقض‌های مستندات و واقعیت اجرایی

## 2.1 PostgreSQL در سند، SQLite در اجرا

در سند مادر، معماری فنی `PostgreSQL` معرفی شده است؛ اما:

- `prisma/schema.prisma` دارای `provider = "sqlite"` است.
- `.env` دارای `DATABASE_URL=file:/home/z/my-project/db/custom.db` است.
- دیتابیس واقعی آرشیو `SQLite 3.x` است.
- migration directory وجود ندارد.

### تصمیم اصلاحی
برای ادامه پروژه یکی از این دو باید به‌صورت رسمی انتخاب شود. برای هدف نهایی HEAVIX پیشنهاد معماری این سند:

**PostgreSQL = Production Source of Truth**

و SQLite فقط در صورت نیاز برای Preview/Local/Fixture.

این تصمیم باید در یک ADR ثبت شود و پس از آن تمام ابزارهای build/deploy/seed/test مطابق آن شوند.

---

## 2.2 شمارش Taxonomy

دیتابیس فعلی:

- 14 Root فعال
- ماشین‌آلات: 16 L1 فعال
- ماشین‌آلات: 174 L2 فعال
- ماشین‌آلات: 97 L3 فعال
- 28 L2 و 2 L3 قدیمی غیرفعال
- مجموع Categoryها: 539
- Category فعال: 460

در سند Project Reference عدد 174 خانواده و 97 تیپ ذکر شده، اما seed ماشین‌آلات در توضیح اولیه خود حدود 172 L2 را ذکر می‌کند. بنابراین **عدد authoritative باید از DB snapshot تولید شود، نه متن دستی.**

### اصلاح
یک command رسمی لازم است:

`catalog:health`

که شمارش canonical را از DB استخراج و در CI گزارش کند.

---

## 2.3 شمارش مدل‌ها و Product

در DB فعلی:

- ProductModel = 0
- Generation = 0
- Company = 0
- Auction = 0
- MachinePassport = 0
- DealRoom = 0
- Listing = 30
- RFQ = 1

بنابراین بخشی از schema وجود دارد ولی هنوز data/product lifecycle آن عملیاتی نشده است.

---

# 3. معماری داده — نواقص اصلی

## 3.1 Product Entity

سند معماری می‌گوید:

`Catalog Product != Marketplace Listing`

اما schema مدل `Product` ندارد و `ProductModel` به‌عنوان entity کاتالوگی استفاده شده است.

### باید اضافه شود

`Product`

با حداقل:

- id
- categoryId
- brandId
- modelId
- generationId
- canonicalName
- slug
- status
- description
- canonical attributes/specifications
- media
- SEO
- verification

سپس:

`Product 1:N Listing`

قرار گیرد.

---

## 3.2 Machine Entity

برای ماشین دست‌دوم، ماشین باید entity مستقل از Listing باشد؛ Listing یک وضعیت/پیشنهاد بازار روی ماشین است.

مدل پیشنهادی:

`Machine`

شامل:

- productId
- serialNumber
- manufactureYear
- hours
- condition
- ownership/history
- location
- passport
- inspection
- media

سپس:

`Machine 1:N Listing`

یا در MVP حداقل `Listing.machineId`.

---

## 3.3 Parts / Attachments

Category برای Parts و Attachments وجود دارد، اما Catalog Entity اختصاصی و Compatibility Graph هنوز وجود ندارد.

### نیاز قطعی

```text
Product
Machine
Part
Attachment
Service
     ↕
CompatibilityEdge
```

مثلاً:

`Komatsu PC210 -> compatible -> Part XYZ`

و:

`Excavator PC210 -> accepts -> Hydraulic Hammer ABC`

---

## 3.4 Location

Country/Province/City وجود دارند، اما `Listing.province` و `Listing.city` هنوز string هستند.

این باعث duplicate و دشواری analytics می‌شود.

### اصلاح
اضافه شود:

- countryId
- provinceId
- cityId
- location precision / address privacy

و در Search/SEO از canonical location استفاده شود.

---

## 3.5 Transaction

`TransactionType` وجود دارد ولی Listing هنوز `listingType String` دارد.

### اصلاح
به‌جای string آزاد:

`transactionTypeId`

یا در مرحله گذار:

- TransactionType به canonical source تبدیل شود.
- listingType legacy با migration حذف شود.

---

# 4. امنیت — Critical

## 4.1 Admin Authentication

فایل auth فعلی admin token را از username + timestamp به base64 تبدیل می‌کند و سمت server صرفاً username را decode و مقایسه می‌کند.

این **session credential امن و cryptographically signed نیست**.

### اصلاح
- Admin User واقعی در DB
- password hash با Argon2id یا bcrypt مناسب
- session token تصادفی cryptographically secure
- hash token در DB
- rotation/revocation
- expiry
- SameSite/HttpOnly/Secure
- MFA برای admin
- step-up authentication برای عملیات حساس

---

## 4.2 Password Storage

ثبت‌نام فعلی مقدار password را مستقیماً در `passwordHash` قرار می‌دهد.

این Critical است.

### اصلاح فوری
هیچ plaintext password نباید در DB ذخیره شود.

---

## 4.3 Registration Privilege Escalation

`/api/auth/register` مقدار `body.role` را می‌پذیرد و اگر `ADMIN` باشد همان را ذخیره می‌کند.

این نباید در Production ممکن باشد.

### قانون
ثبت‌نام عمومی همیشه:

`BUYER` یا workflow مشخص `SELLER`

و ارتقای ADMIN فقط از مسیر privileged admin provisioning.

---

## 4.4 RBAC

سند راهبردی Role + Permission را الزام کرده، اما schema فقط `User.role` دارد.

### باید ساخته شود

- Role
- Permission
- RolePermission
- UserRole یا حداقل User.roleId
- Policy/Scope

مثلاً:

`listing.publish`
`listing.moderate`
`brand.update`
`category.publish`
`user.suspend`
`security.manage`

---

## 4.5 Audit Log

سند امنیتی ثبت Who/What/When/Where/Before/After را الزام کرده، ولی مدل `AuditLog` در schema نیست.

### باید اضافه شود

`AuditLog`

با:

- actorId
- actorType
- action
- entityType
- entityId
- beforeJson
- afterJson
- IP
- userAgent
- requestId
- reason
- createdAt

Audit باید append-only باشد.

---

## 4.6 Rate Limiting

برای login، register، verify، resend، AI، upload و messaging باید rate limit مستقل وجود داشته باشد.

حداقل:

- IP bucket
- account bucket
- endpoint bucket
- exponential backoff
- abuse logging

---

## 4.7 Upload Security

`/api/upload` عمومی است و نوع فایل را از `file.type` می‌گیرد.

این به‌تنهایی کافی نیست.

### باید اضافه شود

- magic-byte/content sniffing
- image decode validation
- malware scanning
- EXIF sanitization
- filename normalization
- quota
- per-user rate limit
- storage خارج از public filesystem در production
- signed URL
- image processing pipeline

---

# 5. AI Architecture — نواقص

HEAVIX مدل‌های AI متعددی دارد، ولی AI هنوز یک **Policy-Controlled Agent Platform** کامل نیست.

## نیازهای تکمیلی

### AI Gateway
باید:

```text
Request
 ↓
Authentication
 ↓
Task Policy
 ↓
Input Classification
 ↓
Model Router
 ↓
Tool Permission
 ↓
Execution
 ↓
Output Validation
 ↓
Audit
```

باشد.

### نکته مهم
هیچ AI نباید مستقیماً:

- permission تغییر دهد
- admin ایجاد کند
- database destructive operation انجام دهد
- secret بخواند
- financial action انجام دهد

---

## 5.1 AI Cost Control

AIGatewayLog وجود دارد، اما Policy/Quota مدل‌محور باید اضافه شود:

- daily budget
- per-user quota
- per-agent quota
- model fallback
- timeout
- max tokens
- cost alert
- circuit breaker

---

# 6. Marketplace Gaps

## Seller/Company

Company schema وجود دارد ولی lifecycle کامل verification/ownership/representative/beneficial ownership هنوز مدل نشده است.

### پیشنهاد

```text
Company
 ├── CompanyUser
 ├── CompanyVerification
 ├── CompanyDocument
 ├── CompanyBranch
 ├── CompanyIndustry
 └── CompanyContact
```

---

## Offer / Negotiation

ListingOffer و DealRoom وجود دارند، اما وضعیت‌ها و state transition باید formal شوند.

مثلاً:

`PENDING → COUNTERED → ACCEPTED → SETTLED → CANCELLED`

و هر transition باید audit شود.

---

## Payment / Settlement

Auction schema وجود دارد اما Settlement/Payment Ledger واقعی وجود ندارد.

برای Marketplace B2B، این باید قبل از تراکنش واقعی طراحی شود.

---

# 7. SEO / Knowledge

Article و KnowledgeEntry وجود دارند، ولی برای هدف SEO بزرگ HEAVIX بهتر است Entity SEO به‌صورت reusable ساخته شود:

`SEOMetadata`

برای:

- Category
- Brand
- Model
- Product
- Machine
- Part
- Attachment
- Company
- Article
- Location

همچنین:

- canonical URL
- robots policy
- structured data
- sitemap priority
- redirect map
- slug history

---

# 8. Search Architecture

AI Search وجود دارد اما Search Engine مستقل هنوز کامل نیست.

برای مقیاس نهایی باید از DB LIKE query به معماری Search جدا مهاجرت شود:

```text
Canonical DB
     ↓
Search Index
     ↓
Lexical Search + Persian normalization
     ↓
Semantic Search
     ↓
Ranking
     ↓
AI Query Understanding
```

Industrial Dictionary فعلی باید در normalization/search pipeline استفاده شود.

---

# 9. Data Governance

Provenance برای Attributeها خوب طراحی شده، ولی همین اصل باید به کل داده گسترش پیدا کند:

- Source
- ImportedAt
- VerifiedAt
- VerifiedBy
- Confidence
- Version

برای Brand/Model/Product/Company نیز لازم است.

---

# 10. Performance

با رشد HEAVIX:

- DB indexing باید formal شود.
- pagination باید cursor-based شود.
- image processing async شود.
- search از DB جدا شود.
- cache layer اضافه شود.
- background jobs اضافه شوند.
- AI و scraping نباید request lifecycle اصلی را block کنند.

---

# 11. Testing Gap

تست‌های موجود عمدتاً shell/runtime هستند و تست جامع Domain/API/UI دیده نمی‌شود.

باید اضافه شود:

### Unit
- taxonomy
- slug
- permissions
- price
- attribute validation
- matching

### Integration
- auth
- listing lifecycle
- brand lifecycle
- taxonomy CRUD
- RFQ
- auction

### E2E
- register → verify → login
- seller → create listing → publish
- buyer → search → offer
- admin → moderate

### Security
- privilege escalation
- IDOR
- upload abuse
- rate limit
- CSRF/session
- prompt injection

---

# 12. اولویت‌بندی اصلاحات

## P0 — قبل از ادامه توسعه

1. Password hashing
2. حذف امکان ثبت‌نام ADMIN
3. اصلاح Admin session
4. PostgreSQL/SQLite decision
5. Migration strategy
6. AuditLog
7. RBAC/Permissions پایه
8. Rate limiting
9. Upload hardening
10. AI gateway auth/quota

## P1 — قبل از Marketplace کامل

11. Product
12. Machine
13. Part/Attachment catalog
14. Compatibility Graph
15. canonical Location
16. Transaction normalization
17. Company verification
18. Search index
19. background jobs
20. test suite

## P2 — رشد و Intelligence

21. Knowledge Graph
22. Price Intelligence
23. Demand Engine
24. Recommendation
25. Market Heatmap
26. AI agents
27. Opportunity Engine
28. advanced SEO automation

---

# 13. نتیجه

HEAVIX از نظر Foundation و Taxonomy پایه خوبی دارد، اما **نباید همین وضعیت را Production-ready فرض کرد**.

بزرگ‌ترین خطر فعلی، ادامه دادن Feature Development قبل از بستن P0 است.

ترتیب پیشنهادی:

`Security + DB Contract → Governance → Product/Machine Catalog → Marketplace → Search → AI Intelligence`
