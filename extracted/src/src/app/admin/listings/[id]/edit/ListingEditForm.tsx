"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Save,
  Loader2,
  Trash2,
  Star,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Search,
  Film,
} from "lucide-react";
import AttributeFields, {
  buildAttributePayload,
  type AttributeDef,
  type AttributeValue,
} from "@/components/listings/AttributeFields";
import MediaUploader from "@/components/admin/MediaUploader";
import LocationPicker, {
  type LocationValue,
} from "@/components/listings/LocationPicker";

/* ============================================================
   ListingEditForm — full-featured listing editor.

   Mode "admin": PATCH /api/admin/listings/[id] (admin auth)
   Mode "seller": PATCH /api/listings/[id] (ownership-checked)

   Features:
     • Title / shortDesc / description
     • Category select (CATALOG layer)
     • Brand typeahead (alias-aware search)
     • Model select (filtered by brand)
     • Price + priceType + currency (Toman fixed for V1)
     • Transaction type (SALE/RENT/...) from /api/transaction-types
     • Province + City cascading from /api/locations
     • Image manager (URL add + upload + set primary + remove + reorder)
     • Dynamic attribute fields per category
     • Status select (DRAFT/PUBLISHED/PENDING/REJECTED/SOLD)
     • Featured / verified toggles
     • "تمدید آگهی" (extend) — sets publishedAt = now
   ============================================================ */

export type InitialListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDesc: string;
  price: string;
  priceType: string;
  listingType: string;
  condition: string;
  province: string;
  city: string;
  year: number | null;
  workingHours: number | null;
  status: string;
  featured: boolean;
  verified: boolean;
  showInLatest: boolean;
  sellerPhone: string;
  sellerName: string;
  adminNotes: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  modelId: string;
  publishedAt: string | null;
  expiresAt: string | null;
  // P1-5/6 — canonical Location + Transaction normalization (additive)
  transactionTypeId: string;
  countryId: string;
  provinceId: string;
  cityId: string;
  productId: string;
  productCanonicalName: string;
  images: {
    id: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  attributeValues: {
    attributeId: string;
    key: string | null;
    type: string;
    textValue: string | null;
    numberValue: number | null;
    booleanValue: boolean | null;
    dateValue: string | null;
    optionId: string | null;
    unit: string | null;
  }[];
};

type CategoryOption = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  level?: number;
};

type TransactionType = {
  id: string;
  key: string;
  nameFa: string;
  nameEn?: string | null;
  icon?: string | null;
};

type ProvinceOption = { id: string; name: string };
type CityOption = { id: string; name: string; provinceId: string };

type BrandSuggestion = {
  id: string;
  name: string;
  nameEn?: string | null;
  slug?: string;
};

type ModelOption = { id: string; name: string; nameEn?: string | null };

type ProductOption = { id: string; canonicalName: string; slug: string };

const PRICE_TYPES: Record<string, string> = {
  NEGOTIABLE: "توافقی",
  FIXED: "مقطوع",
  CALL_FOR_PRICE: "تماس بگیرید",
  AUCTION: "مزایده",
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "PENDING", label: "در انتظار تأیید" },
  { value: "PUBLISHED", label: "منتشرشده" },
  { value: "REJECTED", label: "ردشده" },
  { value: "SOLD", label: "فروخته‌شده" },
  { value: "PAUSED", label: "متوقفشده" },
];

const CONDITIONS: Record<string, string> = {
  NEW: "نو",
  USED: "کارکرده",
  REFURBISHED: "بازسازی‌شده",
  FOR_PARTS: "قطعات",
};

export default function ListingEditForm({
  initial,
  mode,
}: {
  initial: InitialListing;
  mode: "admin" | "seller";
}) {
  const isAdmin = mode === "admin";
  const apiBase = isAdmin
    ? `/api/admin/listings/${initial.id}`
    : `/api/listings/${initial.id}`;

  // ── Form state ──
  const [title, setTitle] = useState(initial.title);
  const [shortDesc, setShortDesc] = useState(initial.shortDesc);
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState(initial.price);
  const [priceType, setPriceType] = useState(initial.priceType);
  const [listingType, setListingType] = useState(initial.listingType);
  const [condition, setCondition] = useState(initial.condition);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [verified, setVerified] = useState(initial.verified);
  const [showInLatest, setShowInLatest] = useState(initial.showInLatest);
  const [year, setYear] = useState<string>(initial.year ? String(initial.year) : "");
  const [workingHours, setWorkingHours] = useState<string>(
    initial.workingHours ? String(initial.workingHours) : "",
  );
  const [sellerPhone, setSellerPhone] = useState(initial.sellerPhone);
  const [sellerName, setSellerName] = useState(initial.sellerName);
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes);

  // ── Category ──
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState(initial.categoryId);

  // ── Brand typeahead ──
  const [brandId, setBrandId] = useState(initial.brandId);
  const [brandQuery, setBrandQuery] = useState(initial.brandName);
  const [brandResults, setBrandResults] = useState<BrandSuggestion[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const brandWrapRef = useRef<HTMLDivElement>(null);

  // ── Model ──
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelId, setModelId] = useState(initial.modelId);

  // ── Transaction types ──
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);

  // ── Locations (legacy string fields) ──
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [province, setProvince] = useState(initial.province);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [city, setCity] = useState(initial.city);

  // P1-5/6 — Canonical Location (IDs) + Transaction + Product link
  const [transactionTypeId, setTransactionTypeId] = useState(initial.transactionTypeId);
  const [locationValue, setLocationValue] = useState<LocationValue>({
    countryId: initial.countryId,
    provinceId: initial.provinceId,
    cityId: initial.cityId,
  });
  const [productId, setProductId] = useState(initial.productId);
  const [productQuery, setProductQuery] = useState(initial.productCanonicalName);
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const productWrapRef = useRef<HTMLDivElement>(null);

  // ── Images ──
  const [images, setImages] = useState(initial.images);
  const [uploading, setUploading] = useState(false);

  // ── Attributes ──
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue>({});

  // ── Submit state ──
  const [saving, setSaving] = useState(false);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Bootstrap: load taxonomy, transaction types, locations ──
  useEffect(() => {
    (async () => {
      try {
        const [catRes, txRes, locRes] = await Promise.all([
          fetch("/api/taxonomy/categories?layer=CATALOG", { cache: "no-store" }),
          fetch("/api/transaction-types", { cache: "no-store" }),
          fetch("/api/locations?country=IR", { cache: "no-store" }),
        ]);
        const catJson = await catRes.json();
        const flat: CategoryOption[] = (catJson.flat ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: c.parentId,
          level: c.level,
        }));
        setCategories(flat);

        const txJson = await txRes.json();
        setTransactionTypes(txJson.types ?? []);

        const locJson = await locRes.json();
        setProvinces(locJson.provinces ?? []);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  // ── Brand typeahead (debounced, alias-aware) ──
  useEffect(() => {
    const q = brandQuery.trim();
    if (!q || q === initial.brandName) {
      setBrandResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/brands/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setBrandResults(data.brands ?? []);
        setBrandOpen(true);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [brandQuery]);

  // ── Close brand dropdown on outside click ──
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (brandWrapRef.current && !brandWrapRef.current.contains(e.target as Node)) {
        setBrandOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ── P1-5/6: Product typeahead (debounced) ──
  useEffect(() => {
    const q = productQuery.trim();
    if (!q || q === initial.productCanonicalName) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=20`);
        const data = await res.json();
        setProductResults(data.products ?? []);
        setProductOpen(true);
      } catch {
        setProductResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery, initial.productCanonicalName]);

  // ── Close product dropdown on outside click ──
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (productWrapRef.current && !productWrapRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickBrand = (b: BrandSuggestion) => {
    setBrandId(b.id);
    setBrandQuery(b.name);
    setBrandOpen(false);
    setModelId("");
    setModels([]);
  };

  const pickProduct = (p: ProductOption) => {
    setProductId(p.id);
    setProductQuery(p.canonicalName);
    setProductOpen(false);
  };

  const clearProduct = () => {
    setProductId("");
    setProductQuery("");
    setProductResults([]);
  };

  // ── Fetch models when brand changes (incl. initial load) ──
  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const url = `/api/taxonomy/brands/${brandId}/models${
          categoryId ? `?categoryId=${categoryId}` : ""
        }`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (alive) setModels(data.data ?? []);
      } catch {
        if (alive) setModels([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId, categoryId]);

  // ── Fetch cities when province changes ──
  const loadCities = useCallback(async (provinceName: string) => {
    if (!provinceName) {
      setCities([]);
      return;
    }
    try {
      const res = await fetch(`/api/locations?province=${encodeURIComponent(provinceName)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setCities(data.cities ?? []);
    } catch {
      setCities([]);
    }
  }, []);

  useEffect(() => {
    if (province) loadCities(province);
  }, [province, loadCities]);

  // ── Initialize attribute values from initial data ──
  // Build a key->value map keyed by attribute.key (fallback id).
  useEffect(() => {
    const map: AttributeValue = {};
    for (const av of initial.attributeValues) {
      const k = av.key ?? av.attributeId;
      if (av.type === "BOOLEAN") {
        map[k] = av.booleanValue ?? false;
      } else if (av.type === "SELECT" || av.type === "MULTI_SELECT") {
        if (av.type === "MULTI_SELECT") {
          map[k] = av.textValue ? av.textValue.split(",") : [];
        } else {
          map[k] = av.optionId ?? "";
        }
      } else if (av.type === "RANGE") {
        map[k] = av.textValue ?? "";
      } else if (
        av.type === "INTEGER" ||
        av.type === "DECIMAL" ||
        av.type === "NUMBER" ||
        av.type === "CURRENCY" ||
        av.type === "UNIT" ||
        av.type === "SIZE" ||
        av.type === "WEIGHT" ||
        av.type === "YEAR"
      ) {
        map[k] = av.numberValue ?? "";
      } else if (av.type === "DATE" || av.type === "DATETIME") {
        map[k] = av.dateValue ?? "";
      } else {
        map[k] = av.textValue ?? "";
      }
    }
    setAttributeValues(map);
  }, []);

  // ── Image management ──
  // addImageByUrl takes any image URL (either uploaded via MediaUploader
  // or pasted by the user) and attaches it to the listing through the
  // PATCH addImages action.
  const addImageByUrl = async (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addImages: [{ url }] }),
      });
      const d = await res.json();
      if (d.ok || d.success) {
        setImages(d.listing?.images ?? [...images, { id: `tmp-${Date.now()}`, url, alt: null, isPrimary: images.length === 0, sortOrder: images.length }]);
      } else {
        setError(d.error ?? "خطا در افزودن تصویر");
      }
    } catch {
      setError("خطای شبکه");
    }
    setUploading(false);
  };

  const setPrimary = async (imgId: string) => {
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setPrimaryImage: imgId }),
      });
      const d = await res.json();
      if (d.ok || d.success) {
        setImages(d.listing?.images ?? images.map((i) => ({ ...i, isPrimary: i.id === imgId })));
      }
    } catch {
      setError("خطای شبکه");
    }
  };

  const removeImage = async (imgId: string) => {
    if (!confirm("حذف این تصویر؟")) return;
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeImages: [imgId] }),
      });
      const d = await res.json();
      if (d.ok || d.success) {
        setImages(d.listing?.images ?? images.filter((i) => i.id !== imgId));
      }
    } catch {
      setError("خطای شبکه");
    }
  };

  const moveImage = async (imgId: string, dir: -1 | 1) => {
    const idx = images.findIndex((i) => i.id === imgId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= images.length) return;
    const reordered = [...images];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const newImages = reordered.map((i, n) => ({ ...i, sortOrder: n }));
    setImages(newImages);
    try {
      await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorderImages: newImages.map((i) => i.id) }),
      });
    } catch {
      /* non-fatal */
    }
  };

  // ── Save ──
  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        title: title.trim(),
        shortDesc: shortDesc.trim() || null,
        description: description.trim() || null,
        price: price ? String(price) : null,
        priceType,
        listingType,
        condition: condition || null,
        province: province || null,
        city: city || null,
        year: year ? Number(year) : null,
        workingHours: workingHours ? Number(workingHours) : null,
        status,
        featured,
        verified,
        showInLatest,
        sellerPhone: sellerPhone || null,
        sellerName: sellerName || null,
        brandId: brandId || null,
        categoryId: categoryId || null,
        modelId: modelId || null,
        // P1-5/6 — canonical Location + Transaction + Product (additive)
        transactionTypeId: transactionTypeId || null,
        countryId: locationValue.countryId || null,
        provinceId: locationValue.provinceId || null,
        cityId: locationValue.cityId || null,
        productId: productId || null,
      };
      if (isAdmin) {
        payload.adminNotes = adminNotes || null;
      }
      // Build attribute payload from current defs + values.
      if (attributeDefs.length > 0) {
        payload.attributeValues = buildAttributePayload(attributeDefs, attributeValues);
      }

      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok || d.success) {
        setSuccess("تغییرات با موفقیت ذخیره شد.");
        // Scroll to top to show success message.
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(d.error ?? "خطا در ذخیره.");
      }
    } catch {
      setError("خطای شبکه هنگام ذخیره.");
    }
    setSaving(false);
  };

  // ── Extend (renew) ──
  const extend = async () => {
    setExtending(true);
    setError(null);
    setSuccess(null);
    try {
      const url = isAdmin
        ? `${apiBase}?action=extend`
        : `${apiBase}?action=extend`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend" }),
      });
      const d = await res.json();
      if (d.ok || d.success) {
        setSuccess("آگهی با موفقیت تمدید شد (۳۰ روز).");
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(d.error ?? "خطا در تمدید آگهی.");
      }
    } catch {
      setError("خطای شبکه هنگام تمدید.");
    }
    setExtending(false);
  };

  // ── UI helpers ──
  const inputCls =
    "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220] focus:bg-white";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={isAdmin ? "/admin/listings" : "/dashboard"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
            title="بازگشت"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-zinc-900">
              {isAdmin ? "ویرایش آگهی" : "ویرایش آگهی من"}
            </h1>
            <p className="text-xs text-zinc-500" dir="ltr">
              {initial.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/listings/${initial.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition hover:border-[#F58220] hover:text-[#F58220]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> مشاهده در سایت
          </Link>
          <button
            onClick={extend}
            disabled={extending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {extending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            تمدید آگهی
          </button>
          <a
            href={`/admin/reels?listing=${listing.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100"
          >
            <Film className="h-3.5 w-3.5" />
            ساخت ریلز
          </a>
        </div>
      </div>

      {/* Status banners */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic info */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">اطلاعات اصلی</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>عنوان آگهی *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="عنوان کامل آگهی..."
                />
              </div>
              <div>
                <label className={labelCls}>خلاصه (کوتاه)</label>
                <input
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className={inputCls}
                  placeholder="خلاصه یک‌خطی..."
                />
              </div>
              <div>
                <label className={labelCls}>توضیحات کامل</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]"
                  placeholder="توضیحات کامل دستگاه..."
                />
              </div>
            </div>
          </section>

          {/* Taxonomy */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">دسته‌بندی و برند</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>دسته‌بندی</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— انتخاب کنید —</option>
                  {rootCategories.map((c) => (
                    <optgroup key={c.id} label={c.name}>
                      <option value={c.id}>{c.name} (ریشه)</option>
                      {categories
                        .filter((ch) => ch.parentId === c.id)
                        .map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {c.name} › {ch.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Brand typeahead */}
              <div ref={brandWrapRef} className="relative">
                <label className={labelCls}>برند</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={brandQuery}
                    onChange={(e) => {
                      setBrandQuery(e.target.value);
                      if (!e.target.value.trim()) setBrandId("");
                    }}
                    onFocus={() => brandResults.length > 0 && setBrandOpen(true)}
                    className={`${inputCls} pr-9`}
                    placeholder="جستجوی برند..."
                    dir="rtl"
                  />
                </div>
                {brandOpen && brandResults.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
                    {brandResults.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => pickBrand(b)}
                        className="flex w-full items-center justify-between px-3 py-2 text-right text-sm transition hover:bg-[#F58220]/5"
                      >
                        <span className="font-bold text-zinc-800">{b.name}</span>
                        {b.nameEn && (
                          <span className="text-[10px] text-zinc-400" dir="ltr">
                            {b.nameEn}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model */}
              <div>
                <label className={labelCls}>مدل (اختیاری)</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className={inputCls}
                  disabled={!brandId || models.length === 0}
                >
                  <option value="">—</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.nameEn ? ` (${m.nameEn})` : ""}
                    </option>
                  ))}
                </select>
                {brandId && models.length === 0 && (
                  <p className="mt-1 text-[10px] text-zinc-400">مدلی برای این برند ثبت نشده.</p>
                )}
              </div>
            </div>
          </section>

          {/* Price + transaction */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">قیمت و معامله</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>قیمت (تومان)</label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                  className={inputCls}
                  dir="ltr"
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>نوع قیمت</label>
                <select
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value)}
                  className={inputCls}
                >
                  {Object.entries(PRICE_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>نوع معامله (legacy)</label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className={inputCls}
                >
                  {transactionTypes.length > 0 ? (
                    transactionTypes.map((t) => (
                      <option key={t.id} value={t.key}>
                        {t.nameFa}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="SALE">فروش</option>
                      <option value="RENT">اجاره</option>
                      <option value="SALE_AND_RENT">فروش و اجاره</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  نوع معامله (Canonical) — TransactionType
                </label>
                <select
                  value={transactionTypeId}
                  onChange={(e) => setTransactionTypeId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— انتخاب کنید —</option>
                  {transactionTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameFa}
                      {t.nameEn ? ` (${t.nameEn})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-zinc-400">
                  فیلد Canonical جدید — رابطه رسمی با جدول TransactionType (P1-6).
                </p>
              </div>
              <div>
                <label className={labelCls}>حالت دستگاه</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {Object.entries(CONDITIONS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>سال ساخت</label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ""))}
                  className={inputCls}
                  dir="ltr"
                  placeholder="مثلاً ۱۴۰۲"
                />
              </div>
              <div>
                <label className={labelCls}>ساعت کارکرد</label>
                <input
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value.replace(/[^\d]/g, ""))}
                  className={inputCls}
                  dir="ltr"
                  placeholder="مثلاً ۳۵۰۰"
                />
              </div>
            </div>
          </section>

          {/* Location (legacy string fields — kept for backward compat during P1-5 migration) */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-black text-zinc-900">موقعیت (legacy string)</h2>
            <p className="mb-4 text-[10px] text-zinc-400">
              فیلدهای رشته‌ای قدیمی — در طول مهاجرت به Location Canonical حفظ شده‌اند.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>استان</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {provinces.length === 0 && (
                  <p className="mt-1 text-[10px] text-zinc-400">
                    استانی بارگذاری نشده — می‌توانید نام استان را به‌صورت دستی وارد کنید.
                  </p>
                )}
                {provinces.length === 0 && (
                  <input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className={`${inputCls} mt-2`}
                    placeholder="نام استان..."
                  />
                )}
              </div>
              <div>
                <label className={labelCls}>شهر</label>
                {cities.length > 0 ? (
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputCls}
                    placeholder="نام شهر..."
                  />
                )}
              </div>
            </div>
          </section>

          {/* P1-5 — Canonical Location (countryId / provinceId / cityId) */}
          <section className="rounded-2xl border border-[#F58220]/30 bg-[#F58220]/5 p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-black text-zinc-900">موقعیت (Canonical)</h2>
            <p className="mb-4 text-[10px] text-zinc-500">
              فیلدهای Canonical — Country / Province / City رفرنس رسمی به جداول مستقل
              موقعیت (P1-5).
            </p>
            <LocationPicker value={locationValue} onChange={setLocationValue} />
          </section>

          {/* P1 — Optional Product link */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-black text-zinc-900">محصول مرتبط (Product)</h2>
            <p className="mb-4 text-[10px] text-zinc-400">
              لینک اختیاری آگهی به موجودیت کاتالوگی Product (Brand → Model → Product).
            </p>
            <div ref={productWrapRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setProductId("");
                    }
                  }}
                  onFocus={() => productResults.length > 0 && setProductOpen(true)}
                  className={`${inputCls} pr-9`}
                  placeholder="جستجوی محصول..."
                  dir="rtl"
                />
                {productId && (
                  <button
                    type="button"
                    onClick={clearProduct}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-red-500"
                  >
                    پاک کردن
                  </button>
                )}
              </div>
              {productOpen && productResults.length > 0 && (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickProduct(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-right text-sm transition hover:bg-[#F58220]/5"
                    >
                      <span className="font-bold text-zinc-800">{p.canonicalName}</span>
                      <span className="text-[10px] text-zinc-400" dir="ltr">
                        {p.slug}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Images */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900">تصاویر ({images.length})</h2>
              <span className="text-[10px] text-zinc-400">اولین تصویر = تصویر اصلی</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
                >
                  <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
                  {img.isPrimary && (
                    <span className="absolute right-1 top-1 rounded bg-[#F58220] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      اصلی
                    </span>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 transition group-hover:opacity-100">
                    <div className="flex gap-1">
                      {!img.isPrimary && (
                        <button
                          onClick={() => setPrimary(img.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#F58220]"
                          title="تنظیم به‌عنوان اصلی"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-red-500"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveImage(img.id, -1)}
                        disabled={idx === 0}
                        className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-zinc-700 disabled:opacity-30"
                        title="جابجایی به راست"
                      >
                        →
                      </button>
                      <button
                        onClick={() => moveImage(img.id, 1)}
                        disabled={idx === images.length - 1}
                        className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-zinc-700 disabled:opacity-30"
                        title="جابجایی به چپ"
                      >
                        ←
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Add-image widget — uses MediaUploader; both upload and
                  paste-URL flows funnel into addImageByUrl. */}
              <div className="flex aspect-square items-stretch">
                <MediaUploader
                  value=""
                  onChange={(v) => {
                    if (v) addImageByUrl(v);
                  }}
                  endpoint="/api/admin/upload"
                  label=""
                  removable={false}
                  className="h-full w-full"
                  hint="آپلود یا چسباندن URL — تصویر به‌صورت خودکار به آگهی اضافه می‌شود."
                />
              </div>
            </div>
            {uploading && (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#F58220]">
                <Loader2 className="h-3 w-3 animate-spin" />
                در حال افزودن تصویر…
              </p>
            )}
          </section>

          {/* Attributes (dynamic per category) */}
          {categoryId && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-black text-zinc-900">ویژگی‌ها (مشخصات فنی)</h2>
              <p className="mb-4 text-[11px] text-zinc-400">
                ویژگی‌های اختصاصی این دسته — مقادیر را با دقت پر کنید.
              </p>
              <div className="rounded-xl bg-zinc-950 p-4">
                <AttributeFields
                  categoryId={categoryId}
                  values={attributeValues}
                  onChange={setAttributeValues}
                  onAttributesLoaded={setAttributeDefs}
                />
              </div>
            </section>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* Status + flags */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">وضعیت و انتشار</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>وضعیت آگهی</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputCls}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                  featured
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-amber-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                <Star className="h-4 w-4 text-amber-500" />
                آگهی ویژه
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                  verified
                    ? "border-teal-300 bg-teal-50 text-teal-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-teal-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="h-4 w-4 accent-teal-600"
                />
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                تأییدشدهٔ هویکس
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                  showInLatest
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-blue-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={showInLatest}
                  onChange={(e) => setShowInLatest(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                نمایش در آخرین آگهی‌ها
              </label>
            </div>
          </section>

          {/* Seller / contact info */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-zinc-900">اطلاعات تماس</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>نام فروشنده</label>
                <input
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>شماره تماس</label>
                <input
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  className={inputCls}
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          {/* Admin notes (admin only) */}
          {isAdmin && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-black text-zinc-900">یادداشت ادمین</h2>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-800 outline-none focus:border-[#F58220]"
                placeholder="یادداشت خصوصی ادمین (فقط در پنل مدیریت دیده می‌شود)..."
              />
            </section>
          )}

          {/* Save button (sticky) */}
          <div className="sticky bottom-4 z-10">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره تغییرات
            </button>
          </div>

          {/* Publish info */}
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-[11px] text-zinc-500">
            <p className="mb-1 font-bold text-zinc-700">اطلاعات انتشار</p>
            <p>منتشرشده: {initial.publishedAt ? new Date(initial.publishedAt).toLocaleDateString("fa-IR") : "—"}</p>
            <p>انقضا: {initial.expiresAt ? new Date(initial.expiresAt).toLocaleDateString("fa-IR") : "—"}</p>
            <p className="mt-2 text-[10px] text-zinc-400">
              با کلیک روی «تمدید آگهی»، تاریخ انتشار به امروز بازنشانی شده و ۳۰ روز به انقضا اضافه می‌شود.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
