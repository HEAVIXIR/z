# HEAVIX — Data Governance V1

## هدف
یکپارچه‌سازی Taxonomy، Brand، Model، Product، Machine، Listing، Attribute و AI Data بدون duplicate و بدون از دست دادن provenance.

## 1. Canonical Entities

- Category
- Brand
- ProductModel
- Product
- Machine
- Part
- Attachment
- Company
- Listing
- Transaction
- Service
- Location

## 2. Canonicality

هر مفهوم فقط یک canonical record دارد.

Alias و synonym باید به canonical record اشاره کنند.

## 3. Provenance

برای داده‌های استخراجی:

```text
source
sourceReference
confidence
verified
verifiedBy
verifiedAt
```

## 4. Lifecycle

Entity statusها باید استاندارد شوند:

`DRAFT → PENDING_REVIEW → ACTIVE → INACTIVE → ARCHIVED`

## 5. Slug

Slug باید:

- unique
- stable
- SEO-safe
- versioned through redirects when changed

باشد.

## 6. Deletion

Hard delete فقط برای داده‌های غیرقابل استفاده و با policy مشخص.

برای داده‌های business:

`ARCHIVE > DELETE`

## 7. Duplicate Detection

Duplicate keys بر اساس Entity تعریف شوند.

Brand:

- normalized name
- aliases
- country/family

Model:

- brand + normalized model

Product:

- brand + model + product type

Listing:

- seller + product/machine + serial/media/time signals

## 8. Taxonomy Governance

AI پیشنهاد می‌دهد.

Admin/Taxonomy Manager تصویب می‌کند.

هیچ AI agent بدون policy نمی‌تواند taxonomy canonical را مستقیم تغییر دهد.

## 9. Data Quality Metrics

Admin باید این شاخص‌ها را ببیند:

- duplicate rate
- missing required attributes
- unverified brands
- orphan categories
- orphan models
- stale listings
- invalid locations
- AI low-confidence records

## 10. Data Snapshot

هر release باید snapshot داشته باشد:

- categories
- brands
- models
- attributes
- locations
- transaction types
- service types

تا اختلاف بین سند و DB سریع تشخیص داده شود.
