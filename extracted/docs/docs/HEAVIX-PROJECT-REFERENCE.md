# اسناد قطعی پروژه HEAVIX

این فایل مرجع قطعی پروژه است. **هیچ‌گاه بدون مجوز صریح کاربر تغییری داده نشود.**

## فهرست اسناد

۱. **HEAVIX BRAND REGISTRY (HBR-1.0)** — سند جامع برند، موجودیت مستقل، Alias Engine، Brand Family، Brand Graph، Brand DNA، ۲۰ قانون طلایی، ۳۹ حوزه صنعتی، Master Seed برندها.

۲. **HEAVIX TAXONOMY & MARKET STRUCTURE (V1.1)** — تفکیک Category ≠ Transaction ≠ Service، ۱۴ محور اصلی، Transaction Layer، Service Layer، Attribute Engine، Industry مستقل، Location مستقل، ۳۱ قانون.

۳. **HEAVIX MACHINE TAXONOMY (V1.0)** — طبقه‌بندی سه‌نسلی ماشین‌آلات: ۱۶ گروه L1 → خانواده‌های L2 → انواع L3. **این سند مرجع قطعی طبقه‌بندی ماشین‌آلات است.**

۴. **HEAVIX ATTRIBUTE CATALOG (V1.0)** — سه لایه ویژگی (Global/Domain/Category)، ۲۲ نوع داده، استاندارد واحدها، Provenance، Progressive Disclosure، ۳۰ دامنه ویژگی.

## قوانین آمره پروژه

- **Brand یک Entity مستقل است؛ Category نیست.** (HBR-1.0 قانون ۱)
- **Category ≠ Transaction ≠ Service.** اجاره/مزایده/درخواست دسته نیستند — Transaction هستند. (Taxonomy V1.1 §18)
- **ماشین‌آلات سه‌نسلی است:** ۱۶ گروه L1 → خانواده L2 → تیپ L3. (Machine Taxonomy V1.0)
- **Brand و Model نسل چهارم نیستند** — موجودیت مستقل‌اند. (Machine Taxonomy V1.0 §1)
- **Industry جدا از Category است.** معدن/راهسازی/ساختمان Application/Industry هستند نه Category. (Taxonomy V1.1 §17)
- **هیچ Brand در فرم‌ها Hard-code نشود.** همه از Brand Registry بیاید. (HBR-1.0 قانون ۹)
- **AI پیشنهاد می‌دهد؛ Admin تصویب می‌کند.** AI مستقیماً دیتابیس را تغییر نمی‌دهد. (HBR-1.0 قانون ۸)
- **هر چیزی که اضافه می‌شود باید در پنل مدیریت قابل ویرایش باشد.** (اصل همیشگی پروژه)
- **Taxonomy زنده و قابل تکامل است** — Database-driven، Admin-managed، AI-assisted. (Taxonomy V1.1 §27)

## ساختار منوی سایت (مصوب)

منوی اصلی فقط شامل:
- **دسته‌بندی** (dropdown شامل همه والدهای کاتالوگ: ۱۶ گروه ماشین‌آلات + خودرو + قطعات + متعلقات + مواد معدنی + تجهیزات صنعتی + کشاورزی + سایر)
- **فروشگاه** (بازار حرفه‌ای — در حال توسعه)

اجاره، مزایده، درخواست، خدمات — همگی Transaction یا داخل دسته‌بندی قرار می‌گیرند، نه در منوی اصلی.

## وضعیت فعلی داده‌ها

- **دسته‌بندی ماشین‌آلات:** ۱۶ گروه L1، ۱۷۴ خانواده L2، ۹۷ تیپ L3 (مطابق Machine Taxonomy V1.0)
- **برندها:** ~۶۲۹ برند canonical با alias، خانواده، صنایع
- **صنایع کاربرد:** ۱۶ صنعت
- **انواع معامله:** ۶ (SALE/RENT/WANTED/QUOTE/AUCTION/SERVICE_REQUEST)
- **انواع خدمت:** ۹
- **مکان‌ها:** ایران + ۳۱ استان + ۱۷۹ شهر
- **ویژگی‌ها:** ~۴۰۵ AttributeDefinition با Provenance
