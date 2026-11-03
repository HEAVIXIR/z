# سند سیاست‌گذاری راهبردی HEAVIX

## HEAVIX MASTER STRATEGY & CONTROL POLICY

### نسخه پیشنهادی برای رسیدن به یک Industrial Marketplace نسل جدید

**نسخه:** 1.0
**وضعیت:** سند مرجع راهبردی
**تاریخ:** 1404/07/01

---

## 1. فلسفه اصلی

سؤال صحیح:

> **«چطور زیرساخت دیجیتال بازار صنعتی و معدنی فارسی را بسازیم؟»**

```text
INDUSTRIAL WORLD → HEAVIX → DATA → INTELLIGENCE → MARKETPLACE → TRANSACTIONS → SERVICES → BUSINESS NETWORK
```

---

## 2. هفت لایه معماری استراتژیک

```text
┌─────────────────────────────────────────────┐
│                AI COMMAND                  │
├─────────────────────────────────────────────┤
│             AUTOMATION LAYER               │
├─────────────────────────────────────────────┤
│             MARKETPLACE LAYER              │
├─────────────────────────────────────────────┤
│              CATALOG LAYER                 │
├─────────────────────────────────────────────┤
│              DATA LAYER                    │
├─────────────────────────────────────────────┤
│           SECURITY & TRUST                 │
├─────────────────────────────────────────────┤
│          INFRASTRUCTURE LAYER              │
└─────────────────────────────────────────────┘
```

---

## 3. اصل «Everything Controllable»

هر چیزی که منطقی است مدیر سیستم بتواند تغییر دهد، نباید برای تغییر آن نیاز به Developer داشته باشد.

پنل مدیریت → **HEAVIX CONTROL CENTER** (نه فقط Admin Dashboard).

---

## 4. ساختار پنل مدیریت پیشنهادی

```text
/admin
├── Dashboard
├── AI Command Center
├── Catalog (Domains, Industries, Categories, Attributes, Options, Brands, Models, Products, Machines, Parts, Attachments)
├── Marketplace (Listings, Requests, Offers, Rentals, Auctions, Transactions)
├── Companies, Sellers, Buyers, Users
├── Services, Transport, MEKANIX
├── Content (Articles, Guides, News, Pages, Media)
├── Marketing (Campaigns, Banners, Promotions, Featured, Notifications)
├── SEO, Search, Analytics, Finance
├── AI, Automation
├── Security, Audit, System Health
└── Settings
```

---

## 5. کنترل کامل Frontend از Admin

مدیر بتواند: فعال/غیرفعال، ترتیب، عنوان، زیرعنوان، تصویر، لینک، رنگ، نمایش موبایل/دسکتاپ، زمان‌بندی.

قانون: **Admin نباید تبدیل به Page Builder بی‌قاعده شود.** کامپوننت‌ها از قبل مهندسی شده‌اند و Admin فقط پارامترهای مجاز را کنترل می‌کند.

---

## 6. AI Command Center

مدیر وارد `/admin/ai` شود و با HEAVIX صحبت کند:

> «تمام برندهای فعال حوزه ماشین‌آلات معدنی که مدل ثبت‌شده ندارند را پیدا کن.»

AI پیشنهاد می‌دهد؛ تصمیم‌های حساس را انسان تأیید می‌کند.

---

## 7. سطوح اختیار AI

| Level | نام | عملیات |
|-------|-----|--------|
| 1 | Read | Analytics, Search, Reports, Diagnostics |
| 2 | Assist | SEO, Classification, Attribute Suggestions, Duplicate Detection, Content |
| 3 | Autonomous | Notifications, Data Cleanup, Index Optimization, Routine Moderation, Scheduled Content |

عملیات حساس (Database Delete, Financial Action, Permission Changes, Security Changes, Account Suspension) نیاز به کنترل انسانی دارند.

---

## 8. AI Agents تخصصی

- **Catalog Agent**: Category Quality, Attributes, Brand, Model, Duplicate Detection
- **SEO Agent**: Meta, Schema, Internal Linking, Content Gaps, Broken Links
- **Marketplace Agent**: Listing Quality, Duplicate Listings, Price Anomalies, Seller Quality
- **Sales Agent**: Lead, Lead Qualification, Seller Matching, Buyer Matching
- **Support Agent**: FAQ, User Support, Ticket Classification
- **Security Agent**: Suspicious Login, Abnormal Activity, Bot Detection
- **Data Agent**: Data Quality, Missing Fields, Duplicates, Broken Relations

---

## 9. Agent Orchestrator

```text
AI Agents → Agent Orchestrator → Policy Engine → Permission Engine → Action
```

---

## 10. Automation Center

`/admin/automation` — مدیر بتواند Workflow بسازد:

```text
WHEN listing.created
IF category = excavator
THEN require: Operating Weight, Engine Power, Year, Hours
```

بدون کدنویسی: IF, THEN, AND, OR, WAIT, NOTIFY, APPROVE, REJECT, CREATE, UPDATE, PUBLISH, ARCHIVE.

---

## 11. Event-Driven Architecture

Events: ListingCreated, ListingUpdated, ListingPublished, ListingExpired, BrandCreated, ModelCreated, RequestCreated, OfferCreated, TransactionCreated, UserVerified, SellerVerified.

Automationها روی Eventها اجرا شوند.

---

## 12. امنیت — Zero Trust

هیچ کاربر، سرویس، API یا Agent صرفاً به دلیل داخلی بودن، قابل اعتماد فرض نشود.

---

## 13. Identity Security

Admin: MFA, Strong Password Policy, Session Management, Device Recognition, Login Alerts, IP/Geo Anomaly Detection.

عملیات حساس: Step-Up Authentication (Password + MFA + Confirmation).

---

## 14. RBAC + Permission-Based Access

Roles: SUPER_ADMIN, ADMIN, CATALOG_MANAGER, MARKETPLACE_MANAGER, CONTENT_MANAGER, SEO_MANAGER, FINANCE_MANAGER, SUPPORT_MANAGER, MODERATOR, SELLER, COMPANY_ADMIN.

Permissions: brand.read, brand.create, brand.update, brand.archive, listing.publish, listing.moderate, user.suspend, user.verify.

---

## 15. اصل Least Privilege

هر کاربر فقط همان دسترسیی را داشته باشد که برای کارش لازم است.

---

## 16. Audit Log غیرقابل‌چشم‌پوشی

تمام عملیات مهم ثبت شود: Who, What, When, Where, Before, After, IP, Device, Request ID, Reason.

Audit Log نباید توسط Admin معمولی قابل حذف یا تغییر باشد.

---

## 17. Backup Strategy

سه لایه: Database Backup, Application Backup, Disaster Recovery.
برنامه: Daily, Weekly, Monthly + تست Restore.

---

## 18. API Security

تمام APIها: Authentication, Authorization, Validation, Rate Limit, Logging, Error Handling.

---

## 19. File Upload Security

File Type Validation, MIME Validation, Size Limit, Virus/Malware Scanning, Filename Sanitization, Storage Isolation, Access Control.

---

## 20. Anti-Fraud

AI تشخیص: Duplicate Seller, Duplicate Listing, Suspicious Price, Copied Images, Fake Documents, Mass Account Creation, Abnormal Messaging.

---

## 21. Seller Trust Score

Identity Verified, Company Verified, Documents Verified, Phone Verified, History, Response Rate, Transaction History.

---

## 22. امنیت AI

AI نباید بتواند با یک Prompt مخرب: Delete Database, Change Admin, Expose Secrets.

```text
AI → Tool Permission → Policy Engine → Validation → Execution
```

---

## 23. Prompt Injection Defense

هر محتوایی که کاربر وارد می‌کند (Listing Description, Article, Message, Document) → Untrusted Input برای AI.

---

## 24. AI Privacy

داده‌ها طبقه‌بندی: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED. AI بر اساس Policy تصمیم می‌گیرد چه داده‌ای قابل پردازش است.

---

## 25. Observability

Logs, Metrics, Traces, Errors, Performance, Database Health, API Health, Queue Health, AI Usage.

`/admin/system/health`

---

## 26. AI برای ورود اطلاعات

عکس ماشین → AI: Brand, Model, Category, Year + Suggested Attributes.
متن آزاد → AI: استخراج Brand, Model, Category, Year, Hours, Condition + auto-fill فرم.

AI پیشنهاد می‌دهد، کاربر تأیید می‌کند.

---

## 27. AI Search

جستجوی طبیعی فارسی: «یه لودر دست دوم حدود ۵ تن برای معدن می‌خوام» → فیلترهای ساختاریافته.

---

## 28. AI Matching

Demand ↔ Supply: Buyer Request → AI Matching → Relevant Listings → Relevant Sellers.

---

## 29. Industrial Knowledge Graph

Brand, Model, Machine, Part, Attachment, Service, Company, Location, Industry, Mineral, Material — همه به‌صورت Graph متصل.

---

## 30. Marketplace Intelligence

What is searched? What is missing? What sells? What rents? Where is demand? Which brands are growing? Which categories are underserved?

---

## 31. Market Heatmap

نقشه ایران: Demand, Supply, Rental, Service, Transport per province.

---

## 32. Industrial Opportunity Engine

High Search + Low Supply = Opportunity. High Demand + Few Sellers = Marketplace Opportunity.

---

## 33. Admin AI Briefing

هر صبح: خلاصه آمار + ۵ اقدام مهم امروز.

---

## 34. Autonomous Moderation

Listing → AI Moderation → Quality Check → Fraud Check → Category Check → Attribute Check → Human Review if needed → Publish.

---

## 35. Human-in-the-Loop

هرجا اشتباه AI می‌تواند خسارت جدی ایجاد کند، انسان در حلقه باقی بماند: Financial, Legal, Security, Account Ban, High-value Transaction, Sensitive Documents.

---

## 36. Design System

Colors, Typography, Spacing, Buttons, Inputs, Tables, Cards, Dialogs, Charts, Forms, Status, Alerts — تمام Admin و سایت از آن استفاده کنند.

---

## 37. Performance

Fast First Load, Fast Search, Fast Filters, Fast Images, Fast Mobile.
Caching, CDN, Image Optimization, Lazy Loading, Database Indexing, Pagination, Server Components, Background Jobs.

---

## 38. Modular Monolith First

```text
HEAVIX
└── Modular Monolith
    ├── Taxonomy
    ├── Catalog
    ├── Marketplace
    ├── Users
    ├── Companies
    ├── Services
    ├── AI
    └── Automation
```

وقتی لازم شد: Module → Service جدا شود.

---

## 39. Codebase پیشنهادی

```text
src/
├── app/
├── modules/
│   ├── taxonomy/
│   ├── catalog/
│   ├── brand/
│   ├── model/
│   ├── product/
│   ├── machine/
│   ├── marketplace/
│   ├── listing/
│   ├── request/
│   ├── rental/
│   ├── auction/
│   ├── service/
│   ├── transport/
│   ├── company/
│   ├── seller/
│   ├── search/
│   ├── ai/
│   ├── automation/
│   ├── security/
│   └── analytics/
├── components/
└── lib/
```

**`src/features` برنمی‌گردد.**

---

## 40. نقشه راه

| مرحله | محتوا |
|-------|-------|
| A — Foundation | Database, Taxonomy, Category, Attribute, Brand, Model, Industry |
| B — Catalog OS | Product, Machine, Part, Attachment, Compatibility, Media, SEO |
| C — Marketplace | Listing, Seller, Company, Search, Filters, Request, Sale, Rent |
| D — Trust | Verification, Moderation, Fraud, Reviews, Audit |
| E — Services | Service, Transport, MEKANIX |
| F — Intelligence | AI Search, AI Classification, AI Matching, AI Recommendation, AI Moderation, AI SEO |
| G — Automation | Event Bus, Workflow Engine, Agent Orchestrator, Policy Engine |
| H — Industrial OS | B2B, RFQ, Trade, Auction, Market Intelligence, Knowledge Graph, Digital Identity |

---

## 41. ۱۰ ستون آینده HEAVIX

1. **HEAVIX AI Search** — جستجوی طبیعی فارسی
2. **HEAVIX Catalog OS** — دسته‌بندی و Attribute داینامیک
3. **Compatibility Graph** — ارتباط ماشین، قطعه، ادوات، خدمات
4. **AI Listing Builder** — ساخت آگهی از متن و تصویر
5. **AI Marketplace Matching** — وصل کردن عرضه و تقاضا
6. **HEAVIX Trust** — احراز هویت، اعتبار فروشنده و کالا
7. **HEAVIX Automation** — Workflowهای خودکار
8. **AI Command Center** — مدیریت هوشمند پلتفرم
9. **Industrial Knowledge Graph** — شبکه دانش صنعتی
10. **Industrial Opportunity Engine** — کشف فرصت‌های بازار

---

## 42. اصل مهم: AI را زودتر از موعد وارد نکنیم

```text
DATA → STRUCTURE → RULES → AUTOMATION → AI → AUTONOMOUS OPERATIONS
```

AI روی داده بد، فقط اشتباهات را سریعتر و در مقیاس بزرگتر تولید می‌کند.

---

## 43. پنج سند مرجع پروژه

```text
01 — PRODUCT VISION (هدف و جایگاه HEAVIX)
02 — MASTER ARCHITECTURE (ساختار نرم‌افزار و Database)
03 — CATALOG & TAXONOMY POLICY (Domain / Category / Attribute / Brand / Model)
04 — AI & AUTOMATION POLICY (Agent / Workflow / Human Approval / AI Tools)
05 — SECURITY & TRUST POLICY (Identity / RBAC / Audit / Backup / Fraud / AI Security)
```

هیچ Feature مهمی خارج از این پنج سند ساخته نشود.

---

## 44. چشم‌انداز نهایی

```text
                         HEAVIX
                           │
              ┌────────────┴────────────┐
              │                         │
           HUMAN                     AI
              │                         │
              └────────────┬────────────┘
                           │
                    HEAVIX CONTROL
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
     CATALOG          MARKETPLACE           SERVICES
       │                   │                   │
     BRANDS              SALE                REPAIR
     MODELS              RENT                TRANSPORT
     MACHINES            AUCTION             MEKANIX
     PARTS               REQUEST
     ATTRIBUTES           B2B
       │                   │
       └───────────────────┼───────────────────┘
                           │
                    INDUSTRIAL DATA
                           │
                    KNOWLEDGE GRAPH
                           │
                    AI INTELLIGENCE
                           │
                    AUTOMATION OS
```

> **HEAVIX باید از یک وب‌سایت به یک شبکه دیجیتال صنعتی تبدیل شود.**
