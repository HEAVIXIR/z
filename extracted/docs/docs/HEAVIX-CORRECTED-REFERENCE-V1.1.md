# HEAVIX — Corrected Project Reference
## نسخه اجرایی پیشنهادی V1.1

این سند نسخه اصلاحی برای هم‌تراز کردن «سند» و «کد» است. سندهای قبلی حفظ می‌شوند؛ این فایل مشخص می‌کند از اینجا به بعد چه چیزی authoritative است.

## 1. اصل مرجع

HEAVIX = Industrial Catalog + Marketplace + Services + Trade + Industrial Data + AI Intelligence

## 2. Parent Taxonomy

14 محور فعلی:

1. ماشین‌آلات
2. خودرو و ناوگان صنعتی
3. قطعات و لوازم یدکی
4. متعلقات و تجهیزات جانبی
5. اجاره
6. خدمات فنی و صنعتی
7. حمل‌ونقل و لجستیک
8. مواد معدنی و مصالح
9. تجهیزات صنعتی
10. ماشین‌آلات و تجهیزات کشاورزی
11. بازرگانی و تأمین
12. مزایده و فروش ویژه
13. درخواست خرید / تأمین
14. سایر

### قاعده Backend
این 14 مورد یک «Business Taxonomy / Navigation Taxonomy» هستند؛ همه آنها Category محصول نیستند.

لایه‌ها:

- CATALOG: MACHINE, VEHICLE, PART, ATTACHMENT, MATERIAL/MINERAL, INDUSTRIAL_EQUIPMENT, AGRICULTURE
- MARKETPLACE: RENTAL, TRADING, AUCTION, REQUEST
- SERVICE: SERVICE, TRANSPORT
- FALLBACK: GENERAL

## 3. Machine Taxonomy

ماشین‌آلات سه نسل:

`L1 Group → L2 Family → L3 Variant/Configuration`

16 گروه L1:

1. راهسازی و عمرانی
2. معدنی
3. حفاری
4. خردایش، دانه‌بندی و فرآوری
5. بتن و آسفالت
6. جرثقیل، بالابر و لیفتینگ
7. لیفتراک و جابه‌جایی مواد
8. حمل و باربری صنعتی
9. بندری و دریایی
10. بازیافت و پسماند
11. تونل و زیرزمینی
12. صنعتی و تولیدی سنگین
13. نیرو، انرژی و تأسیسات سیار
14. خدمات شهری و محیط‌زیست
15. ماشین‌آلات ویژه پروژه
16. سایر ماشین‌آلات تخصصی

Brand و Model نسل چهارم نیستند؛ Entity مستقل‌اند.

## 4. Canonical Domain Model

```text
Brand
Model
Product
Machine
Part
Attachment
Company
Category
AttributeDefinition
AttributeValue
Listing
Transaction
Service
Location
Document
Media
```

### رابطه اصلی

```text
Brand → Model → Product
                     ├→ Machine
                     ├→ Part
                     └→ Attachment

Catalog Entity → Listing

Listing → Transaction
Listing → Company/User
Listing → Location
Listing → Attributes
Listing → Media
```

## 5. Product vs Listing

Product = موجودیت کاتالوگی canonical.

Listing = عرضه/تقاضای بازار.

مثال:

`Caterpillar 320` = Product

`Caterpillar 320 / 2022 / 8500h / Tehran / price` = Machine + Listing

## 6. Transaction

TransactionType مستقل:

- SALE
- RENT
- WANTED
- QUOTE
- AUCTION
- SERVICE_REQUEST

Listing نباید type آزاد و مستقل از این لایه داشته باشد.

## 7. Service

ServiceType مستقل:

- INSPECTION
- REPAIR
- MAINTENANCE
- TRANSPORT
- CONSULTING
- VALUATION
- INSTALLATION
- TRAINING
- OTHER

## 8. Application Industry

Industry از Category جداست.

16 Application Industry فعلی DB حفظ می‌شوند.

## 9. Location

Country → Province → City

Listing/Company/Request باید در نهایت به canonical location IDs متصل شوند.

## 10. Attribute Engine

سه سطح:

1. Global
2. Domain
3. Category

هر value باید در صورت امکان provenance داشته باشد:

SELLER_INPUT / MANUFACTURER_DOCUMENT / AI_EXTRACTION / AI_INFERENCE / ADMIN_VERIFIED / IMPORTED

## 11. Brand Registry

Brand مستقل است و می‌تواند به:

- Domain
- Category
- Industry
- Model
- Alias
- Media
- SEO

متصل شود.

## 12. Security Authority

هیچ client یا AI نباید مستقیماً permission-sensitive operation انجام دهد.

```text
Request → AuthN → AuthZ → Policy → Validation → Service → DB → Audit
```

## 13. AI Authority

```text
AI Suggestion ≠ Database Truth
```

AI پیشنهاد می‌دهد؛ policy engine و انسان در عملیات حساس تصمیم می‌گیرند.

## 14. Production Database

برای Production: PostgreSQL.

SQLite فقط برای local/preview در صورت نیاز.

این تصمیم باید قبل از Phase 2 در migration plan تثبیت شود.

## 15. Definition of Done

هر Entity جدید باید:

- schema
- migration
- seed/fixture
- API contract
- authorization
- validation
- audit
- admin UI
- public UI در صورت نیاز
- SEO در صورت public بودن
- tests

داشته باشد.
