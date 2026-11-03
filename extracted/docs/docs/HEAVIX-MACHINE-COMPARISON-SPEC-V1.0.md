# HEAVIX — سند جامع مقایسه ماشین‌آلات و تجهیزات سنگین
## HEAVIX MACHINE COMPARISON ENGINE — V1.0

### 1. هدف
HEAVIX باید مشخصات چند ماشین/تجهیز را به مقایسه ساختاریافته، مستند و قابل فهم تبدیل کند. سیستم اطلاعات را روشن می‌کند و به‌صورت پیش‌فرض «برنده کلی» اعلام نمی‌کند.

### 2. انواع مقایسه
- مشخصات فنی
- اقتصادی
- عملیاتی
- وضعیت دستگاه
- سازگاری Attachment/Part/Application

### 3. Catalog-first
```text
Brand
→ Model
→ Generation
→ Specification
→ Listings
```
مقایسه مدل با مقایسه آگهی یکسان نیست.

### 4. انتخاب
کاربر بتواند 2 یا چند مورد را انتخاب کند. دستگاه‌های Cross-category باید هشدار ناسازگاری مقایسه دریافت کنند.

### 5. جدول Compare
فیلدهای قابل نمایش:
- Brand
- Model
- Generation
- Weight
- Engine/Power
- Capacity
- Dimensions
- Operating data
- Year
- Hours
- Condition
- Price
- Estimated Range
- Warranty
- Attachments

### 6. حالت Differences Only
دو حالت:
```text
Show all
Show differences only
```

### 7. Unit Normalization
واحدها در UI استاندارد شوند و مقدار اصلی نیز حفظ شود:
```text
Original Value
Normalized Value
Unit
```
مقدار ناموجود با `Not specified` نمایش داده شود، نه صفر.

### 8. Provenance
برای Specification در صورت امکان:
```text
Source
Source Date
Verification Status
```

### 9. Compare Listings
مثلاً:
```text
CAT 320 — 2019 — 7,500 h
CAT 320 — 2020 — 5,200 h
CAT 320 — 2018 — 8,900 h
```
مقایسه قیمت، سال، ساعت، وضعیت، مکان، فروشنده، اسناد، ضمانت، تجهیزات و تخمین HEAVIX.

### 10. اتصال قیمت
در Compare:
```text
Asking Price
HEAVIX Estimated Range
Comparable Market Data
```
نمایش داده شود.

### 11. AI Comparison Assistant
AI می‌تواند تفاوت‌های مستند را خلاصه کند، Missing Data را اعلام کند و بر اساس Catalog/Listing/Price Engine پاسخ دهد. ادعای تست میدانی یا تضمین عملکرد ممنوع است.

نمونه پرسش:
- تفاوت این دو مدل چیست؟
- کدام مشخصات متفاوت است؟
- چه Attachmentهایی سازگارند؟
- تفاوت قیمت آگهی‌ها چیست؟
- چه داده‌ای برای مقایسه ناقص است؟

### 12. امتیازدهی
به‌صورت پیش‌فرض رتبه‌بندی کلی یا «برنده» ارائه نشود. به‌جای آن:
```text
Specification Difference
Cost Difference
Application Difference
Condition Difference
```
نمایش داده شود.

اگر کاربر معیار و وزن مشخصی تعریف کند، محاسبه باید معیارها و داده‌های مبنا را شفاف نشان دهد.

### 13. سناریو محور
```text
Compare for Application
```
برای معدن، راهسازی، حفاری، پروژه شهری، حمل سنگین، کشاورزی و غیره؛ در این حالت ویژگی‌های مرتبط با سناریو برجسته شوند.

### 14. مدل داده
```text
ComparisonSession
ComparisonItem
ComparisonAttribute
ComparisonSnapshot
ComparisonQuestion
```

### 15. ذخیره و اشتراک
- Save
- Rename
- Share
- Export
- Delete

برای Share:
```text
Public Share Token
Expiration
Access Control
```

### 16. Marketplace
دکمه Compare در Search Results، Listing، Product Page، Brand Page و Model Page.

### 17. Admin
مدیریت Attributeهای قابل مقایسه، ترتیب نمایش، Unit Mapping، Mapping مدل‌ها، Duplicate Model Merge، منابع و قواعد AI.

### 18. API پیشنهادی
```text
POST /api/compare
GET /api/compare/:id
POST /api/compare/:id/items
DELETE /api/compare/:id/items/:itemId
GET /api/products/:id/compare-data
GET /api/listings/compare
POST /api/compare/:id/ai-summary
```

### 19. Definition of Done
- [ ] Compare Model
- [ ] Compare Listing
- [ ] Compare 2+ items
- [ ] Attribute normalization
- [ ] Missing data handling
- [ ] Difference-only mode
- [ ] Price integration
- [ ] Source/provenance
- [ ] Saved comparisons
- [ ] Share link
- [ ] AI summary
- [ ] Admin configuration
- [ ] Audit
- [ ] Responsive UI
- [ ] API tests
- [ ] Security tests
