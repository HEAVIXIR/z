# سند مادر پروژه HEAVIX

## سند راهبرد، معماری، محصول و نقشه راه توسعه

### هدف نهایی: تبدیل HEAVIX به بزرگ‌ترین مارکت‌پلیس صنعتی و معدنی فارسی

**نسخه:** 1.0
**وضعیت:** سند مرجع پروژه
**نام پروژه:** HEAVIX
**دامنه اصلی:** HEAVIX.IR
**نوع محصول:** Industrial & Mining Marketplace / Catalog OS
**زبان اولیه:** فارسی
**بازار هدف اولیه:** ایران
**چشم‌انداز توسعه:** منطقه‌ای و بین‌المللی

---

## 1. چشم‌انداز

HEAVIX با هدف ساخت یک **زیرساخت جامع دیجیتال برای صنعت، معدن، ماشین‌آلات و تجارت صنعتی** ایجاد می‌شود.

هدف HEAVIX صرفاً ساخت یک سایت آگهی نیست.

هدف نهایی:

> **تبدیل HEAVIX به بزرگ‌ترین و جامع‌ترین مارکت‌پلیس صنعتی و معدنی فارسی، با زیرساخت Catalog، Marketplace، خدمات، تجارت، داده و ارتباطات صنعتی.**

---

## 2. HEAVIX چه چیزی نیست؟

```text
❌ سایت آگهی ساده
❌ فروشگاه اینترنتی معمولی
❌ کاتالوگ استاتیک
❌ سایت شرکتی ماشین‌آلات
❌ مجموعه‌ای از صفحات Hard-Code
❌ مجموعه‌ای از CRUDهای مستقل
```

بلکه:

```text
HEAVIX = Industrial Catalog + Marketplace + B2B Platform + Services Network + Trade Infrastructure + Industrial Data
```

---

## 3. اصول بنیادین

### اصل اول — Single Source of Truth
برای هر مفهوم فقط یک منبع اصلی: Category → Taxonomy, Brand → Brand, Model → Model, Attribute → Dynamic Attribute System, Listing → Marketplace.

### اصل دوم — Dynamic First
Admin باید بتواند Category, Subcategory, Brand, Model, Attribute, Option, Industry, SEO, Display, Listing Rules را مدیریت کند — بدون نیاز به Developer.

### اصل سوم — API First
UI مستقیماً منطق تجاری را اجرا نمی‌کند: UI → API → Service Layer → Prisma → PostgreSQL.

### اصل چهارم — Data First
هر موجودیت باید: Unique ID, Slug, Status, Relations, SEO, Audit داشته باشد.

---

## 4. Taxonomy مرکزی (۱۶ دامنه)

```text
MACHINE | VEHICLE | PART | ATTACHMENT | SERVICE | RENTAL | TRANSPORT | MINERAL | MATERIAL | INDUSTRIAL_EQUIPMENT | AGRICULTURE | TRADING | AUCTION | REQUEST | KNOWLEDGE | GENERAL
```

ساختار: Domain → Category → Subcategory → Child Category (داینامیک، بدون تغییر کد).

---

## 5. Dynamic Attribute System

Category تعیین می‌کند **چه چیزی است**. Attribute تعیین می‌کند **چه مشخصاتی دارد**.

Typeها: TEXT | LONG_TEXT | INTEGER | DECIMAL | BOOLEAN | SELECT | MULTI_SELECT | RANGE | DATE | YEAR | CURRENCY | REFERENCE

---

## 6. Brand Architecture

```text
Brand → Model → Generation → Product → Machine → Listing
```

Brand با Category یکی نیست. Brand با Model هم یکی نیست. Brand می‌تواند در چند Domain و چند Category فعالیت داشته باشد.

- BrandCategory (many-to-many با metadata)
- BrandDomain (multi-domain)
- BrandMedia (۷ نوع: LOGO, LOGO_DARK, LOGO_LIGHT, COVER, BANNER, GALLERY, DOCUMENT)
- BrandSEO (مستقل per brand)
- BrandDisplay (۷ toggle نمایش)
- Status lifecycle: DRAFT → ACTIVE → INACTIVE → ARCHIVED

---

## 7. Product و Machine

Catalog Product ≠ Marketplace Listing.

```text
Caterpillar 320 = Catalog Entity
Caterpillar 320, 2022, 8500h, Tehran, Price = Listing
```

---

## 8. Marketplace

انواع معامله: SALE | RENT | AUCTION | REQUEST
آینده: DIRECT_BUY | NEGOTIATION | RFQ | B2B_ORDER

---

## 9. Admin — HEAVIX Catalog OS

```text
/admin
├── Dashboard
├── Taxonomy (Domains, Categories, Attributes, Industries)
├── Brands (Control Center با ۹ تب)
├── Models
├── Products
├── Machines
├── Listings
├── Requests
├── Auctions
├── Rentals
├── Services
├── Transport
├── Media
├── SEO
├── Users
├── Companies
├── Sellers
├── Reports
├── Analytics
└── Settings
```

---

## 10. امنیت داده

```text
Archive > Hard Delete
```

Dependency Check قبل از هر عملیات مخرب.

---

## 11. URL Architecture

```text
/brands/caterpillar
/brands/caterpillar/models/320
/machines/excavators
/machines/excavators/caterpillar-320
/parts/...
/attachments/...
/services/...
/rental/...
/auction/...
```

URLها: Stable, Readable, SEO-friendly, Predictable.

---

## 12. معماری فنی

```text
Next.js | TypeScript | React | Prisma | PostgreSQL | Tailwind CSS
```

ساختار:

```text
src
├── app
│   ├── admin
│   ├── api
│   └── ...
├── modules
│   ├── taxonomy
│   ├── brand
│   ├── model
│   ├── product
│   ├── machine
│   ├── listing
│   ├── marketplace
│   ├── service
│   └── ...
└── components
```

**از ایجاد معماری موازی و wrapperهای غیرضروری مانند `src/features` جلوگیری می‌کنیم.**

---

## 13. Roadmap کلان

| Phase | محتوا |
|-------|-------|
| Phase 1 — Foundation | Project Architecture, Database, Taxonomy, Domain, Category, Attribute, Brand, Model |
| Phase 2 — Catalog | Product, Machine, Parts, Attachments, Specifications, Compatibility, Media, SEO |
| Phase 3 — Marketplace | Listings, Search, Filters, Seller, Company, Requests, Sale, Rent |
| Phase 4 — Services | Service Providers, Repair, Maintenance, Inspection, Transport, MEKANIX Integration |
| Phase 5 — Trade | RFQ, B2B, Negotiation, Offers, Import, Export, Trading |
| Phase 6 — Auction | Auction, Bidding, Verification, Settlement |
| Phase 7 — Intelligence | AI Search, Smart Category Suggestions, Dynamic Form Preview, Recommendation, Matching, Price Intelligence, Compatibility Graph |

---

## 14. قانون طلایی پروژه

هر Feature جدید باید حداقل این ۵ سؤال را پاسخ دهد:

```text
1. آیا با Taxonomy مرکزی سازگار است؟
2. آیا داده را Duplicate می‌کند؟
3. آیا Admin می‌تواند آن را مدیریت کند؟
4. آیا API و Database Contract مشخص دارد؟
5. آیا به هدف Marketplace صنعتی HEAVIX کمک می‌کند؟
```

اگر پاسخ منفی باشد، Feature نباید وارد پروژه شود.

---

## 15. وضعیت فعلی پروژه (Phase 1 — Foundation)

### ✅ پیاده‌سازی‌شده
- ۱۶ دامنه Taxonomy (۱۷۰ دسته در درخت ۳ سطحی)
- سیستم Dynamic Attribute (۹ تعریف ویژگی + AttributeOption + CategoryAttribute)
- Brand Architecture کامل (Brand + BrandCategory + BrandDomain + BrandMedia + BrandSEO + BrandDisplay)
- ProductModel + ModelCategory (many-to-many) + Generation
- Brand Control Center (۹ تب: Overview, Identity, Domains, Categories, Models, Media, SEO, Display, Activity)
- Brand API (full CRUD + search on 5 fields + sort on 4 fields + archive with dependency check)
- Category API (full CRUD + tree + soft-delete)
- Homepage Sections (DB-backed, drag-drop editor, ۱۱ سکشن)
- Header (DB-backed menu from /api/menu)
- Hero (DB-backed content from HeroConfig)
- Footer (DB-backed content from /api/settings)
- User registration with email confirmation (unique mobile + email)
- Admin panel (Dashboard, Listings, Brands, Categories, Users, Settings, Menu, Hero, Footer, Homepage Layout)
- Site Settings (editable: brand, contact, footer, newsletter)
- Menu Manager (full CRUD, parent-child, toggle, reorder)
- HEAVIX Verified trust score (IronClad-style)
- Command Palette (⌘K)
- NotificationBell
- SavedSearch ("خبرم کن")
- MobileNav (bottom navigation)
- AI Brand Assistant (expand brands + update logos)
- ScrollReveal animations
- ExclusiveSaleSection (۴-step process)
- ServicesSection
- Persian/RTL, Vazirmatn font, orange #F58220 theme
- ۲۳ Prisma models, ۲۰ API routes

### 🔲 مرحله بعدی (Phase 2 — Catalog)
- Product entity (distinct from Listing)
- Machine entity
- Parts catalog
- Attachments catalog
- Specifications (using Dynamic Attributes on listings)
- Compatibility Graph (Machine ↔ Part ↔ Attachment ↔ Service)
- Media management (per entity)
- SEO per entity (Category, Brand, Model, Product)

---

**این سند از اینجا به بعد سند مادر HEAVIX است.** هر قابلیت جدید باید ابتدا با این معماری تطبیق داده شود و بعد کدنویسی شود.
