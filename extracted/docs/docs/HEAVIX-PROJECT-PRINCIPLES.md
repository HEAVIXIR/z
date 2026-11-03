# HEAVIX — Project Principles & Document Index

**این فایل مرجع قطعی و حاکم بر کل پروژه است.**
**هرگونه توسعه باید منطبق با این اسناد باشد. هیچ‌گاه بدون مجوز صریح کاربر از این اسناد تخطی نشود.**

---

## سلسله‌مراتب اسناد (Authority Order)

1. **HEAVIX-CORRECTED-REFERENCE-V1.1.md** — مرجع معماری اجرایی (authoritative for code/architecture alignment).
2. **HEAVIX-SECURITY-BASELINE-V1.md** — مرجع امنیت (non-negotiable security principles).
3. **HEAVIX-DATA-GOVERNANCE-V1.md** — مرجع حاکمیت داده (canonicality, provenance, lifecycle).
4. **HEAVIX-P0-IMPLEMENTATION-PLAN.md** — مرجع ترتیب اجرایی (P0 → P1 → P2).
5. **HEAVIX-AUDIT-2026-09-20.md** — گزارش ممیزی و شکاف‌ها (gap assessment snapshot).
6. **HEAVIX-PROJECT-REFERENCE.md** — مرجع قبلی (تکمیلی، در صورت تعارض V1.1 مقدم است).
7. **HEAVIX-REQUIREMENTS-CORRECTIONS.md** — نیازمندی‌های اصلاحی کاربر (۸ مورد).
8. **HEAVIX-MASTER-DOCUMENT.md / HEAVIX-MASTER-STRATEGY.md** — اسناد استراتژیک قدیمی‌تر.

در صورت تعارض، ترتیب بالا ملاک است.

---

## اصول آمره پروژه (Non-Negotiable Principles)

### اصل ۱ — مرجع واحد
HEAVIX = Industrial Catalog + Marketplace + Services + Trade + Industrial Data + AI Intelligence.
مرجع اجرایی: HEAVIX-CORRECTED-REFERENCE-V1.1.

### اصل ۲ — تفکیک لایه‌ها
Category ≠ Transaction ≠ Service ≠ Industry ≠ Brand ≠ Model ≠ Location.
- اجاره/مزایده/درخواست = Transaction (نه Category).
- معدن/راهسازی/ساختمان = Application Industry (نه Category).
- Brand و Model = Entity مستقل (نه نسل چهارم Category).

### اصل ۳ — ماشین‌آلات سه‌نسلی
16 گروه L1 → خانواده L2 → تیپ L3. (مطابق Machine Taxonomy V1.0).
Brand و Model مستقل‌اند.

### اصل ۴ — امنیت بر پایه Zero Trust
- پسوردها هرگز plaintext ذخیره نشوند (Argon2id/bcrypt).
- ثبت‌نام عمومی هرگز نقش ADMIN نسازد.
- Admin session باید cryptographically secure باشد.
- RBAC + Audit Log الزامی است.
- هر عملیات حساس: AuthN → AuthZ → Policy → Validation → Service → DB → Audit.

### اصل ۵ — حاکمیت داده
- هر مفهوم فقط یک canonical record دارد.
- Alias → canonical.
- Provenance برای داده‌های استخراجی: source, confidence, verified, verifiedBy, verifiedAt.
- Lifecycle: DRAFT → PENDING_REVIEW → ACTIVE → INACTIVE → ARCHIVED.
- Hard delete ممنوع برای داده‌های business؛ ARCHIVE > DELETE.

### اصل ۶ — AI Untrusted
AI پیشنهاد می‌دهد؛ Policy Engine و Admin تصمیم می‌گیرند.
AI نمی‌تواند: admin بسازد، permission تغییر دهد، عملیات مخرب DB انجام دهد، secret بخواند، عملیات مالی بدون تأیید انسان انجام دهد.

### اصل ۷ — Definition of Done
هر Entity جدید باید: schema + migration + seed + API contract + authorization + validation + audit + admin UI + public UI (در صورت نیاز) + SEO (در صورت public بودن) + tests داشته باشد.

### اصل ۸ — Database Authority
Production = PostgreSQL (تصمیم نهایی).
SQLite فقط برای Preview/Local/Fixture.
Migration discipline الزامی (`prisma/migrations`).
`db push --accept-data-loss` در Production ممنوع.

### اصل ۹ — پنل مدیریت جامع
هر چیزی که اضافه می‌شود باید در پنل مدیریت قابل ویرایش کامل باشد (اصل همیشگی کاربر).

### اصل ۱۰ — سندسازی
در هر اصلاح، اطلاعات قبلی بدون دلیل حذف/تغییر نشود.
تمام فرآیند سند شود تا اصلاحات تکراری لازم نشود.
هر تغییر با worklog ثبت شود.

---

## ترتیب اجرایی (P0 → P1 → P2)

### P0 — قبل از ادامه توسعه (Security + DB Contract)
1. Password hashing (Argon2id/bcrypt)
2. حذف امکان ثبت‌نام ADMIN
3. اصلاح Admin session (cryptographically secure)
4. PostgreSQL/SQLite decision + migration strategy
5. AuditLog model
6. RBAC/Permissions پایه (Role, Permission, RolePermission, UserRole)
7. Rate limiting (login, register, verify, upload, AI, messaging)
8. Upload hardening (magic bytes, decode, EXIF sanitize, quota)
9. AI gateway auth/quota

### P1 — قبل از Marketplace کامل
11. Product entity
12. Machine entity
13. Part/Attachment catalog entity
14. Compatibility Graph (CompatibilityEdge)
15. Canonical Location (Listing → countryId/provinceId/cityId)
16. Transaction normalization (Listing → transactionTypeId)
17. Company verification lifecycle
18. Search index (مهاجرت از DB LIKE)
19. Background jobs
20. Test suite (unit + integration + e2e + security)

### P2 — رشد و Intelligence
21. Knowledge Graph
22. Price Intelligence
23. Demand Engine
24. Recommendation
25. Market Heatmap
26. AI agents
27. Opportunity Engine
28. Advanced SEO automation

---

## وضعیت فعلی پروژه (Snapshot)

- **Database:** SQLite (محیط dev/preview). PostgreSQL برای production طبق سند V1.1.
- **Taxonomy:** 14 root، ماشین‌آلات 16 L1 / 174 L2 / 97 L3.
- **Brand Registry:** ~629 برند canonical با alias/family/industry.
- **Attribute Engine:** ~405 AttributeDefinition با Provenance.
- **نواقص بحرانی P0:** password plaintext, admin session ضعیف, بدون RBAC, بدون AuditLog, بدون rate limit, بدون migration discipline.

**هشدار:** ادامه Feature Development قبل از بستن P0 خطرناک است.
ترتیب پیشنهادی: Security + DB Contract → Governance → Product/Machine Catalog → Marketplace → Search → AI Intelligence.
