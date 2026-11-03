"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calculator,
  Database,
  ListChecks,
  History,
  Loader2,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Info,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { toFa, formatCompactPrice, formatFullPrice, faDate } from "@/lib/format";

/* ============================================================
   PricingEngineClient — 4-tab admin UI for the HEAVIX price
   estimation engine. All data is fetched client-side from the
   public + admin pricing APIs.
   ============================================================ */

type Tab = "estimates" | "observations" | "overrides" | "history";

type Estimate = {
  estimatedPrice: number | null;
  priceLower: number | null;
  priceUpper: number | null;
  medianPrice: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  comparableCount: number;
  dataFreshness: "FRESH" | "RECENT" | "STALE" | null;
  mainDrivers: string[];
  warnings: string[];
  modelVersion: string;
  comparables: Array<{
    id: string;
    title: string;
    slug: string;
    price: number;
    year: number | null;
    workingHours: number | null;
    city: string | null;
    similarity: number;
  }>;
  disclaimer?: string;
};

type Health = {
  status: "IN_RANGE" | "BELOW_RANGE" | "ABOVE_RANGE" | "INSUFFICIENT";
  askingPrice: number | null;
  estimatedLower: number | null;
  estimatedUpper: number | null;
  estimatedPrice: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT" | null;
  deviationPct: number | null;
};

type Observation = {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  listingSlug: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  askingPrice: number | null;
  estimatedPrice: number | null;
  priceLower: number | null;
  priceUpper: number | null;
  currency: string;
  source: string;
  sourceType: string | null;
  observedAt: string;
  quality: string;
  status: string;
  confidence: string | null;
  comparableCount: number | null;
  notes: string | null;
};

type Override = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  originalEstimate: number;
  overridePrice: number;
  reason: string;
  overriddenBy: string | null;
  overriddenAt: string;
};

type HistoryPoint = {
  month: string;
  medianPrice: number | null;
  count: number;
  range: [number, number] | null;
};

const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "بالاترین اطمینان",
  MEDIUM: "اطمینان متوسط",
  LOW: "اطمینان پایین",
  INSUFFICIENT: "داده ناکافی",
};

const HEALTH_LABEL: Record<string, string> = {
  IN_RANGE: "داخل بازه تخمینی",
  BELOW_RANGE: "پایین‌تر از بازه",
  ABOVE_RANGE: "بالاتر از بازه",
  INSUFFICIENT: "داده ناکافی",
};

const HEALTH_COLOR: Record<string, string> = {
  IN_RANGE: "text-emerald-600 bg-emerald-50 border-emerald-200",
  BELOW_RANGE: "text-amber-600 bg-amber-50 border-amber-200",
  ABOVE_RANGE: "text-rose-600 bg-rose-50 border-rose-200",
  INSUFFICIENT: "text-zinc-500 bg-zinc-50 border-zinc-200",
};

const FRESHNESS_LABEL: Record<string, string> = {
  FRESH: "تازه",
  RECENT: "نسبتاً تازه",
  STALE: "قدیمی",
};

const SOURCE_LABEL: Record<string, string> = {
  LISTING: "آگهی",
  MANUAL: "دستی",
  AI_ESTIMATE: "تخمین هوش مصنوعی",
  EXTERNAL: "منبع خارجی",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  FLAGGED: "پرچم‌خورده",
  EXCLUDED: "مستثنی",
};

export default function PricingEngineClient({
  categories,
  brands,
  overrides: initialOverrides,
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  overrides: Override[];
}) {
  const [tab, setTab] = useState<Tab>("estimates");

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F58220]/15 text-[#F58220]">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900">
              موتور قیمت‌گذاری HEAVIX
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              برآورد داده‌محور قیمت ماشین‌آلات سنگین — جایگزین کارشناسی حضوری
              نیست.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
        <TabButton active={tab === "estimates"} onClick={() => setTab("estimates")} icon={Calculator} label="تخمین‌ها" />
        <TabButton active={tab === "observations"} onClick={() => setTab("observations")} icon={Database} label="مشاهدات" />
        <TabButton active={tab === "overrides"} onClick={() => setTab("overrides")} icon={ListChecks} label="اصلاح دستی (Override)" />
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={History} label="تاریخچه قیمت" />
      </div>

      {tab === "estimates" && <EstimatesTab />}
      {tab === "observations" && (
        <ObservationsTab categories={categories} brands={brands} />
      )}
      {tab === "overrides" && (
        <OverridesTab initialOverrides={initialOverrides} />
      )}
      {tab === "history" && (
        <HistoryTab categories={categories} brands={brands} />
      )}
    </div>
  );
}

/* ─────────────────── TabButton ─────────────────── */

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-[#F58220] text-white shadow-sm"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ─────────────────── EstimatesTab ─────────────────── */

function EstimatesTab() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<
    Array<{ id: string; title: string; slug: string; price: string | null; brand?: { name: string } | null; category?: { name: string } | null }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced listing search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/listings?q=${encodeURIComponent(q)}&limit=15`,
        );
        if (!res.ok) throw new Error("search failed");
        const json = await res.json();
        if (!cancelled) {
          setResults(json.data ?? []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const loadEstimate = useCallback(async (listingId: string) => {
    setSelectedId(listingId);
    setEstimate(null);
    setHealth(null);
    setError(null);
    setLoading(true);
    try {
      const [eRes, hRes] = await Promise.all([
        fetch(`/api/pricing/estimate?listingId=${listingId}`),
        fetch(`/api/pricing/health?listingId=${listingId}`),
      ]);
      if (!eRes.ok) throw new Error("estimate fetch failed");
      const e = (await eRes.json()) as Estimate;
      setEstimate(e);
      if (hRes.ok) {
        setHealth((await hRes.json()) as Health);
      }
    } catch (err: any) {
      setError(err?.message ?? "خطا در دریافت تخمین قیمت");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Picker */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-zinc-900">انتخاب آگهی</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی عنوان آگهی…"
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-[#F58220]"
        />
        {searching && (
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال جستجو…
          </div>
        )}
        {!searching && results.length > 0 && (
          <div className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pl-1">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => loadEstimate(r.id)}
                className={`block w-full rounded-xl border px-3 py-2 text-right transition ${
                  selectedId === r.id
                    ? "border-[#F58220] bg-[#F58220]/10"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="truncate text-sm font-semibold text-zinc-800">
                  {r.title}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {r.brand?.name ?? "—"} · {r.category?.name ?? "—"}
                  {r.price != null && ` · ${formatCompactPrice(BigInt(r.price))}`}
                </div>
              </button>
            ))}
          </div>
        )}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <div className="mt-3 text-xs text-zinc-400">
            نتیجه‌ای یافت نشد.
          </div>
        )}
      </div>

      {/* Estimate panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {!selectedId && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <Info className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-400">
              برای مشاهده تخمین قیمت، یک آگهی از ستون کنار انتخاب کنید.
            </p>
          </div>
        )}

        {selectedId && loading && (
          <div className="flex items-center gap-2 py-16 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال محاسبه تخمین قیمت…
          </div>
        )}

        {selectedId && !loading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {selectedId && !loading && estimate && (
          <div className="space-y-5">
            {/* Headline */}
            <div>
              <div className="text-xs text-zinc-500">قیمت تخمینی HEAVIX</div>
              {estimate.estimatedPrice != null ? (
                <div className="mt-1 text-3xl font-black text-[#F58220]">
                  {formatFullPrice(estimate.estimatedPrice)}
                </div>
              ) : (
                <div className="mt-1 text-xl font-bold text-zinc-500">
                  داده ناکافی برای تخمین
                </div>
              )}
              {estimate.priceLower != null && estimate.priceUpper != null && (
                <div className="mt-1 text-sm text-zinc-600">
                  بازه: {formatCompactPrice(estimate.priceLower)} تا{" "}
                  {formatCompactPrice(estimate.priceUpper)}
                </div>
              )}
            </div>

            {/* Confidence + freshness + count */}
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="اطمینان"
                value={
                  CONFIDENCE_LABEL[estimate.confidence] ?? estimate.confidence
                }
                accent={
                  estimate.confidence === "HIGH"
                    ? "emerald"
                    : estimate.confidence === "MEDIUM"
                      ? "amber"
                      : estimate.confidence === "LOW"
                        ? "orange"
                        : "zinc"
                }
              />
              <Stat
                label="موارد مشابه"
                value={toFa(estimate.comparableCount)}
              />
              <Stat
                label="تازگی داده"
                value={
                  estimate.dataFreshness
                    ? FRESHNESS_LABEL[estimate.dataFreshness] ??
                      estimate.dataFreshness
                    : "—"
                }
              />
            </div>

            {/* Price health */}
            {health && (
              <div
                className={`rounded-xl border p-4 ${HEALTH_COLOR[health.status] ?? "border-zinc-200 bg-zinc-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm font-bold">
                      وضعیت قیمت آگهی
                    </span>
                  </div>
                  <span className="text-sm font-black">
                    {HEALTH_LABEL[health.status] ?? health.status}
                  </span>
                </div>
                {health.askingPrice != null && (
                  <div className="mt-2 text-xs opacity-80">
                    قیمت آگهی: {formatFullPrice(health.askingPrice)}
                    {health.deviationPct != null && (
                      <span className="mr-2">
                        انحراف از میانه:{" "}
                        {toFa((health.deviationPct * 100).toFixed(0))}٪
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Drivers */}
            {estimate.mainDrivers.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  عوامل مؤثر بر تخمین
                </div>
                <div className="flex flex-wrap gap-2">
                  {estimate.mainDrivers.map((d, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {estimate.warnings.length > 0 && (
              <div className="space-y-2">
                {estimate.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Comparables */}
            {estimate.comparables.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <ListChecks className="h-3.5 w-3.5" />
                  موارد مشابه ({toFa(estimate.comparables.length)} مورد)
                </div>
                <div className="max-h-72 space-y-1.5 overflow-y-auto pl-1">
                  {estimate.comparables.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-800">
                          {c.slug ? (
                            <a
                              href={`/listings/${c.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#F58220]"
                            >
                              {c.title}
                            </a>
                          ) : (
                            c.title
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          {c.year ? `سال ${toFa(c.year)}` : "سال نامشخص"}
                          {c.workingHours != null
                            ? ` · ${toFa(c.workingHours)} ساعت`
                            : ""}
                          {c.city ? ` · ${c.city}` : ""}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-zinc-900">
                          {formatCompactPrice(c.price)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          شباهت: {toFa((c.similarity * 100).toFixed(0))}٪
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-6 text-zinc-500">
              {estimate.disclaimer ??
                "این برآورد داده‌محور است و جایگزین کارشناسی حضوری نیست."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── ObservationsTab ─────────────────── */

function ObservationsTab({
  categories,
  brands,
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
}) {
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Observation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (brandId) params.set("brandId", brandId);
      if (categoryId) params.set("categoryId", categoryId);
      if (source) params.set("source", source);
      if (status) params.set("status", status);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/pricing/observations?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
    } catch (err: any) {
      setError(err?.message ?? "خطا در دریافت داده");
    } finally {
      setLoading(false);
    }
  }, [brandId, categoryId, source, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SelectField
            label="برند"
            value={brandId}
            onChange={setBrandId}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            label="دسته"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="منبع"
            value={source}
            onChange={setSource}
            options={[
              { value: "LISTING", label: SOURCE_LABEL.LISTING },
              { value: "MANUAL", label: SOURCE_LABEL.MANUAL },
              { value: "AI_ESTIMATE", label: SOURCE_LABEL.AI_ESTIMATE },
              { value: "EXTERNAL", label: SOURCE_LABEL.EXTERNAL },
            ]}
          />
          <SelectField
            label="وضعیت"
            value={status}
            onChange={setStatus}
            options={[
              { value: "ACTIVE", label: STATUS_LABEL.ACTIVE },
              { value: "FLAGGED", label: STATUS_LABEL.FLAGGED },
              { value: "EXCLUDED", label: STATUS_LABEL.EXCLUDED },
            ]}
          />
          <button
            type="button"
            onClick={load}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
          >
            <RefreshCw className="h-4 w-4" />
            به‌روزرسانی
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900">
            مشاهدات قیمت ({toFa(total)} مورد)
          </h2>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          )}
        </div>
        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="max-h-[600px] overflow-auto rounded-xl border border-zinc-200">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-[11px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2.5 font-bold">آگهی / برند / دسته</th>
                <th className="px-3 py-2.5 font-bold">قیمت</th>
                <th className="px-3 py-2.5 font-bold">منبع</th>
                <th className="px-3 py-2.5 font-bold">وضعیت</th>
                <th className="px-3 py-2.5 font-bold">اطمینان</th>
                <th className="px-3 py-2.5 font-bold">تاریخ مشاهده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-zinc-400">
                    موردی یافت نشد.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-zinc-800">
                      {r.listingSlug ? (
                        <a
                          href={`/listings/${r.listingSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#F58220]"
                        >
                          {r.listingTitle ?? "—"}
                        </a>
                      ) : (
                        r.listingTitle ?? "(بدون آگهی)"
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {r.brandName ?? "—"} · {r.categoryName ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700">
                    {r.askingPrice != null
                      ? formatCompactPrice(r.askingPrice)
                      : r.estimatedPrice != null
                        ? formatCompactPrice(r.estimatedPrice)
                        : "—"}
                    {r.priceLower != null && r.priceUpper != null && (
                      <div className="text-[10px] text-zinc-400">
                        {formatCompactPrice(r.priceLower)} -{" "}
                        {formatCompactPrice(r.priceUpper)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">
                      {SOURCE_LABEL[r.source] ?? r.source}
                    </span>
                    {r.sourceType && (
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        {r.sourceType}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        r.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : r.status === "FLAGGED"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-600">
                    {r.confidence ?? "—"}
                    {r.comparableCount != null && (
                      <div className="text-[10px] text-zinc-400">
                        n={toFa(r.comparableCount)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">
                    {faDate(r.observedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── OverridesTab ─────────────────── */

function OverridesTab({ initialOverrides }: { initialOverrides: Override[] }) {
  const [overrides, setOverrides] = useState<Override[]>(initialOverrides);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; title: string; slug: string; price: string | null }>
  >([]);
  const [selected, setSelected] = useState<string>("");
  const [overridePrice, setOverridePrice] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/listings?q=${encodeURIComponent(q)}&limit=10`,
        );
        const json = await res.json();
        if (!cancelled) setResults(json.data ?? []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const submit = async () => {
    setError(null);
    setOk(null);
    if (!selected) return setError("یک آگهی انتخاب کنید.");
    const p = Number(overridePrice);
    if (!Number.isFinite(p) || p <= 0)
      return setError("قیمت اصلاحی نامعتبر است.");
    if (reason.trim().length < 3)
      return setError("دلیل اصلاح را ذکر کنید (حداقل ۳ حرف).");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/pricing/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selected,
          overridePrice: p,
          reason: reason.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "submit failed");
      }
      setOk("اصلاح با موفقیت ثبت شد.");
      setSelected("");
      setOverridePrice("");
      setReason("");
      setQuery("");
      // Refresh list
      const fresh = await fetch("/api/admin/pricing/observations?limit=1").then(
        (r) => r.ok,
      );
      // Note: overrides list isn't exposed via API — re-read by reloading.
      // The simplest path is to surface the new override at top.
      if (fresh) {
        setOverrides((prev) => [
          {
            id: "new-" + Date.now(),
            listingId: selected,
            listingTitle: results.find((r) => r.id === selected)?.title ?? "—",
            listingSlug: results.find((r) => r.id === selected)?.slug ?? null,
            originalEstimate: 0,
            overridePrice: p,
            reason: reason.trim(),
            overriddenBy: "ADMIN",
            overriddenAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setError(err?.message ?? "خطا در ثبت اصلاح");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_460px]">
      {/* List */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-zinc-900">
          اصلاحات دستی ثبت‌شده ({toFa(overrides.length)} مورد)
        </h2>
        <div className="max-h-[600px] space-y-2 overflow-auto pl-1">
          {overrides.length === 0 && (
            <div className="py-10 text-center text-sm text-zinc-400">
              هنوز اصلاحی ثبت نشده است.
            </div>
          )}
          {overrides.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-zinc-800">
                    {o.listingSlug ? (
                      <a
                        href={`/listings/${o.listingSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#F58220]"
                      >
                        {o.listingTitle ?? "—"}
                      </a>
                    ) : (
                      o.listingTitle ?? "—"
                    )}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {o.reason}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    توسط {o.overriddenBy ?? "—"} · {faDate(o.overriddenAt)}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-[#F58220]">
                    {formatCompactPrice(o.overridePrice)}
                  </div>
                  {o.originalEstimate > 0 && (
                    <div className="text-[10px] text-zinc-400 line-through">
                      {formatCompactPrice(o.originalEstimate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-zinc-900">
          ثبت اصلاح دستی جدید
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              جستجوی آگهی
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="عنوان آگهی…"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-[#F58220]"
            />
            {results.length > 0 && (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-zinc-100 p-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelected(r.id);
                      setQuery(r.title);
                      setResults([]);
                    }}
                    className={`block w-full rounded-lg px-3 py-2 text-right text-sm transition ${
                      selected === r.id
                        ? "bg-[#F58220]/10 text-[#F58220]"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="truncate font-semibold">{r.title}</div>
                    {r.price != null && (
                      <div className="text-[11px] text-zinc-500">
                        {formatCompactPrice(BigInt(r.price))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              قیمت اصلاحی (تومان)
            </label>
            <input
              type="number"
              value={overridePrice}
              onChange={(e) => setOverridePrice(e.target.value)}
              placeholder="مثلاً ۸۵۰۰۰۰۰۰۰۰"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-[#F58220]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              دلیل اصلاح
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="مثلاً بازدید حضوری انجام شد، وضعیت واقعی دستگاه متفاوت از مشخصات آگهی است…"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-[#F58220]"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}
          {ok && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {ok}
            </div>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-4 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListChecks className="h-4 w-4" />
            )}
            ثبت اصلاح
          </button>
          <p className="text-[11px] leading-5 text-zinc-400">
            هر اصلاح با مشخصات کاربر، زمان، دلیل و مقدار قبل/بعد در لاگ ممیزی
            ثبت می‌شود (سند §13).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── HistoryTab ─────────────────── */

function HistoryTab({
  categories,
  brands,
}: {
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
}) {
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [months, setMonths] = useState("12");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId || !categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pricing/history?brandId=${brandId}&categoryId=${categoryId}&months=${months}`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setPoints(json.points ?? []);
    } catch (err: any) {
      setError(err?.message ?? "خطا");
    } finally {
      setLoading(false);
    }
  }, [brandId, categoryId, months]);

  useEffect(() => {
    if (brandId && categoryId) load();
  }, [brandId, categoryId, months, load]);

  // Chart bounds
  const allPrices = points
    .map((p) => p.medianPrice)
    .filter((p): p is number => p != null);
  const allRangeMax = points
    .map((p) => p.range?.[1] ?? null)
    .filter((p): p is number => p != null);
  const allRangeMin = points
    .map((p) => p.range?.[0] ?? null)
    .filter((p): p is number => p != null);
  const maxPrice = Math.max(...allRangeMax, ...allPrices, 1);
  const minPrice = Math.min(...allRangeMin, ...allPrices, 0);
  const span = Math.max(1, maxPrice - minPrice);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label="برند"
            value={brandId}
            onChange={setBrandId}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            label="دسته"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="بازه زمانی"
            value={months}
            onChange={setMonths}
            options={[
              { value: "6", label: "۶ ماه اخیر" },
              { value: "12", label: "۱۲ ماه اخیر" },
              { value: "24", label: "۲۴ ماه اخیر" },
              { value: "36", label: "۳۶ ماه اخیر" },
            ]}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900">
            تاریخچه قیمت ماهانه (میانه)
          </h2>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          )}
        </div>
        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {!brandId || !categoryId ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            برند و دسته‌بندی را برای مشاهده تاریخچه قیمت انتخاب کنید.
          </div>
        ) : points.length === 0 && !loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            داده‌ای در این بازه موجود نیست.
          </div>
        ) : (
          <div>
            {/* Bars */}
            <div className="flex h-64 items-end gap-1.5 overflow-x-auto border-b border-zinc-200 pb-3">
              {points.map((p) => {
                const med = p.medianPrice;
                const heightPct =
                  med != null
                    ? Math.max(
                        4,
                        ((med - minPrice) / span) * 100,
                      )
                    : 2;
                const rangeTopPct =
                  p.range && p.range[1] != null
                    ? ((p.range[1] - minPrice) / span) * 100
                    : null;
                const rangeBottomPct =
                  p.range && p.range[0] != null
                    ? ((p.range[0] - minPrice) / span) * 100
                    : null;
                return (
                  <div
                    key={p.month}
                    className="group relative flex h-full min-w-[26px] flex-1 flex-col justify-end"
                    title={`${p.month} · ${
                      med != null ? formatCompactPrice(med) : "بدون داده"
                    } · n=${p.count}`}
                  >
                    {/* Range indicator */}
                    {rangeTopPct != null && rangeBottomPct != null && (
                      <div
                        className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-[#F58220]/25"
                        style={{
                          bottom: `${rangeBottomPct}%`,
                          height: `${Math.max(2, rangeTopPct - rangeBottomPct)}%`,
                        }}
                      />
                    )}
                    {/* Median bar */}
                    <div
                      className={`relative w-full rounded-t-md transition-all ${
                        med != null
                          ? "bg-[#F58220] group-hover:bg-[#ff8c38]"
                          : "bg-zinc-100"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="mt-1 text-center text-[9px] text-zinc-400">
                      {p.month.split("-")[1]}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend + summary */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#F58220]" />
                قیمت میانه ماهانه
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#F58220]/25" />
                بازه کمینه/بیشینه
              </div>
              <div className="mr-auto">
                مجموع مشاهدات:{" "}
                <span className="font-bold text-zinc-700">
                  {toFa(points.reduce((s, p) => s + p.count, 0))}
                </span>
              </div>
            </div>
            {/* Table */}
            <div className="mt-5 max-h-60 overflow-auto rounded-xl border border-zinc-100">
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 bg-zinc-50 text-[10px] uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-bold">ماه</th>
                    <th className="px-3 py-2 font-bold">میانه</th>
                    <th className="px-3 py-2 font-bold">کمینه</th>
                    <th className="px-3 py-2 font-bold">بیشینه</th>
                    <th className="px-3 py-2 font-bold">تعداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[...points].reverse().map((p) => (
                    <tr key={p.month} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 text-zinc-700">{p.month}</td>
                      <td className="px-3 py-2 text-zinc-700">
                        {p.medianPrice != null
                          ? formatCompactPrice(p.medianPrice)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {p.range?.[0] != null
                          ? formatCompactPrice(p.range[0])
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {p.range?.[1] != null
                          ? formatCompactPrice(p.range[1])
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {toFa(p.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Shared bits ─────────────────── */

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber" | "orange" | "zinc";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : accent === "amber"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : accent === "orange"
          ? "text-orange-700 bg-orange-50 border-orange-200"
          : "text-zinc-700 bg-zinc-50 border-zinc-200";
  return (
    <div className={`rounded-xl border p-3 ${accentClass}`}>
      <div className="text-[10px] font-bold uppercase opacity-70">{label}</div>
      <div className="mt-0.5 text-sm font-black">{value}</div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-zinc-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#F58220]"
      >
        <option value="">— همه —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
