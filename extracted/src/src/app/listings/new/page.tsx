"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TransactionTypePicker from "@/components/listings/TransactionTypePicker";
import LocationPicker, { type LocationValue } from "@/components/listings/LocationPicker";
import AttributeFields, {
  type AttributeValue,
  type AttributeDef,
  buildAttributePayload,
  validateAttributeFields,
  getCachedAttributes,
} from "@/components/listings/AttributeFields";
import { toFa } from "@/lib/format";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ImagePlus,
  Key,
  Layers3,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Truck,
  Search,
  Building2,
  MapPin,
  Sliders,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   /listings/new — HBR Taxonomy V1.1 listing wizard.

   Steps:
   1. نوع معامله (TransactionType)  — SALE/RENT/WANTED/QUOTE/AUCTION/SERVICE_REQUEST
   2. دسته‌بندی (Category)          — CATALOG only, cascading root → child → grandchild
   2.5. ویژگی‌ها (Attributes)        — dynamic from /api/categories/[id]/attributes
   3. برند و مدل                     — brand typeahead + model select (filtered by brand)
   4. موقعیت (Location)              — country/province/city cascading
   5. جزئیات                          — title, description, price/rental period, images, contact
   6. بازبینی و تأیید                — review + POST /api/listings
   ============================================================ */

const STEP_LABELS = [
  "نوع معامله",
  "دسته‌بندی",
  "ویژگی‌ها",
  "برند و مدل",
  "موقعیت",
  "جزئیات",
  "تکمیل",
];

// Hard-coded rental periods (used when transactionType === RENT)
const RENTAL_PERIODS = [
  { v: "HOURLY", l: "ساعتی" },
  { v: "DAILY", l: "روزانه" },
  { v: "WEEKLY", l: "هفتگی" },
  { v: "MONTHLY", l: "ماهانه" },
  { v: "PROJECT", l: "پروژه‌ای" },
];

type BrandSuggestion = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  country: string | null;
  logoUrl: string | null;
};

type TaxChild = { id: string; name: string; slug: string; icon: string | null };
type TaxRoot = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  children: TaxChild[];
};

type ModelOption = { id: string; name: string; nameEn: string | null };

export default function NewListingPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attributeWarning, setAttributeWarning] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

  // Form state — V1.1
  const [transactionType, setTransactionType] = useState<string>("SALE");
  const [categoryId, setCategoryId] = useState<string>("");
  const [attributes, setAttributes] = useState<AttributeValue>({});
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);
  const [attrErrors, setAttrErrors] = useState<Record<string, string>>({});
  const [brandId, setBrandId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [location, setLocation] = useState<LocationValue>({
    countryId: "",
    provinceId: "",
    cityId: "",
  });
  const [form, setForm] = useState({
    brandLabel: "",
    title: "",
    shortDesc: "",
    description: "",
    condition: "USED",
    year: "",
    hours: "",
    price: "",
    priceType: "NEGOTIABLE",
    rentalPeriod: "",
    serialNumber: "",
    sellerName: "",
    sellerPhone: "",
  });

  // P2-5b — Rental-only fields (used when transactionType=RENT).
  const [rental, setRental] = useState({
    deposit: "",
    minimumRentalPeriod: "",
    operatorIncluded: false,
    fuelIncluded: false,
    transportIncluded: false,
    availabilityStart: "",
    availabilityEnd: "",
  });
  const setRentalField = (k: keyof typeof rental, v: string | boolean) =>
    setRental((r) => ({ ...r, [k]: v }));

  // Catalog root/child/grandchild state
  const [catalogRoots, setCatalogRoots] = useState<TaxRoot[]>([]);
  const [childCats, setChildCats] = useState<TaxChild[]>([]);
  const [grandchildCats, setGrandchildCats] = useState<TaxChild[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string>("");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  // TaxPath-based grandchild lookup: childId -> children
  // We don't have grandchildren in the V1.1 taxonomy endpoint (only level 0+1),
  // so we lazily fetch a category's children from the public category API.

  // Brand typeahead state (alias-aware, hits /api/brands/search).
  const [brandQuery, setBrandQuery] = useState("");
  const [brandResults, setBrandResults] = useState<BrandSuggestion[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const brandAbort = useRef<AbortController | null>(null);
  const brandWrapRef = useRef<HTMLDivElement>(null);

  // Models of selected brand
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // ── Fetch V1.1 catalog roots ──
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/taxonomy", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { catalogRoots?: TaxRoot[] };
        if (alive && data.catalogRoots) setCatalogRoots(data.catalogRoots);
      } catch {
        /* swallow */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Debounced alias-aware brand search ──
  useEffect(() => {
    const q = brandQuery.trim();
    if (!q) {
      setBrandResults([]);
      setBrandLoading(false);
      setBrandOpen(false);
      brandAbort.current?.abort();
      return;
    }
    setBrandLoading(true);
    const t = setTimeout(async () => {
      brandAbort.current?.abort();
      const ctrl = new AbortController();
      brandAbort.current = ctrl;
      try {
        const res = await fetch(`/api/brands/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("brand search failed");
        const data = (await res.json()) as { brands: BrandSuggestion[] };
        setBrandResults(data.brands ?? []);
        setBrandOpen(true);
      } catch {
        /* swallow abort + transient errors */
      } finally {
        setBrandLoading(false);
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

  const pickBrand = (b: BrandSuggestion) => {
    setBrandId(b.id);
    setBrandQuery(b.name);
    setForm((f) => ({ ...f, brandLabel: b.name }));
    setBrandOpen(false);
    setModelId("");
    setModels([]);
  };

  // ── Fetch models when brand changes ──
  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    let alive = true;
    setModelsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/taxonomy/brands/${brandId}/models${categoryId ? `?categoryId=${categoryId}` : ""}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("models fetch failed");
        const data = (await res.json()) as {
          data: Array<{ id: string; name: string; nameEn: string | null }>;
        };
        if (!alive) return;
        setModels(
          (data.data ?? []).map((m) => ({ id: m.id, name: m.name, nameEn: m.nameEn })),
        );
      } catch {
        if (alive) setModels([]);
      } finally {
        if (alive) setModelsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [brandId, categoryId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Cascade: when a root is selected, populate its children ──
  const onPickRoot = (root: TaxRoot) => {
    setSelectedRootId(root.id);
    setCategoryId(root.id);
    setChildCats(root.children ?? []);
    setSelectedChildId("");
    setGrandchildCats([]);
  };

  const onPickChild = (child: TaxChild) => {
    setSelectedChildId(child.id);
    setCategoryId(child.id);
    setGrandchildCats([]);
    // Try to fetch grandchildren via the public category endpoint.
    // The endpoint may not return children, so we silently no-op on failure.
    (async () => {
      try {
        const res = await fetch(`/api/taxonomy/categories/${child.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { category?: { children?: TaxChild[] } };
        if (data.category?.children && data.category.children.length > 0) {
          setGrandchildCats(data.category.children);
        }
      } catch {
        /* no-op */
      }
    })();
  };

  const onPickGrandchild = (gc: TaxChild) => {
    setCategoryId(gc.id);
  };

  const isRent = transactionType === "RENT";
  const isAuction = transactionType === "AUCTION";

  const canProceed = () => {
    if (step === 1) return Boolean(transactionType);
    if (step === 2) return Boolean(categoryId);
    if (step === 3) {
      // Required attributes must be filled before proceeding.
      // NOTE: do NOT call setAttrErrors here — canProceed runs during render.
      const errs = validateAttributeFields(attributeDefs, attributes);
      return Object.keys(errs).length === 0;
    }
    if (step === 4) return Boolean(brandId) && form.title.trim().length >= 5 && form.shortDesc.trim();
    if (step === 5) return Boolean(location.provinceId);
    if (step === 6) {
      if (isRent) return form.price && form.rentalPeriod && images.length >= 1;
      if (isAuction) return images.length >= 1; // auction price optional at submission
      return form.price && images.length >= 1;
    }
    return true;
  };

  const next = () => canProceed() && setStep((s) => Math.min(7, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setAttributeWarning(null);
    setSubmitting(true);
    try {
      // Look up province/city names for storage (Listing.province/city are String?).
      // We can't easily resolve names from the client without another fetch, so
      // we pass province/city IDs and let the server fall back if needed.
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        shortDesc: form.shortDesc.trim() || undefined,
        condition: form.condition,
        year: form.year ? Number(form.year) : undefined,
        workingHours: form.hours ? Number(form.hours) : undefined,
        price: form.price ? String(form.price).replace(/[^\d]/g, "") : undefined,
        priceType: isAuction ? "AUCTION" : form.priceType,
        // Map V1.1 TransactionType.key → legacy Listing.listingType
        // (server stores listingType as String; we keep the key for compatibility).
        listingType: transactionType,
        transactionType,
        rentalPeriod: isRent ? form.rentalPeriod : undefined,
        province: location.provinceId || undefined,
        city: location.cityId || undefined,
        provinceId: location.provinceId || undefined,
        cityId: location.cityId || undefined,
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        modelId: modelId || undefined,
        serialNumber: form.serialNumber || undefined,
        sellerName: form.sellerName || undefined,
        sellerPhone: form.sellerPhone || undefined,
        attributes,
        images: images.map((url) => ({ url })),
      };

      // P2-5b — Rental fields (sent only when transactionType=RENT).
      if (isRent) {
        body.deposit = rental.deposit ? rental.deposit.replace(/[^\d]/g, "") : undefined;
        body.minimumRentalPeriod = rental.minimumRentalPeriod || undefined;
        body.operatorIncluded = rental.operatorIncluded;
        body.fuelIncluded = rental.fuelIncluded;
        body.transportIncluded = rental.transportIncluded;
        body.availabilityStart = rental.availabilityStart || undefined;
        body.availabilityEnd = rental.availabilityEnd || undefined;
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setSubmitError(data.error ?? "ثبت آگهی ناموفق بود. لطفاً دوباره تلاش کنید.");
        return;
      }

      // ── Attribute save — fire after the listing row exists. ──
      // We always have the listing id (from the POST response). Use the
      // cached attribute definitions (the AttributeFields component populates
      // the cache on mount) or fall back to the defs captured via the
      // onAttributesLoaded callback.
      const defs = attributeDefs.length > 0
        ? attributeDefs
        : (categoryId ? getCachedAttributes(categoryId) ?? [] : []);
      const payload = buildAttributePayload(defs, attributes);
      if (payload.length > 0 && data.id) {
        try {
          const attrRes = await fetch(
            `/api/listings/${encodeURIComponent(data.id)}/attributes`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ values: payload }),
            },
          );
          if (!attrRes.ok) {
            const attrData = await attrRes.json().catch(() => ({}));
            setAttributeWarning(
              attrData?.error
                ? `ذخیرهٔ ویژگی‌ها ناموفق بود: ${attrData.error} — آگهی ثبت شد ولی ویژگی‌ها ذخیره نشدند.`
                : "ذخیرهٔ ویژگی‌ها ناموفق بود — آگهی ثبت شد ولی ویژگی‌ها ذخیره نشدند. می‌توانید بعداً ویرایش کنید.",
            );
          }
        } catch (attrErr: any) {
          setAttributeWarning(
            `آگهی ثبت شد ولی ذخیرهٔ ویژگی‌ها با خطا مواجه شد: ${attrErr?.message ?? "خطای شبکه"}. بعداً از پنل کاربری ویرایش کنید.`,
          );
        }
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmitError(err?.message ?? "خطای شبکه — اتصال اینترنت را بررسی کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none transition focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)] placeholder:text-white/25";
  const labelCls = "mb-1.5 block text-xs font-bold text-white/60";

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1120px] px-4 pb-16 lg:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">
              خانه
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="text-white/70">ثبت آگهی</span>
          </nav>

          {submitted ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.06] p-10 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
              <h1 className="text-2xl font-black text-white">آگهی شما ثبت شد!</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">
                آگهی شما پس از بررسی کارشناسان هویکس منتشر خواهد شد. در صورت تأیید، در صفحهٔ
                آگهی‌ها نمایش داده می‌شود و وارد کمپین «فروش در ۷ روز» می‌گردد.
              </p>
              {attributeWarning && (
                <div className="mx-auto mt-5 flex max-w-md items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-right">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div className="text-xs leading-6 text-amber-200">
                    {attributeWarning}
                  </div>
                </div>
              )}
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/listings"
                  className="rounded-xl bg-[#F58220] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
                >
                  مشاهده آگهی‌ها
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white/80 transition hover:text-white"
                >
                  بازگشت به خانه
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Hero header */}
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#F58220]">
                    <Sparkles className="h-3.5 w-3.5" />
                    HEAVIX LISTING · TAXONOMY V1.1
                  </span>
                  <h1 className="text-3xl font-black text-white lg:text-4xl">ثبت آگهی ماشین‌آلات</h1>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-white/45">
                    در ۷ مرحله ساده، دستگاه خود را در بزرگ‌ترین بازار ماشین‌آلات سنگین ایران ثبت کنید.
                    نوع معامله، دسته‌بندی، ویژگی‌ها و موقعیت را تعیین کنید.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#F58220]" />
                    معامله امن هویکس
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/60">
                    <PackageCheck className="h-3.5 w-3.5 text-[#F58220]" />
                    کارشناسی اختصاصی
                  </span>
                </div>
              </div>

              {/* Stepper */}
              <div className="mb-8 flex items-center justify-between overflow-x-auto">
                {STEP_LABELS.map((label, idx) => {
                  const value = idx + 1;
                  const done = value < step;
                  const current = value === step;
                  return (
                    <div key={label} className="flex flex-1 items-center min-w-[80px]">
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black transition ${
                            done
                              ? "border-[#F58220] bg-[#F58220] text-white"
                              : current
                                ? "border-[#F58220] bg-transparent text-[#F58220]"
                                : "border-white/15 text-white/40"
                          }`}
                        >
                          {done ? <Check className="h-4 w-4" /> : value}
                        </div>
                        <span
                          className={`whitespace-nowrap text-[10px] font-bold sm:text-xs ${
                            current ? "text-[#F58220]" : done ? "text-white/70" : "text-white/35"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      {value < STEP_LABELS.length && (
                        <div
                          className={`mx-2 h-0.5 flex-1 rounded transition ${
                            done ? "bg-[#F58220]" : "bg-white/10"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-[#111] p-6 lg:p-8">
                {/* ───── STEP 1: TRANSACTION TYPE ───── */}
                {step === 1 && (
                  <div>
                    <SectionTitle
                      icon={<Sparkles className="h-5 w-5" />}
                      title="نوع معامله"
                      subtitle="نوع معامله‌ای که می‌خواهید ثبت کنید را انتخاب کنید"
                    />
                    <div className="mt-6">
                      <TransactionTypePicker value={transactionType} onChange={setTransactionType} />
                    </div>
                    <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-white/50">
                      نوع معامله فیلد جریان را تعیین می‌کند: «فروش» و «اجاره» برای کاتالوگ ماشین‌آلات،
                      «درخواست» برای درخواست خرید، «پیشنهاد قیمت» برای RFQ، «مزایده» برای حراج،
                      و «درخواست خدمت» برای خدمات فنی.
                    </p>
                  </div>
                )}

                {/* ───── STEP 2: CATEGORY (CATALOG only) ───── */}
                {step === 2 && (
                  <div>
                    <SectionTitle
                      icon={<Layers3 className="h-5 w-5" />}
                      title="دسته‌بندی کاتالوگ"
                      subtitle="دسته، زیردسته و زیر-زیردسته دستگاه را انتخاب کنید (فقط لایه CATALOG)"
                    />

                    {catalogRoots.length === 0 ? (
                      <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/50">
                        در حال بارگذاری دسته‌بندی‌ها… اگر ظاهر نشد، ابتدا دسته‌های کاتالوگ را در پنل مدیریت اضافه کنید.
                      </div>
                    ) : (
                      <div className="mt-6 space-y-6">
                        {/* Level 0 — roots */}
                        <div>
                          <label className={labelCls}>دسته اصلی</label>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {catalogRoots.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => onPickRoot(c)}
                                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                                  selectedRootId === c.id
                                    ? "border-[#F58220] bg-[#F58220]/10"
                                    : "border-white/10 bg-black/30 hover:border-white/25"
                                }`}
                              >
                                <span className="text-2xl">{c.icon ?? "🚜"}</span>
                                <span className="text-xs font-bold text-white">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Level 1 — children */}
                        {childCats.length > 0 && (
                          <div className="border-t border-white/10 pt-5">
                            <label className={labelCls}>زیردسته</label>
                            <div className="flex flex-wrap gap-2">
                              {childCats.map((sub) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => onPickChild(sub)}
                                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                                    selectedChildId === sub.id
                                      ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                                      : "border-white/10 text-white/60 hover:text-white"
                                  }`}
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Level 2 — grandchildren (if any) */}
                        {grandchildCats.length > 0 && (
                          <div className="border-t border-white/10 pt-5">
                            <label className={labelCls}>زیر-زیردسته</label>
                            <div className="flex flex-wrap gap-2">
                              {grandchildCats.map((gc) => (
                                <button
                                  key={gc.id}
                                  type="button"
                                  onClick={() => onPickGrandchild(gc)}
                                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                                    categoryId === gc.id
                                      ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                                      : "border-white/10 text-white/60 hover:text-white"
                                  }`}
                                >
                                  {gc.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {categoryId && (
                          <div className="rounded-xl border border-[#F58220]/20 bg-[#F58220]/[0.04] p-3 text-[11px] text-white/60">
                            دستهٔ انتخاب‌شده:{" "}
                            <span className="font-bold text-[#F58220]">
                              {catalogRoots.find((r) => r.id === selectedRootId)?.name ?? ""}
                              {selectedChildId ? " / " : ""}
                              {childCats.find((c) => c.id === selectedChildId)?.name ?? ""}
                              {grandchildCats.find((gc) => gc.id === categoryId)?.name
                                ? " / " + grandchildCats.find((gc) => gc.id === categoryId)?.name
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ───── STEP 3: ATTRIBUTES (dynamic) ───── */}
                {step === 3 && (
                  <div>
                    <SectionTitle
                      icon={<Sliders className="h-5 w-5" />}
                      title="ویژگی‌های دستگاه"
                      subtitle="ویژگی‌های اختصاصی دستهٔ انتخاب‌شده را پر کنید"
                    />
                    <div className="mt-6">
                      <AttributeFields
                        categoryId={categoryId || null}
                        values={attributes}
                        onChange={(next) => {
                          setAttributes(next);
                          // Live-validate required fields.
                          setAttrErrors(validateAttributeFields(attributeDefs, next));
                        }}
                        errors={attrErrors}
                        onAttributesLoaded={(defs) => setAttributeDefs(defs)}
                      />
                    </div>
                    <p className="mt-4 text-[11px] text-white/40">
                      ویژگی‌های دارای علامت * الزامی هستند. ویژگی‌های «فیلترپذیر» در صفحهٔ آگهی‌ها قابل
                      فیلتر کردن خواهند بود.
                    </p>
                  </div>
                )}

                {/* ───── STEP 4: BRAND + MODEL + BASIC INFO ───── */}
                {step === 4 && (
                  <div>
                    <SectionTitle
                      icon={<Truck className="h-5 w-5" />}
                      title="برند، مدل و اطلاعات پایه"
                      subtitle="برند، مدل، عنوان و توضیحات آگهی"
                    />
                    <div className="mt-6 space-y-5">
                      <div ref={brandWrapRef} className="relative">
                        <label className={labelCls}>برند *</label>
                        <div className="relative">
                          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <input
                            value={brandQuery}
                            onChange={(e) => {
                              setBrandQuery(e.target.value);
                              setBrandId("");
                              setForm((f) => ({ ...f, brandLabel: e.target.value }));
                            }}
                            onFocus={() => brandResults.length > 0 && setBrandOpen(true)}
                            placeholder="نام برند را فارسی یا انگلیسی تایپ کنید…"
                            className={`${inputCls} pr-9`}
                            aria-label="جستجوی برند"
                            autoComplete="off"
                          />
                          {brandLoading && (
                            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#F58220]" />
                          )}
                          {brandId && !brandLoading && (
                            <button
                              type="button"
                              onClick={() => {
                                setBrandId("");
                                setBrandQuery("");
                                setForm((f) => ({ ...f, brandLabel: "" }));
                                setBrandResults([]);
                                setBrandOpen(false);
                              }}
                              className="absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
                              aria-label="پاک کردن برند"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {brandId && !brandOpen && (
                          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-3 py-1 text-xs font-bold text-[#F58220]">
                            <Check className="h-3 w-3" />
                            {form.brandLabel}
                          </div>
                        )}

                        {brandOpen && brandQuery.trim() && (
                          <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0_25px_60px_rgba(0,0,0,.6)]">
                            {brandResults.length === 0 ? (
                              <div className="p-4 text-center text-xs text-white/50">
                                نتیجه‌ای یافت نشد. می‌توانید نام دلخواه را وارد کنید و ادامه دهید.
                              </div>
                            ) : (
                              <ul className="py-1">
                                {brandResults.map((r) => (
                                  <li key={r.id}>
                                    <button
                                      type="button"
                                      onClick={() => pickBrand(r)}
                                      className="flex w-full items-center gap-3 px-4 py-2.5 text-right transition hover:bg-[#F58220]/10"
                                    >
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                                        {r.logoUrl ? (
                                          <img
                                            src={r.logoUrl}
                                            alt={r.name}
                                            className="h-full w-full object-contain p-1"
                                          />
                                        ) : (
                                          <Building2 className="h-4 w-4 text-[#F58220]/60" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-white">
                                          {r.name}
                                        </p>
                                        {r.nameEn && (
                                          <p className="truncate text-[11px] text-white/40">
                                            {r.nameEn}
                                          </p>
                                        )}
                                      </div>
                                      {r.country && (
                                        <span className="shrink-0 text-[10px] text-white/40">
                                          {r.country}
                                        </span>
                                      )}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Model select (filtered by brand) */}
                      <div>
                        <label className={labelCls}>مدل</label>
                        <div className="relative">
                          <select
                            value={modelId}
                            onChange={(e) => setModelId(e.target.value)}
                            disabled={!brandId || modelsLoading}
                            className={inputCls}
                          >
                            <option value="">
                              {!brandId
                                ? "ابتدا برند را انتخاب کنید"
                                : modelsLoading
                                  ? "بارگذاری…"
                                  : "بدون مدل مشخص"}
                            </option>
                            {models.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                                {m.nameEn ? ` (${m.nameEn})` : ""}
                              </option>
                            ))}
                          </select>
                          {modelsLoading && (
                            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#F58220]" />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>عنوان آگهی *</label>
                        <input
                          value={form.title}
                          onChange={(e) => set("title", e.target.value)}
                          placeholder="مثلاً: بیل مکانیکی کوماتسو PC220 کارکرده"
                          className={inputCls}
                        />
                        <p className="mt-1 text-[10px] text-white/35">
                          حداقل ۵ کاراکتر. مدل و سال را ذکر کنید.
                        </p>
                      </div>

                      <div>
                        <label className={labelCls}>خلاصه کوتاه *</label>
                        <input
                          value={form.shortDesc}
                          onChange={(e) => set("shortDesc", e.target.value)}
                          placeholder="یک جمله خلاصه وضعیت دستگاه"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>توضیحات کامل</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => set("description", e.target.value)}
                          rows={5}
                          placeholder="شرح کامل دستگاه، وضعیت فنی، خدمات انجام‌شده، تاریخچه..."
                          className="w-full rounded-xl border border-white/10 bg-black/50 p-3 text-sm text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                        />
                      </div>

                      <div>
                        <label className={labelCls}>وضعیت دستگاه</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { v: "NEW", l: "نو" },
                            { v: "USED", l: "کارکرده" },
                            { v: "REFURBISHED", l: "بازسازی‌شده" },
                            { v: "FOR_PARTS", l: "قطعات" },
                          ].map((o) => (
                            <button
                              key={o.v}
                              type="button"
                              onClick={() => set("condition", o.v)}
                              className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                                form.condition === o.v
                                  ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                                  : "border-white/10 text-white/60 hover:text-white"
                              }`}
                            >
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───── STEP 5: LOCATION ───── */}
                {step === 5 && (
                  <div>
                    <SectionTitle
                      icon={<MapPin className="h-5 w-5" />}
                      title="موقعیت دستگاه"
                      subtitle="کشور، استان و شهر دستگاه را انتخاب کنید (پیش‌فرض: ایران)"
                    />
                    <div className="mt-6">
                      <LocationPicker value={location} onChange={setLocation} />
                    </div>
                    <p className="mt-4 text-[11px] text-white/40">
                      موقعیت به‌عنوان بعد مستقل در تاکسونومی V1.1 ذخیره می‌شود و در فیلتر آگهی‌ها
                      قابل استفاده است.
                    </p>
                  </div>
                )}

                {/* ───── STEP 6: DETAILS (price/rental/images/contact) ───── */}
                {step === 6 && (
                  <div>
                    <SectionTitle
                      icon={<PackageCheck className="h-5 w-5" />}
                      title="جزئیات آگهی"
                      subtitle={
                        isRent
                          ? "دوره اجاره، قیمت اجاره و تصاویر"
                          : isAuction
                            ? "قیمت پایه مزایده و تصاویر"
                            : "قیمت، تصاویر و اطلاعات تماس"
                      }
                    />
                    <div className="mt-6 space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className={labelCls}>سال ساخت</label>
                          <input
                            value={form.year}
                            onChange={(e) => set("year", e.target.value)}
                            placeholder="مثلاً: 2019"
                            dir="ltr"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>ساعت کارکرد</label>
                          <input
                            value={form.hours}
                            onChange={(e) => set("hours", e.target.value)}
                            placeholder="مثلاً: 4200"
                            dir="ltr"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>
                            {isRent ? "قیمت اجاره (تومان)" : isAuction ? "قیمت پایه مزایده (تومان)" : "قیمت (تومان)"}{" "}
                            {!isAuction && "*"}
                          </label>
                          <input
                            value={form.price}
                            onChange={(e) => set("price", e.target.value)}
                            placeholder="مثلاً: 8500000000"
                            dir="ltr"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>نوع قیمت</label>
                          <select
                            value={isAuction ? "AUCTION" : form.priceType}
                            onChange={(e) => set("priceType", e.target.value)}
                            disabled={isAuction}
                            className={inputCls}
                          >
                            <option value="NEGOTIABLE">توافقی</option>
                            <option value="FIXED">مقطوع</option>
                            <option value="CALL_FOR_PRICE">تماس بگیرید</option>
                            <option value="AUCTION">مزایده</option>
                          </select>
                        </div>
                      </div>

                      {/* Rental period (only for RENT) */}
                      {isRent && (
                        <div className="rounded-2xl border border-[#F58220]/20 bg-[#F58220]/[0.04] p-5">
                          <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-black text-[#F58220]">
                            <Key className="h-3.5 w-3.5" />
                            مشخصات اجاره
                          </p>

                          {/* Rental period */}
                          <div>
                            <label className={labelCls}>دوره اجاره *</label>
                            <div className="flex flex-wrap gap-2">
                              {RENTAL_PERIODS.map((p) => (
                                <button
                                  key={p.v}
                                  type="button"
                                  onClick={() => set("rentalPeriod", p.v)}
                                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                                    form.rentalPeriod === p.v
                                      ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                                      : "border-white/10 text-white/60 hover:text-white"
                                  }`}
                                >
                                  {p.l}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Deposit + min period */}
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className={labelCls}>ودیعه (تومان)</label>
                              <input
                                value={rental.deposit}
                                onChange={(e) => setRentalField("deposit", e.target.value.replace(/[^\d]/g, ""))}
                                placeholder="مثلاً: 50000000"
                                dir="ltr"
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>حداقل مدت اجاره</label>
                              <input
                                value={rental.minimumRentalPeriod}
                                onChange={(e) => setRentalField("minimumRentalPeriod", e.target.value.replace(/[^\d]/g, ""))}
                                placeholder="مثلاً: 3 (به واحد دوره)"
                                dir="ltr"
                                className={inputCls}
                              />
                            </div>
                          </div>

                          {/* Included services */}
                          <div className="mt-4">
                            <label className={labelCls}>خدمات همراه اجاره</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { k: "operatorIncluded", l: "اپراتور" },
                                { k: "fuelIncluded", l: "سوخت" },
                                { k: "transportIncluded", l: "حمل و نقل" },
                              ].map((opt) => (
                                <button
                                  key={opt.k}
                                  type="button"
                                  onClick={() =>
                                    setRentalField(
                                      opt.k as keyof typeof rental,
                                      !rental[opt.k as keyof typeof rental],
                                    )
                                  }
                                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                                    rental[opt.k as keyof typeof rental]
                                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                                      : "border-white/10 text-white/60 hover:text-white"
                                  }`}
                                >
                                  {rental[opt.k as keyof typeof rental] ? "✓ " : ""}
                                  {opt.l} شامل
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Availability */}
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className={labelCls}>شروع دسترسی</label>
                              <input
                                type="date"
                                value={rental.availabilityStart}
                                onChange={(e) => setRentalField("availabilityStart", e.target.value)}
                                dir="ltr"
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>پایان دسترسی</label>
                              <input
                                type="date"
                                value={rental.availabilityEnd}
                                onChange={(e) => setRentalField("availabilityEnd", e.target.value)}
                                dir="ltr"
                                className={inputCls}
                              />
                            </div>
                          </div>
                          <p className="mt-3 text-[11px] leading-5 text-white/45">
                            این اطلاعات در صفحهٔ اجاره و کارت آگهی به‌عنوان شرایط اجاره نمایش داده می‌شود.
                            ودیعه، حداقل مدت و خدمات شامل‌شده به اجاره‌گیرنده اعلام می‌شود.
                          </p>
                        </div>
                      )}

                      {/* Rental period (only for RENT) — old simple block removed, replaced by the panel above */}

                      <div>
                        <label className={labelCls}>سریال دستگاه</label>
                        <input
                          value={form.serialNumber}
                          onChange={(e) => set("serialNumber", e.target.value)}
                          placeholder="شماره سریال (اختیاری)"
                          dir="ltr"
                          className={inputCls}
                        />
                      </div>

                      {/* Contact info */}
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className={labelCls}>نام تماس</label>
                          <input
                            value={form.sellerName}
                            onChange={(e) => set("sellerName", e.target.value)}
                            placeholder="نام فروشنده / شرکت"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>شماره تماس</label>
                          <input
                            value={form.sellerPhone}
                            onChange={(e) => set("sellerPhone", e.target.value)}
                            placeholder="مثلاً: 09123456789"
                            dir="ltr"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Media */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-white/60">
                          تصاویر دستگاه *
                        </label>
                        <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-black/30 text-center transition hover:border-[#F58220]/40">
                          <ImagePlus className="mb-3 h-10 w-10 text-white/30" />
                          <span className="text-sm font-bold text-white/60">
                            تصاویر دستگاه را اینجا بکشید یا کلیک کنید
                          </span>
                          <span className="mt-1 text-[11px] text-white/30">PNG, JPG تا ۱۰ مگابایت</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              const placeholders = files.map(
                                (_, i) => `/uploads/placeholder-${Date.now()}-${i}.jpg`,
                              );
                              setImages((prev) => [...prev, ...placeholders].slice(0, 30));
                            }}
                          />
                        </label>

                        {images.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                            {images.map((img, i) => (
                              <div
                                key={i}
                                className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40"
                              >
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                                  <span className="text-3xl">🖼️</span>
                                </div>
                                {i === 0 && (
                                  <span className="absolute right-1 top-1 rounded bg-[#F58220] px-1.5 py-0.5 text-[8px] font-black text-white">
                                    اصلی
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                                  className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/70 transition hover:bg-red-500 hover:text-white"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 text-[11px] text-white/35">
                          {images.length} تصویر انتخاب شده. حداقل یک تصویر الزامی است.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───── STEP 7: REVIEW ───── */}
                {step === 7 && (
                  <div>
                    <SectionTitle
                      icon={<ShieldCheck className="h-5 w-5" />}
                      title="بازبینی و تأیید"
                      subtitle="اطلاعات آگهی خود را بررسی کنید"
                    />
                    <div className="mt-6 space-y-4">
                      <ReviewRow label="نوع معامله" value={transactionType} />
                      <ReviewRow
                        label="دسته‌بندی"
                        value={
                          catalogRoots.find((r) => r.id === selectedRootId)?.name ??
                          "—"
                        }
                      />
                      <ReviewRow label="برند" value={form.brandLabel || "—"} />
                      <ReviewRow label="مدل" value={models.find((m) => m.id === modelId)?.name ?? "—"} />
                      <ReviewRow label="عنوان" value={form.title || "—"} />
                      <ReviewRow label="وضعیت" value={{ NEW: "نو", USED: "کارکرده", REFURBISHED: "بازسازی‌شده", FOR_PARTS: "قطعات" }[form.condition] ?? "—"} />
                      <ReviewRow label="سال ساخت" value={form.year || "—"} />
                      <ReviewRow label="ساعت کارکرد" value={form.hours ? `${form.hours} ساعت` : "—"} />
                      <ReviewRow label="قیمت" value={form.price ? `${Number(form.price).toLocaleString("fa-IR")} تومان` : "—"} />
                      {isRent && (
                        <ReviewRow
                          label="دوره اجاره"
                          value={RENTAL_PERIODS.find((p) => p.v === form.rentalPeriod)?.l ?? "—"}
                        />
                      )}
                      {isRent && (
                        <ReviewRow
                          label="ودیعه"
                          value={rental.deposit ? `${Number(rental.deposit).toLocaleString("fa-IR")} تومان` : "—"}
                        />
                      )}
                      {isRent && (
                        <ReviewRow
                          label="حداقل مدت اجاره"
                          value={rental.minimumRentalPeriod ? `${toFa(rental.minimumRentalPeriod)} واحد` : "—"}
                        />
                      )}
                      {isRent && (
                        <ReviewRow
                          label="خدمات شامل"
                          value={[
                            rental.operatorIncluded ? "اپراتور" : "",
                            rental.fuelIncluded ? "سوخت" : "",
                            rental.transportIncluded ? "حمل و نقل" : "",
                          ].filter(Boolean).join("، ") || "—"}
                        />
                      )}
                      <ReviewRow
                        label="موقعیت"
                        value={
                          [location.countryId, location.provinceId, location.cityId]
                            .filter(Boolean)
                            .join(" / ") || "—"
                        }
                      />
                      <ReviewRow
                        label="ویژگی‌ها"
                        value={
                          Object.keys(attributes).length > 0
                            ? `${Object.keys(attributes).length} ویژگی پر شده`
                            : "بدون ویژگی"
                        }
                      />
                      <ReviewRow label="تصاویر" value={`${images.length} تصویر`} />

                      <div className="mt-6 rounded-2xl border border-[#F58220]/20 bg-[#F58220]/[0.04] p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#F58220]" />
                          <div>
                            <div className="text-sm font-bold text-white">ورود به کمپین «فروش در ۷ روز»</div>
                            <p className="mt-1 text-xs leading-6 text-white/55">
                              پس از تأیید کارشناسان، آگهی شما به‌طور خودکار وارد کمپین فروش تضمینی
                              هویکس می‌شود: کارشناسی فنی، ارزش‌گذاری، تطبیق با خریداران و عقد قرارداد.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 1}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 text-sm font-bold text-white/80 transition hover:text-white disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" />
                    مرحله قبل
                  </button>

                  {step < 7 ? (
                    <button
                      type="button"
                      onClick={next}
                      disabled={!canProceed()}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F58220] px-8 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-40"
                    >
                      مرحله بعد
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {submitting ? "در حال ثبت..." : "ثبت نهایی آگهی"}
                    </button>
                  )}
                </div>

                {/* Submit error */}
                {step === 7 && submitError && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-sm font-bold text-red-400">
                    ⚠ {submitError}
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ── Helpers ── */
function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F58220]/15 text-[#F58220]">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <span className="text-xs font-bold text-white/45">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
