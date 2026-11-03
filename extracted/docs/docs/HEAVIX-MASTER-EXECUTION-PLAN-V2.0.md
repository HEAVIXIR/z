# HEAVIX MASTER EXECUTION PLAN
## برنامه اجرایی توسعه تا Production-Grade Industrial Marketplace
### نسخه V2.0 — 22 September 2026

---

# 1. وضعیت واقعی فعلی

```text
Phase 1 — Data Foundation       ✅
Phase 1.5 — Hardening           ✅
Phase 2 — Catalog Core           ✅
```

وضعیت داده:
```text
539 Categories | 405 Attributes | 629 Brands
24 Product Models | 33 Products
18 Listings → Product | 8 Brands → Models
19/19 Tests | Lint = 0 | src/lib TS = 0 | Prisma TS = 0
```

---

# 2. نقشه راه

| Phase | حوزه | وضعست |
|---|---|---|
| 0 | Stabilization | ✅ |
| 1 | Data Foundation | ✅ |
| 1.5 | Hardening | ✅ |
| 2 | Catalog Core | ✅ |
| **3** | **Marketplace Core** | 🔵 اکنون |
| 4 | Search & Discovery | بعدی |
| 5 | Trust & Verification | بعدی |
| 6 | Price Intelligence + Compare | بعدی |
| 7 | RFQ / Wanted / Matching | بعدی |
| 8 | Rental / Auction / Commerce | بعدی |
| 9 | Services / Logistics | بعدی |
| 10 | AI / Intelligence | پیشرفته |
| 11 | Growth / SEO / Analytics | مستمر |
| 12 | Production Scale | نهایی |

---

# 3. Phase 3 — Marketplace Core

## Sprint تقسیم‌بندی:
- 3A: Listing Domain + API
- 3B: Seller / Company Domain + API
- 3C: Listing Workflow + Moderation
- 3D: Seller Center + End-to-End Tests

## Definition of Done:
```
✓ Create/Edit/Delete Listing
✓ Draft → Publish → Suspend → Expire → Sold → Archive
✓ Product relation
✓ Seller relation
✓ Company relation
✓ TransactionType
✓ Dynamic attributes
✓ Media
✓ Location
✓ Price
✓ Admin moderation
✓ Seller dashboard
✓ API tests
✓ E2E smoke
```

---

# 4. Quality Gate مشترک

هر Phase فقط زمانی بسته می‌شود که:
```
Schema ✓ | Migration ✓ | Service ✓ | API ✓ | Admin ✓
Frontend ✓ | Validation ✓ | Authorization ✓ | Tests ✓
Lint ✓ | Typecheck (critical) ✓ | Build ✓ | Runtime ✓
Audit ✓ | Documentation ✓
```

---

# 5. قانون TypeScript

- **Critical** (src/lib, prisma, core APIs): 0 errors
- **Product** (public pages, store, listing, seller, search): 0 errors
- **Admin Legacy**: burndown — باید جمع شوند ولی build را نشکنند
