# HEAVIX — Implementation Gap Audit (Final)

**تاریخ:** 2026-09-21
**روش:** بررسی دقیق کد + دیتابیس واقعی (نه اسناد)

---

## خلاصه اجرایی

| وضعیت | تعداد | موارد |
|--------|-------|-------|
| ✅ کامل | ۸ | Brand Registry, Listing Engine, Admin, AI Listing, AI Search, Compare, Market Intelligence, Testing |
| 🟡 ناقص | ۲۶ | Taxonomy, Attributes, Catalog, RBAC, Security, Search, Pricing, RFQ, DealRoom, SEO, Notifications, AI Gateway, AI Agents, Knowledge Graph و... |
| 🔴 وجود ندارد | ۱۱ | Messaging, Analytics, Transport, Company Network, Enterprise, API Docs, Procurement, Auto Moderation, AI Matching, Predictive, Backup/Observability/PWA |

---

## ۵ شکاف بحرانی (به ترتیب اولویت)

### ۱. RBAC اجرا نمی‌شود
- `UserRole` = ۰ ردیف — هیچ کاربری نقش RBAC ندارد
- `requirePermission` فقط در ۸ از ۷۹ مسیر ادمین فراخوانی می‌شود
- احراز هویت ادمین فقط روی admin-cookie + `User.role` متکی است

### ۲. Catalog Entities خالی
- `Product`, `ProductModel`, `Machine`, `Part`, `Attachment`, `CompatibilityEdge` = همگی ۰ ردیف
- اسکema + پنل ادمین وجود دارد ولی داده‌ای seed نشده
- Knowledge Graph و AI Catalog Agents چیزی برای کار روی آن ندارند

### ۳. Price Engine اجرا نشده
- ۱۰۱۴ خط کد + ۴ تب ادمین + ۴ API — همه واقعی
- ولی `PriceObservation` / `PriceEstimate` / `PriceOverride` = همگی ۰ ردیف
- کارت قیمت در صفحه آگهی همیشه "INSUFFICIENT" نشان می‌دهد

### ۴. AI Gateway و AI Agents هرگز اجرا نشده‌اند
- کد واقعی (۵ گیت policy، ۴ ایجنت)
- `AIGatewayLog` = ۰ ردیف، `AIAgent.lastRunAt` = null
- هیچ ترافیک AI از درون gateway عبور نکرده

### ۵. ListingAttributeValue = ۳ ردیف
- ۴۰۵ تعریف ویژگی + ۷۳۱ ارتباط دسته-ویژگی
- ولی فقط ۳ آگهی ویژگی‌ها را پر کرده‌اند
- فیلتر بر اساس ویژگی عملاً بی‌فایده است

---

## جدول کامل ممیزی

### P0 — Foundation

| # | قابلیت | در سند | در کد | وضعیت | یادداشت |
|---|--------|:------:|:-----:|:-----:|---------|
| ۱ | Taxonomy | ✅ | ✅ | 🟡 | ۵۳۹ دسته، ۲۰۵ L1، ۲۲۱ L2، ۹۹ L3. ولی "۱۶ گروه L1 ماشین‌آلات" دقیق نیست — ۱ ریشه machinery با ۲۵ فرزند |
| ۲ | Attribute Engine | ✅ | ✅ | 🟡 | ۴۰۵ تعریف، ۲۱۵ گزینه، ۷۳۱ ارتباط. ولی ListingAttributeValue = ۳ ردیف |
| ۳ | Brand Registry | ✅ | ✅ | ✅ | ۶۲۹ برند، ۳۱۶ alias، ۱۸ خانواده، ۸۳۸ ارتباط صنعت. ۱۱ تب ادمین |
| ۴ | Model/Product Catalog | ✅ | ✅ | 🟡 | ۷ مدل اسکema + پنل ادمین. ولی همگی ۰ ردیف |
| ۵ | Listing Engine | ✅ | ✅ | ✅ | ۳۱ آگهی، ویرایش کامل ۱۲۶۶ خط، ویزارد ۷ مرحله‌ای |
| ۶ | User/Company | ✅ | ✅ | 🟡 | ۲ کاربر، ۱ شرکت. CompanyBranch/Document/Verification وجود دارد |
| ۷ | RBAC | ✅ | ✅ | 🟡 | ۵ نقش، ۲۰ مجوز، ۳۹ ارتباط. ولی UserRole = ۰، فقط ۸ مسیر enforce می‌کنند |
| ۸ | Verification | ✅ | ✅ | 🟡 | CompanyVerification + VerificationCode + email/mobile verified. ۱ تأییدیه |
| ۹ | Admin | ✅ | ✅ | ✅ | ۷۱ صفحه، ۷۹ API. همگی واقعی (نه redirect) |
| ۱۰ | Media | ✅ | ✅ | 🟡 | MediaUploader + upload hardening. EXIF strip نشده (فقط TODO) |
| ۱۱ | Security | ✅ | ✅ | 🟡 | bcrypt + secure session + rate limit + audit. ولی RBAC عملی نیست، EXIF نشده |
| ۱۲ | Search | ✅ | ✅ | 🟡 | Persian normalization کامل. ولی SQLite LIKE (نه FTS). ۳ جستجو لاگ شده |
| ۱۳ | Prisma Integrity | ✅ | ✅ | 🟡 | ۱۰۶ مدل، ۱ migration baseline. db:push فعال. اسناد "۲۹۵ دسته" می‌گویند ولی واقعی ۵۳۹ است |

### P1 — Marketplace

| # | قابلیت | در سند | در کد | وضعیت | یادداشت |
|---|--------|:------:|:-----:|:-----:|---------|
| ۱۴ | AI Listing | ✅ | ✅ | ✅ | ai-listing-builder + ai-scraper واقعی |
| ۱۵ | AI Search | ✅ | ✅ | ✅ | LLM + filter extraction + searchListings |
| ۱۶ | Request/Wanted | ✅ | ✅ | 🟡 | BuyRequest + CRUD. ولی ۰ ردیف، matching engine وجود ندارد |
| ۱۷ | Compare | ✅ | ✅ | ✅ | ۹۳۰ خط compare-engine + /compare + share + AI summary. ۳ session |
| ۱۸ | Price Estimation | ✅ | ✅ | 🟡 | ۱۰۱۴ خط price-engine. ولی ۰ observation/estimate |
| ۱۹ | Favorites | ✅ | ✅ | 🟡 | Favorite model + API. ۰ ردیف، UI روی کارت آگهی نیست |
| ۲۰ | Alerts | ✅ | ✅ | 🟡 | SavedSearch + API. ۰ ردیف، matcher/cron وجود ندارد |
| ۲۱ | Messaging | ✅ | 🔴 | 🔴 | هیچ مدل Conversation/Message |
| ۲۲ | Moderation | ✅ | 🟡 | 🟡 | AI moderation on-demand. حلقه خودکار وجود ندارد |
| ۲۳ | SEO | ✅ | ✅ | 🟡 | SEOMetadata + sitemap + robots. ۱ ردیف، JSON-LD روی صفحات نیست |
| ۲۴ | Analytics | ✅ | 🔴 | 🔴 | هیچ مدل event tracking |

### P2 — Network

| # | قابلیت | در سند | در کد | وضعیت | یادداشت |
|---|--------|:------:|:-----:|:-----:|---------|
| ۲۵ | RFQ | ✅ | ✅ | 🟡 | RFQ + RFQQuote + admin. ۱ RFQ / ۰ quote |
| ۲۶ | Deal Room | ✅ | ✅ | 🟡 | DealRoom + DealMessage. ۰ ردیف، API/UI وصل نیست |
| ۲۷ | Inspection | ✅ | 🟡 | 🟡 | فیلد روی MachinePassport + SellIn7. مدل مستقل نیست |
| ۲۸ | Transport | 🔴 | 🔴 | 🔴 | هیچ مدل |
| ۲۹ | Rental | ✅ | ✅ | 🟡 | TransactionType RENT + دوره‌های اجاره. مدل مستقل نیست |
| ۳۰ | Offers | ✅ | ✅ | 🟡 | ListingOffer + API + admin. ۰ ردیف |
| ۳۱ | Company Network | ✅ | 🔴 | 🔴 | هیچ مدل |
| ۳۲ | Notifications | ✅ | 🟡 | 🟡 | Notification + API. ۰ ردیف، Bell از localStorage |

### P3-P4 — Intelligence & AI

| # | قابلیت | در سند | در کد | وضعیت | یادداشت |
|---|--------|:------:|:-----:|:-----:|---------|
| ۳۳ | Knowledge Graph | ✅ | ✅ | 🟡 | ۱۷۴۷ خط. ولی CompatibilityEdge = ۰ |
| ۳۴ | Market Intelligence | ✅ | ✅ | ✅ | demand + opportunity + heatmap. همگی واقعی |
| ۳۵ | Market Index | ✅ | 🟡 | 🟡 | aggregate روی Listing.price. مدل سری زمانی نیست |
| ۳۶ | Enterprise | ✅ | 🔴 | 🔴 | PremiumSubscription = ۰، billing نیست |
| ۳۷ | API Docs | ✅ | 🔴 | 🔴 | /api-docs حذف شده، OpenAPI نیست |
| ۳۸ | Auctions | ✅ | ✅ | 🟡 | Auction + Bid + admin. ۰ ردیف، UI عمومی نیست |
| ۳۹ | Procurement | ✅ | 🔴 | 🔴 | هیچ مدل |
| ۴۰ | MEKANIX | ✅ | 🟡 | 🟡 | فقط ارجاع متنی، API یکپارچه نیست |
| ۴۱ | AI Gateway | ✅ | ✅ | 🟡 | ۵ گیت policy. AIGatewayLog = ۰ |
| ۴۲ | AI Agents | ✅ | ✅ | 🟡 | ۴ ایجنت registered. هیچ‌کدام اجرا نشده |
| ۴۳ | AI Command Center | ✅ | 🟡 | 🟡 | split بین ۵ صفحه. dashboard واحد نیست |
| ۴۴ | Auto Moderation | ✅ | 🔴 | 🔴 | حلقه خودکار نیست |
| ۴۵ | Auto Catalog | ✅ | 🟡 | 🟡 | ۲ ایجنت catalog. اجرا نشده |
| ۴۶ | AI Pricing | ✅ | ✅ | 🟡 | ۲ API واقعی. PriceEstimate = ۰ |
| ۴۷ | AI Matching | ✅ | 🔴 | 🔴 | هیچ matching engine |
| ۴۸ | CompatibilityEdge | ✅ | ✅ | 🟡 | مدل + admin. ۰ ردیف |
| ۴۹ | Predictive | ✅ | 🔴 | 🔴 | هیچ مدل پیش‌بینی |

### Meta

| موضوع | وضعیت | یادداشت |
|--------|:-----:|---------|
| Testing | ✅ | ۷۰ pass, ۸ skip, ۰ fail. ولی API/E2E نیست |
| Backup | 🔴 | هیچ اسکریپت |
| Observability | 🔴 | هیچ monitoring |
| i18n | 🟡 | RTL hardcoded، locale switch نیست |
| PWA | 🔴 | manifest/service worker نیست |

---

## توصیه‌های اجرایی

### قدم بعدی (P0 تکمیل):
۱. **RBAC**: UserRole را برای کاربران موجود seed کن + requirePermission را به همه مسیرهای ادمین اضافه کن
۲. **Catalog Data**: ProductModel + Product را برای برندهای اصلی seed کن (Caterpillar 320, Komatsu PC210, Volvo EC220)
۳. **Price Engine**: PriceObservation را از آگهی‌های موجود backfill کن + estimate را برای همه آگهی‌ها اجرا کن
۴. **ListingAttributeValue**: ویژگی‌ها را برای آگهی‌های موجود پر کن (admin یا AI)
۵. **AI Gateway**: حداقل یک AI task واقعی از gateway اجرا کن تا AIGatewayLog پر شود
