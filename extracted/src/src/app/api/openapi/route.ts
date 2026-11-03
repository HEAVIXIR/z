import { NextResponse } from "next/server";

/* ============================================================
   GET /api/openapi — OpenAPI 3.0 spec for HEAVIX public API.
   ------------------------------------------------------------
   Static spec (no DB hit) covering the public endpoints grouped by
   category: Catalog, Marketplace, Pricing, Compare, Search, Auth,
   Locations. Used by the /api-docs page and any external client
   that wants to introspect the API.

   The spec is hand-maintained (additive only) — when a new public
   endpoint is added, append its entry to the relevant tag group.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-static";

type Param = {
  name: string;
  in: "query" | "path" | "header";
  required?: boolean;
  description: string;
  schema: { type: string; example?: string | number };
};

type Endpoint = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary: string;
  description: string;
  params?: Param[];
  requestBody?: {
    description: string;
    required?: boolean;
    content: Record<string, { schema: Record<string, unknown> }>;
  };
  responses: Record<
    string,
    {
      description: string;
      content?: Record<string, { schema: Record<string, unknown>; example?: unknown }>;
    }
  >;
};

const ENDPOINTS: Endpoint[] = [
  // ── Catalog ────────────────────────────────────────────────
  {
    method: "get",
    path: "/api/taxonomy/tree",
    summary: "درخت تاکسونومی کامل",
    description:
      "برگرداندن درخت کامل دسته‌ها/برندها/خدمات در سه گروه: catalogRoots، marketplaceRoots، serviceRoots. برای منوها و فرم‌های انتخاب استفاده می‌شود.",
    responses: {
      "200": {
        description: "درخت تاکسونومی",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: {
              catalogRoots: [
                {
                  id: "cat_machinery",
                  name: "ماشین‌آلات",
                  slug: "machinery",
                  children: [
                    { id: "cat_excavator", name: "بیل مکانیکی", slug: "excavator" },
                  ],
                },
              ],
              marketplaceRoots: [],
              serviceRoots: [],
            },
          },
        },
      },
    },
  },
  {
    method: "get",
    path: "/api/taxonomy/categories",
    summary: "فهرست دسته‌ها",
    description: "فهرست تمام دسته‌های فعال با امکان صفحه‌بندی و فیلتر parentId.",
    params: [
      { name: "parentId", in: "query", description: "فیلتر بر اساس والد", schema: { type: "string" } },
      { name: "active", in: "query", description: "فقط دسته‌های فعال", schema: { type: "boolean", example: "true" } },
    ],
    responses: {
      "200": {
        description: "فهرست دسته‌ها",
        content: { "application/json": { schema: { type: "object" }, example: { categories: [{ id: "cat_excavator", name: "بیل مکانیکی", slug: "excavator" }] } } },
      },
    },
  },
  {
    method: "get",
    path: "/api/taxonomy/categories/{id}",
    summary: "جزئیات یک دسته",
    description: "برگرداندن یک دسته با id مشخص به‌همراه ویژگی‌های اختصاصی.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه دسته", schema: { type: "string" } }],
    responses: {
      "200": { description: "دسته یافت شد", content: { "application/json": { schema: { type: "object" }, example: { id: "cat_excavator", name: "بیل مکانیکی", slug: "excavator" } } } },
      "404": { description: "دسته یافت نشد" },
    },
  },
  {
    method: "get",
    path: "/api/categories/{id}/attributes",
    summary: "ویژگی‌های یک دسته",
    description: "برگرداندن تمام ویژگی‌های اختصاص‌یافته به یک دسته — شامل گزینه‌ها و تنظیمات سطح لینک.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه دسته", schema: { type: "string" } }],
    responses: {
      "200": {
        description: "ویژگی‌های دسته",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: {
              attributes: [
                { id: "attr_op_weight", key: "operating_weight", labelFa: "وزن عملیاتی", type: "NUMBER", unit: "ton", required: false, options: [] },
              ],
            },
          },
        },
      },
    },
  },
  {
    method: "get",
    path: "/api/taxonomy/brands",
    summary: "فهرست برندها",
    description: "فهرست تمام برندهای فعال با امکان فیلتر بر اساس دسته.",
    params: [{ name: "categoryId", in: "query", description: "فیلتر بر اساس دسته", schema: { type: "string" } }],
    responses: {
      "200": { description: "فهرست برندها", content: { "application/json": { schema: { type: "object" }, example: { brands: [{ id: "br_cat", name: "کاترپیلار", slug: "caterpillar" }] } } } },
    },
  },
  {
    method: "get",
    path: "/api/taxonomy/brands/{id}",
    summary: "جزئیات یک برند",
    description: "برگرداندن یک برند با id مشخص.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه برند", schema: { type: "string" } }],
    responses: {
      "200": { description: "برند یافت شد", content: { "application/json": { schema: { type: "object" }, example: { id: "br_cat", name: "کاترپیلار", slug: "caterpillar", country: "USA" } } } },
      "404": { description: "برند یافت نشد" },
    },
  },
  {
    method: "get",
    path: "/api/taxonomy/brands/{id}/models",
    summary: "مدل‌های یک برند",
    description: "فهرست مدل‌های محصول متعلق به یک برند.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه برند", schema: { type: "string" } }],
    responses: {
      "200": { description: "مدل‌های برند", content: { "application/json": { schema: { type: "object" }, example: { models: [{ id: "m_pc200", name: "PC200", slug: "pc200" }] } } } },
    },
  },
  {
    method: "get",
    path: "/api/brands/search",
    summary: "جستجوی برند (آلیاس‌آگاه)",
    description: "جستجوی برند با نرمال‌سازی فارسی و تطبیق آلیاس. حداقل ۱ کاراکتر.",
    params: [{ name: "q", in: "query", required: true, description: "عبارت جستجو", schema: { type: "string", example: "کاتر" } }],
    responses: {
      "200": {
        description: "نتایج جستجو",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: { brands: [{ id: "br_cat", slug: "caterpillar", name: "کاترپیلار", listingsCount: 12 }] },
          },
        },
      },
    },
  },
  {
    method: "get",
    path: "/api/products",
    summary: "فهرست محصولات",
    description: "فهرست محصولات با فیلتر برند/دسته/مدل.",
    params: [
      { name: "brandId", in: "query", description: "فیلتر برند", schema: { type: "string" } },
      { name: "categoryId", in: "query", description: "فیلتر دسته", schema: { type: "string" } },
    ],
    responses: { "200": { description: "فهرست محصولات", content: { "application/json": { schema: { type: "object" }, example: { products: [] } } } } },
  },
  {
    method: "get",
    path: "/api/products/{slug}",
    summary: "جزئیات محصول",
    description: "برگرداندن یک محصول با slug.",
    params: [{ name: "slug", in: "path", required: true, description: "slug محصول", schema: { type: "string" } }],
    responses: { "200": { description: "محصول یافت شد" }, "404": { description: "محصول یافت نشد" } },
  },
  {
    method: "get",
    path: "/api/articles",
    summary: "فهرست مقالات",
    description: "فهرست مقالات منتشرشده با صفحه‌بندی.",
    responses: { "200": { description: "فهرست مقالات", content: { "application/json": { schema: { type: "object" }, example: { articles: [] } } } } },
  },
  {
    method: "get",
    path: "/api/articles/{slug}",
    summary: "جزئیات مقاله",
    description: "برگرداندن یک مقاله با slug.",
    params: [{ name: "slug", in: "path", required: true, description: "slug مقاله", schema: { type: "string" } }],
    responses: { "200": { description: "مقاله یافت شد" }, "404": { description: "مقاله یافت نشد" } },
  },
  {
    method: "get",
    path: "/api/companies",
    summary: "فهرست شرکت‌ها",
    description: "فهرست شرکت‌های فعال در مارکت‌پلیس.",
    responses: { "200": { description: "فهرست شرکت‌ها", content: { "application/json": { schema: { type: "object" }, example: { companies: [] } } } } },
  },

  // ── Marketplace ────────────────────────────────────────────
  {
    method: "get",
    path: "/api/listings",
    summary: "جستجوی آگهی‌ها",
    description: "جستجوی آگهی‌های منتشرشده با فیلتر متن/دسته/برند/شهر و فیلتر پویای ویژگی‌ها. حداکثر ۲۰ نتیجه در هر درخواست.",
    params: [
      { name: "q", in: "query", description: "متن جستجو (فارسی نرمال‌سازی می‌شود)", schema: { type: "string" } },
      { name: "page", in: "query", description: "شماره صفحه (پیش‌فرض ۱)", schema: { type: "integer", example: 1 } },
      { name: "limit", in: "query", description: "تعداد در هر صفحه (حداکثر ۲۰)", schema: { type: "integer", example: 20 } },
      { name: "category", in: "query", description: "slug دسته", schema: { type: "string" } },
      { name: "brand", in: "query", description: "slug برند", schema: { type: "string" } },
      { name: "city", in: "query", description: "نام شهر", schema: { type: "string" } },
      { name: "attr.KEY", in: "query", description: "فیلتر برابر برای ویژگی KEY", schema: { type: "string" } },
      { name: "attr.KEY_min", in: "query", description: "حداقل مقدار عددی ویژگی KEY", schema: { type: "number" } },
      { name: "attr.KEY_max", in: "query", description: "حداکثر مقدار عددی ویژگی KEY", schema: { type: "number" } },
    ],
    responses: {
      "200": {
        description: "فهرست آگهی‌ها",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: {
              success: true,
              count: 1,
              data: [{ id: "lst_1", slug: "pc200-8", title: "بیل مکانیکی کوماتسو PC200-8", price: "8500000000", brand: { name: "کوماتسو" } }],
            },
          },
        },
      },
    },
  },
  {
    method: "get",
    path: "/api/listings/{id}",
    summary: "جزئیات یک آگهی",
    description: "برگرداندن جزئیات کامل یک آگهی با id. شامل تصاویر، ویژگی‌ها، برند، دسته و آمار بازدید.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه آگهی", schema: { type: "string" } }],
    responses: {
      "200": { description: "آگهی یافت شد", content: { "application/json": { schema: { type: "object" }, example: { id: "lst_1", title: "بیل مکانیکی کوماتسو PC200-8" } } } },
      "404": { description: "آگهی یافت نشد" },
    },
  },
  {
    method: "post",
    path: "/api/listings",
    summary: "ایجاد آگهی جدید",
    description: "ثبت یک آگهی جدید توسط کاربر احراز هویت‌شده. وضعیت اولیه PENDING است تا ادمین تأیید کند.",
    requestBody: {
      description: "اطلاعات آگهی",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, price: { type: "integer" }, categoryId: { type: "string" }, brandId: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "آگهی ایجاد شد", content: { "application/json": { schema: { type: "object" }, example: { ok: true, id: "lst_new" } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },
  {
    method: "get",
    path: "/api/listings/{id}/attributes",
    summary: "ویژگی‌های یک آگهی",
    description: "برگرداندن تمام مقادیر ویژگی‌های ذخیره‌شده برای یک آگهی.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه آگهی", schema: { type: "string" } }],
    responses: { "200": { description: "ویژگی‌های آگهی", content: { "application/json": { schema: { type: "object" }, example: { attributes: [] } } } } },
  },
  {
    method: "post",
    path: "/api/requests",
    summary: "ثبت درخواست خرید",
    description: "ثبت یک درخواست خرید (HEAVIX Wanted) توسط کاربر. پس از تأیید ادمین، در صفحه درخواست‌ها نمایش داده می‌شود.",
    requestBody: {
      description: "اطلاعات درخواست",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, brandPref: { type: "string" }, budgetMin: { type: "integer" }, budgetMax: { type: "integer" }, city: { type: "string" }, province: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "درخواست ثبت شد", content: { "application/json": { schema: { type: "object" }, example: { ok: true, id: "req_1", status: "PENDING" } } } },
      "400": { description: "عنوان الزامی است" },
    },
  },
  {
    method: "get",
    path: "/api/requests",
    summary: "فهرست درخواست‌های خرید",
    description: "فهرست درخواست‌های خرید فعال (فقط ACTIVE) با فیلتر و صفحه‌بندی.",
    params: [
      { name: "q", in: "query", description: "متن جستجو", schema: { type: "string" } },
      { name: "category", in: "query", description: "دسته", schema: { type: "string" } },
      { name: "province", in: "query", description: "استان", schema: { type: "string" } },
      { name: "limit", in: "query", description: "حداکثر ۱۰۰", schema: { type: "integer", example: 30 } },
      { name: "offset", in: "query", description: "صفحه‌بندی", schema: { type: "integer", example: 0 } },
    ],
    responses: {
      "200": {
        description: "فهرست درخواست‌ها",
        content: { "application/json": { schema: { type: "object" }, example: { requests: [{ id: "req_1", title: "نیاز به لودر کوماتسو" }], total: 1 } } },
      },
    },
  },
  {
    method: "get",
    path: "/api/rfq",
    summary: "فهرست RFQ‌ها",
    description: "فهرست درخواست‌های خرید B2B باز یا در حال پیشنهاد.",
    responses: { "200": { description: "فهرست RFQ", content: { "application/json": { schema: { type: "object" }, example: { rfqs: [] } } } } },
  },
  {
    method: "post",
    path: "/api/rfq/{id}/quotes",
    summary: "ثبت پیشنهاد برای RFQ",
    description: "ثبت پیشنهاد قیمت برای یک درخواست خرید B2B. نیاز به احراز هویت کاربر.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه RFQ", schema: { type: "string" } }],
    requestBody: {
      description: "اطلاعات پیشنهاد",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { sellerName: { type: "string" }, sellerPhone: { type: "string" }, unitPrice: { type: "integer" }, totalPrice: { type: "integer" }, deliveryTime: { type: "string" }, notes: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "پیشنهاد ثبت شد", content: { "application/json": { schema: { type: "object" }, example: { success: true, data: { id: "qt_1" } } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },
  {
    method: "get",
    path: "/api/offers",
    summary: "فهرست پیشنهادها",
    description: "فهرست پیشنهادهای فعال روی آگهی‌ها.",
    responses: { "200": { description: "فهرست پیشنهادها", content: { "application/json": { schema: { type: "object" }, example: { offers: [] } } } } },
  },
  {
    method: "get",
    path: "/api/procurement",
    summary: "فهرست مناقصات خرید سازمانی",
    description: "فهرست مناقصات خرید سازمانی منتشرشده (PUBLISHED یا QUOTING) با فیلتر و صفحه‌بندی.",
    params: [
      { name: "status", in: "query", description: "فیلتر وضعیت", schema: { type: "string", example: "PUBLISHED" } },
      { name: "categoryId", in: "query", description: "فیلتر دسته", schema: { type: "string" } },
      { name: "q", in: "query", description: "جستجوی عنوان", schema: { type: "string" } },
      { name: "limit", in: "query", description: "حداکثر ۱۰۰", schema: { type: "integer", example: 30 } },
      { name: "offset", in: "query", description: "صفحه‌بندی", schema: { type: "integer", example: 0 } },
    ],
    responses: {
      "200": {
        description: "فهرست مناقصات",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: { procurements: [{ id: "prc_1", title: "خرید ۵ دستگاه بیل مکانیکی", quantity: 5, budgetMin: "30000000000", budgetMax: "40000000000", status: "PUBLISHED", quoteCount: 2 }], total: 1 },
          },
        },
      },
    },
  },
  {
    method: "post",
    path: "/api/procurement",
    summary: "ایجاد مناقصه خرید سازمانی",
    description: "ثبت یک مناقصه جدید توسط کاربر احراز هویت‌شده. وضعیت اولیه DRAFT.",
    requestBody: {
      description: "اطلاعات مناقصه",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, categoryId: { type: "string" }, brandId: { type: "string" }, quantity: { type: "integer" }, budgetMin: { type: "integer" }, budgetMax: { type: "integer" }, deadline: { type: "string", format: "date-time" }, status: { type: "string", example: "DRAFT" } } } } },
    },
    responses: {
      "200": { description: "مناقصه ایجاد شد", content: { "application/json": { schema: { type: "object" }, example: { ok: true, id: "prc_new" } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },
  {
    method: "get",
    path: "/api/procurement/{id}",
    summary: "جزئیات مناقصه",
    description: "برگرداندن جزئیات کامل یک مناقصه با فهرست پیشنهادهای ثبت‌شده.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه مناقصه", schema: { type: "string" } }],
    responses: {
      "200": { description: "مناقصه یافت شد", content: { "application/json": { schema: { type: "object" }, example: { procurement: { id: "prc_1", title: "خرید ۵ دستگاه بیل مکانیکی" }, quotes: [] } } } },
      "404": { description: "مناقصه یافت نشد" },
    },
  },
  {
    method: "post",
    path: "/api/procurement/{id}/quotes",
    summary: "ثبت پیشنهاد برای مناقصه",
    description: "ثبت پیشنهاد قیمت برای یک مناقصه خرید سازمانی. نیاز به احراز هویت کاربر.",
    params: [{ name: "id", in: "path", required: true, description: "شناسه مناقصه", schema: { type: "string" } }],
    requestBody: {
      description: "اطلاعات پیشنهاد",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { supplierName: { type: "string" }, price: { type: "integer" }, deliveryDays: { type: "integer" }, notes: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "پیشنهاد ثبت شد", content: { "application/json": { schema: { type: "object" }, example: { ok: true, id: "qt_1" } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },

  // ── Pricing ────────────────────────────────────────────────
  {
    method: "get",
    path: "/api/price-intelligence",
    summary: "هوش قیمتی",
    description: "آمار و تاریخچه قیمت + پیشنهاد قیمت + تشخیص پرت. پارامتر action نوع خروجی را تعیین می‌کند: stats | history | suggestions | outliers.",
    params: [
      { name: "action", in: "query", description: "نوع عملیات", schema: { type: "string", example: "stats" } },
      { name: "categoryId", in: "query", description: "فیلتر دسته", schema: { type: "string" } },
      { name: "brandId", in: "query", description: "فیلتر برند", schema: { type: "string" } },
      { name: "productId", in: "query", description: "فیلتر محصول", schema: { type: "string" } },
      { name: "year", in: "query", description: "سال ساخت", schema: { type: "integer" } },
      { name: "months", in: "query", description: "طول بازه تاریخچه (ماه)", schema: { type: "integer", example: 12 } },
    ],
    responses: {
      "200": {
        description: "نتیجه هوش قیمتی",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: { action: "stats", count: 12, min: "5000000000", max: "9000000000", avg: "7200000000", median: "7000000000" },
          },
        },
      },
    },
  },
  {
    method: "get",
    path: "/api/market-heatmap",
    summary: "نقشه حرارتی بازار",
    description: "ماتریس تعداد آگهی‌ها بر اساس دسته × استان.",
    responses: { "200": { description: "ماتریس نقشه حرارتی", content: { "application/json": { schema: { type: "object" }, example: { matrix: [] } } } } },
  },
  {
    method: "get",
    path: "/api/demand",
    summary: "سیگنال‌های تقاضا",
    description: "جستجوهای داغ، دسته‌های پرتقاضا، برندهای ترند.",
    params: [{ name: "action", in: "query", description: "نوع سیگنال", schema: { type: "string", example: "popular" } }],
    responses: { "200": { description: "سیگنال‌های تقاضا", content: { "application/json": { schema: { type: "object" }, example: { signals: [] } } } } },
  },

  // ── Compare ────────────────────────────────────────────────
  {
    method: "get",
    path: "/api/compare",
    summary: "مقایسه آگهی‌ها",
    description: "مقایسه ۲ یا ۳ آگهی با هم. ترتیب نتایج مطابق با ترتیب ids ورودی است.",
    params: [
      { name: "ids", in: "query", required: true, description: "شناسه آگهی‌ها جدا شده با کاما (۲ یا ۳ مورد)", schema: { type: "string", example: "lst_1,lst_2,lst_3" } },
    ],
    responses: {
      "200": { description: "آگهی‌های مقایسه", content: { "application/json": { schema: { type: "object" }, example: { listings: [{ id: "lst_1", title: "بیل مکانیکی" }] } } } },
      "400": { description: "۲ یا ۳ آگهی برای مقایسه وارد کنید" },
    },
  },

  // ── Search ─────────────────────────────────────────────────
  {
    method: "get",
    path: "/api/search",
    summary: "جستجوی یکپارچه",
    description: "جستجوی یکپارچه در آگهی‌ها، برندها و دسته‌ها با یک درخواست. نرمال‌سازی فارسی داخلی است.",
    params: [
      { name: "q", in: "query", required: true, description: "عبارت جستجو", schema: { type: "string", example: "بیل" } },
      { name: "type", in: "query", description: "نوع نتایج: listings | brands | categories | all", schema: { type: "string", example: "all" } },
      { name: "limit", in: "query", description: "حداکثر نتایج در هر بخش (۱..۲۰)", schema: { type: "integer", example: 5 } },
      { name: "category", in: "query", description: "فیلتر دسته (فقط listings)", schema: { type: "string" } },
      { name: "brand", in: "query", description: "فیلتر برند (فقط listings)", schema: { type: "string" } },
    ],
    responses: {
      "200": {
        description: "نتایج جستجو",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: { q: "بیل", results: { listings: [], brands: [], categories: [] } },
          },
        },
      },
    },
  },
  {
    method: "get",
    path: "/api/knowledge-graph",
    summary: "گراف دانش",
    description: "پیمایش گراف دانش: از یک گره (دسته/برند/محصول) به گره‌های مرتبط.",
    params: [
      { name: "nodeId", in: "query", description: "شناسه گره شروع", schema: { type: "string" } },
      { name: "depth", in: "query", description: "عمق پیمایش (۱..۳)", schema: { type: "integer", example: 1 } },
    ],
    responses: { "200": { description: "گراف دانش", content: { "application/json": { schema: { type: "object" }, example: { nodes: [], edges: [] } } } } },
  },
  {
    method: "get",
    path: "/api/hot-searches",
    summary: "جستجوهای داغ",
    description: "فهرست جستجوهای داغ برای نمایش در صفحه اصلی.",
    responses: { "200": { description: "جستجوهای داغ", content: { "application/json": { schema: { type: "object" }, example: { searches: [] } } } } },
  },
  {
    method: "get",
    path: "/api/recommendations",
    summary: "پیشنهادها برای کاربر",
    description: "پیشنهادهای شخصی‌سازی‌شده برای کاربر احراز هویت‌شده بر اساس فعالیت‌اش.",
    responses: {
      "200": { description: "فهرست پیشنهادها", content: { "application/json": { schema: { type: "object" }, example: { recommendations: [] } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },

  // ── Auth ───────────────────────────────────────────────────
  {
    method: "post",
    path: "/api/auth/register",
    summary: "ثبت‌نام کاربر",
    description: "ثبت‌نام کاربر جدید با موبایل یا ایمیل + رمز عبور.",
    requestBody: {
      description: "اطلاعات ثبت‌نام",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { mobile: { type: "string" }, email: { type: "string" }, password: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "ثبت‌نام موفق", content: { "application/json": { schema: { type: "object" }, example: { ok: true, userId: "usr_1" } } } },
      "400": { description: "اطلاعات نامعتبر" },
      "429": { description: "درخواست بیش از حد" },
    },
  },
  {
    method: "post",
    path: "/api/auth/login",
    summary: "ورود",
    description: "ورود کاربر یا ادمین. بدنه می‌تواند شامل username/password (ادمین)، mobile/password یا email/password (کاربر) باشد. دارای محدودیت نرخ.",
    requestBody: {
      description: "اطلاعات ورود",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { username: { type: "string" }, mobile: { type: "string" }, email: { type: "string" }, password: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "ورود موفق", content: { "application/json": { schema: { type: "object" }, example: { ok: true } } } },
      "401": { description: "اطلاعات نامعتبر" },
      "429": { description: "درخواست بیش از حد" },
    },
  },
  {
    method: "post",
    path: "/api/auth/logout",
    summary: "خروج",
    description: "خروج کاربر یا ادمین و حذف نشست.",
    responses: { "200": { description: "خروج موفق", content: { "application/json": { schema: { type: "object" }, example: { ok: true } } } } },
  },
  {
    method: "get",
    path: "/api/auth/me",
    summary: "کاربر فعلی",
    description: "برگرداندن اطلاعات کاربر احراز هویت‌شده.",
    responses: {
      "200": { description: "اطلاعات کاربر", content: { "application/json": { schema: { type: "object" }, example: { id: "usr_1", mobile: "0912..." } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },
  {
    method: "post",
    path: "/api/auth/verify-email",
    summary: "تأیید ایمیل",
    description: "تأیید کد ایمیل فعال‌سازی حساب.",
    requestBody: {
      description: "کد تأیید",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { code: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "ایمیل تأیید شد", content: { "application/json": { schema: { type: "object" }, example: { ok: true } } } },
      "400": { description: "کد نامعتبر" },
    },
  },

  // ── Locations ──────────────────────────────────────────────
  {
    method: "get",
    path: "/api/locations",
    summary: "فهرست مکان‌ها",
    description: "فهرست کشورها / استان‌ها / شهرها به‌صورت آبشاری. بدون پارامتر → کشورها؛ با country → استان‌ها؛ با province → شهرها.",
    params: [
      { name: "country", in: "query", description: "کد یا شناسه کشور (برای فهرست استان‌ها)", schema: { type: "string", example: "IR" } },
      { name: "province", in: "query", description: "شناسه استان (برای فهرست شهرها)", schema: { type: "string" } },
    ],
    responses: {
      "200": {
        description: "فهرست مکان‌ها",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: { countries: [{ id: "ir", name: "ایران", code: "IR" }] },
          },
        },
      },
    },
  },
  {
    method: "post",
    path: "/api/locations",
    summary: "ایجاد مکان (ادمین)",
    description: "ایجاد کشور/استان/شهر جدید. نیاز به دسترسی ادمین.",
    requestBody: {
      description: "اطلاعات مکان",
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { level: { type: "string", example: "country" }, name: { type: "string" }, countryId: { type: "string" }, provinceId: { type: "string" } } } } },
    },
    responses: {
      "200": { description: "مکان ایجاد شد", content: { "application/json": { schema: { type: "object" }, example: { ok: true, country: { id: "ir", name: "ایران" } } } } },
      "401": { description: "احراز هویت نشده" },
    },
  },
];

const TAGS = [
  { name: "Catalog", description: "تاکسونومی، دسته‌ها، برندها، محصولات، مقالات، شرکت‌ها" },
  { name: "Marketplace", description: "آگهی‌ها، درخواست‌های خرید، RFQ، پیشنهادها، خرید سازمانی" },
  { name: "Pricing", description: "هوش قیمتی، نقشه حرارتی بازار، سیگنال‌های تقاضا" },
  { name: "Compare", description: "مقایسه آگهی‌ها" },
  { name: "Search", description: "جستجوی یکپارچه، گراف دانش، جستجوهای داغ، پیشنهادها" },
  { name: "Auth", description: "احراز هویت، ثبت‌نام، ورود، خروج، تأیید ایمیل" },
  { name: "Locations", description: "کشورها، استان‌ها، شهرها" },
];

function tagForPath(path: string): string {
  if (path.startsWith("/api/taxonomy") || path.startsWith("/api/brands") || path.startsWith("/api/products") || path.startsWith("/api/articles") || path.startsWith("/api/companies") || path.startsWith("/api/categories")) return "Catalog";
  if (path.startsWith("/api/listings") || path.startsWith("/api/requests") || path.startsWith("/api/rfq") || path.startsWith("/api/offers") || path.startsWith("/api/procurement")) return "Marketplace";
  if (path.startsWith("/api/price-intelligence") || path.startsWith("/api/market-heatmap") || path.startsWith("/api/demand")) return "Pricing";
  if (path.startsWith("/api/compare")) return "Compare";
  if (path.startsWith("/api/search") || path.startsWith("/api/knowledge-graph") || path.startsWith("/api/hot-searches") || path.startsWith("/api/recommendations")) return "Search";
  if (path.startsWith("/api/auth")) return "Auth";
  if (path.startsWith("/api/locations")) return "Locations";
  return "Catalog";
}

function buildSpec() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of ENDPOINTS) {
    if (!paths[e.path]) paths[e.path] = {};
    paths[e.path][e.method] = {
      tags: [tagForPath(e.path)],
      summary: e.summary,
      description: e.description,
      parameters: e.params ?? [],
      ...(e.requestBody ? { requestBody: e.requestBody } : {}),
      responses: e.responses,
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "HEAVIX Public API",
      version: "1.0.0",
      description:
        "API عمومی مارکت‌پلیس ماشین‌آلات سنگین هویکس — جستجو، کاتالوگ، قیمت‌گذاری، مقایسه و احراز هویت. تمام درخواست‌ها با مسیرهای نسبی روی همان دامنه‌ی سایت ارسال می‌شوند.",
      contact: { name: "HEAVIX Support", email: "support@heavix.ir", url: "https://heavix.ir" },
    },
    servers: [{ url: "/", description: "Same-origin (relative)" }],
    tags: TAGS,
    paths,
  };
}

export async function GET() {
  return NextResponse.json(buildSpec(), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
