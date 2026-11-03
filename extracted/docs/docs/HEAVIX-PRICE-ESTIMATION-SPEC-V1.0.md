# HEAVIX — سند جامع تخمین و ارزش‌گذاری قیمت ماشین‌آلات و تجهیزات سنگین
## HEAVIX PRICE ESTIMATION & VALUATION — V1.0

### 1. هدف
HEAVIX باید برای ماشین‌آلات سنگین، تجهیزات صنعتی، خودروهای صنعتی و قطعات، «برآورد قیمت داده‌محور» ارائه کند؛ نه قیمت قطعی بازار.

### 2. انواع قیمت
- Asking Price: قیمت اعلام‌شده فروشنده
- Estimated Market Price: قیمت تخمینی HEAVIX
- Price Range: بازه تخمینی
- Comparable Price: قیمت موارد مشابه
- Dealer/Replacement Price: قیمت نمایندگی/جایگزینی در صورت وجود
- Rental Rate: نرخ اجاره
- Auction Result: نتیجه مزایده
- Last Known Price: آخرین قیمت معتبر مشاهده‌شده

این مفاهیم نباید با یکدیگر مخلوط شوند.

### 3. ورودی‌های اصلی
**هویت:** Category, Family, Type, Brand, Model, Generation, Year

**فنی:** Condition, Working Hours, Maintenance, Overhaul, Engine, Transmission, Hydraulic, Tires/Undercarriage, Defects

**تجاری:** Seller Type, Location, Availability, Documents, Warranty, Financing, Delivery, Attachments

**بازار:** Currency, Market, Observation Date, Supply, Demand, Seasonality, Replacement Cost

### 4. معماری موتور قیمت
```text
Raw Market Data
→ Data Cleaning
→ Comparable Selection
→ Feature Normalization
→ Price Estimation
→ Confidence / Data Quality
→ Explanation
```

خروجی:
```text
Estimated Price
Lower Bound
Upper Bound
Confidence
Data Freshness
Comparable Count
Main Price Drivers
Warnings
```

### 5. روش‌های محاسبه
**Comparable Based:** مقایسه برند، مدل، سال، ساعت کار، وضعیت، محل و تجهیزات.

**Weighted Comparable:** وزن‌دهی به شباهت‌ها. وزن‌های اولیه باید با داده واقعی HEAVIX اعتبارسنجی شوند و به‌عنوان وزن نهایی تلقی نشوند.

**Statistical / ML:** پس از جمع‌آوری داده کافی، مدل‌های Regression، Gradient Boosting و Quantile Regression می‌توانند استفاده شوند.

### 6. نرمال‌سازی
```text
Price
→ Currency
→ Unit
→ Date
→ Condition
→ Location
→ Included Equipment
```
قیمت اصلی و مقدار نرمال‌شده هر دو حفظ شوند.

### 7. تشخیص داده پرت
مواردی مانند قیمت غیرعادی، آگهی تکراری، منقضی، واحد/ارز نامشخص و مشخصات ناسازگار باید Flag شوند. داده حذف‌شده باید قابل Audit باشد.

### 8. Confidence
سطوح:
- High Confidence
- Medium Confidence
- Low Confidence
- Insufficient Data

Confidence بر اساس تعداد و شباهت Comparableها، تازگی و کامل بودن داده، پراکندگی قیمت و کیفیت منبع تعیین شود؛ نباید به‌عنوان «دقت قطعی» معرفی شود.

### 9. خروجی UI
```text
تخمین قیمت HEAVIX
بازه: X تا Y
قیمت میانی: Z
اطمینان: متوسط
بر اساس: N مورد مشابه
```
همراه با عوامل مؤثر و هشدارها.

متن حقوقی پیشنهادی:
> این عدد برآورد داده‌محور است و جایگزین کارشناسی حضوری یا توافق معامله نیست.

### 10. Price Health
مقایسه Asking Price با Estimated Range:
- داخل بازه تخمینی
- پایین‌تر از بازه
- بالاتر از بازه
- داده ناکافی

از برچسب‌های «گران/ارزان» به‌عنوان حکم قطعی استفاده نشود.

### 11. Price History
برای مدل‌ها در صورت داده کافی:
- Median
- Range
- Observation Volume
- Change over time
با تاریخ و بازار مشخص.

### 12. AI
AI می‌تواند مشخصات ناقص را استخراج کند، Comparable پیدا کند، تناقض‌ها و Outlierها را Flag کند و توضیح تولید کند؛ اما بدون داده و منبع، قیمت اختراعی تولید نکند.

### 13. Admin
مدیریت منابع، نسخه مدل، وزن‌ها، Thresholdها، Review، Override و گزارش خطا. هر Override باید User/Time/Reason/Before/After داشته باشد.

### 14. Data Governance
هر مشاهده قیمت:
```text
source
sourceType
observedAt
market
currency
unit
originalValue
normalizedValue
quality
status
```

### 15. API پیشنهادی
```text
GET  /api/pricing/estimate/:listingId
POST /api/pricing/estimate
GET  /api/pricing/comparables/:listingId
GET  /api/pricing/history/:productModelId
POST /api/admin/pricing/review
POST /api/admin/pricing/override
```

### 16. مدل داده پیشنهادی
```text
PriceObservation
PriceEstimate
PriceComparable
PriceAdjustment
PriceModelVersion
PriceReview
PriceOverride
```

### 17. Definition of Done
- [ ] تفکیک Asking و Estimated
- [ ] Comparable Engine
- [ ] Currency/Unit normalization
- [ ] Confidence
- [ ] Data freshness
- [ ] Price history
- [ ] Audit برای Override
- [ ] جلوگیری از قیمت‌سازی بدون منبع
- [ ] مدیریت Admin
- [ ] API و UI مستند
