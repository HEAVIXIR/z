"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Search,
  X,
  ArrowLeft,
  GitCompare,
  CheckCircle2,
  Minus,
} from "lucide-react";
import { toFa, formatCompactPrice, PRICE_TYPE_LABELS, CONDITION_LABELS } from "@/lib/format";

type CompareListing = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  description?: string | null;
  price: string | null;
  priceType: string;
  condition?: string | null;
  year: number | null;
  workingHours: number | null;
  city: string | null;
  province: string | null;
  brandName: string | null;
  categoryName: string | null;
  image: string | null;
  icon?: string | null;
  viewCount: number;
  featured: boolean;
  verified: boolean;
};

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  price: string | null;
  brandName: string | null;
  image: string | null;
  icon?: string | null;
};

export default function ComparePageClient({
  categories,
}: {
  categories: { id: string; name: string; slug: string; parentId: string | null; icon?: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [listings, setListings] = useState<CompareListing[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize from URL ?ids=a,b,c
  useEffect(() => {
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      setSelectedIds(ids);
    }
  }, [searchParams]);

  // Fetch selected listings
  const fetchListings = useCallback(async () => {
    if (selectedIds.length === 0) {
      setListings([]);
      return;
    }
    try {
      const res = await fetch(`/api/compare?ids=${selectedIds.join(",")}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (Array.isArray(data.listings)) {
        setListings(data.listings);
      }
    } catch {
      setListings([]);
    }
  }, [selectedIds]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Update URL when ids change
  useEffect(() => {
    const ids = selectedIds.join(",");
    const sp = new URLSearchParams(searchParams.toString());
    if (ids) sp.set("ids", ids);
    else sp.delete("ids");
    const qs = sp.toString();
    router.replace(qs ? `/compare?${qs}` : "/compare", { scroll: false });
     
  }, [selectedIds]);

  // Search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/listings?q=${encodeURIComponent(search)}&limit=10`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (Array.isArray(data.listings)) {
          setResults(data.listings);
        } else if (Array.isArray(data)) {
          setResults(data);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addListing = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= 3) return;
    setSelectedIds([...selectedIds, id]);
    setSearch("");
    setResults([]);
  };

  const removeListing = (id: string) => {
    setSelectedIds(selectedIds.filter((x) => x !== id));
  };

  const specs: {
    key: string;
    label: string;
    render: (l: CompareListing) => React.ReactNode;
  }[] = [
    {
      key: "price",
      label: "قیمت",
      render: (l) =>
        l.price ? formatCompactPrice(Number(l.price)) : PRICE_TYPE_LABELS[l.priceType] ?? "تماس",
    },
    { key: "brandName", label: "برند", render: (l) => l.brandName ?? "—" },
    { key: "categoryName", label: "دسته‌بندی", render: (l) => l.categoryName ?? "—" },
    {
      key: "condition",
      label: "وضعیت",
      render: (l) => (l.condition ? CONDITION_LABELS[l.condition] ?? l.condition : "—"),
    },
    { key: "year", label: "سال ساخت", render: (l) => (l.year ? toFa(l.year) : "—") },
    {
      key: "workingHours",
      label: "ساعت کارکرد",
      render: (l) => (l.workingHours != null ? `${toFa(l.workingHours)} ساعت` : "—"),
    },
    { key: "city", label: "شهر", render: (l) => l.city ?? "—" },
    { key: "province", label: "استان", render: (l) => l.province ?? "—" },
    { key: "viewCount", label: "بازدید", render: (l) => `${toFa(l.viewCount)}` },
    {
      key: "featured",
      label: "آگهی ویژه",
      render: (l) =>
        l.featured ? (
          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
        ) : (
          <Minus className="mx-auto h-4 w-4 text-white/30" />
        ),
    },
    {
      key: "verified",
      label: "تأییدشده",
      render: (l) =>
        l.verified ? (
          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
        ) : (
          <Minus className="mx-auto h-4 w-4 text-white/30" />
        ),
    },
  ];

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={categories} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-4 py-1.5">
              <GitCompare className="h-3.5 w-3.5 text-[#F58220]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F58220]">
                COMPARE MACHINES
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-black text-white lg:text-5xl">
              مقایسهٔ ماشین‌آلات
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
              ۲ تا ۳ دستگاه را انتخاب کنید و مشخصات آن‌ها را کنار هم ببینید
            </p>
          </div>

          {/* Search box */}
          <div className="relative mx-auto mb-10 max-w-2xl">
            <div className="flex h-14 items-center overflow-hidden rounded-2xl border border-white/10 bg-[#111] px-5">
              <Search className="h-5 w-5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="عنوان دستگاه را برای افزودن به مقایسه جستجو کنید..."
                className="mr-3 h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              {selectedIds.length > 0 && (
                <span className="rounded-full bg-[#F58220]/15 px-3 py-1 text-[11px] font-bold text-[#F58220]">
                  {toFa(selectedIds.length)} از {toFa(3)}
                </span>
              )}
            </div>

            {/* Search results */}
            {search.trim() && (
              <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
                {loading ? (
                  <div className="p-4 text-center text-xs text-white/40">
                    در حال جستجو...
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/40">
                    نتیجه‌ای یافت نشد.
                  </div>
                ) : (
                  results.map((r) => {
                    const isSelected = selectedIds.includes(r.id);
                    const isFull = selectedIds.length >= 3;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={isSelected || isFull}
                        onClick={() => addListing(r.id)}
                        className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-right transition hover:bg-white/[0.04] disabled:opacity-40"
                      >
                        <span className="h-12 w-16 overflow-hidden rounded-lg bg-[#1f1f1f]">
                          {r.image ? (
                             
                            <img
                              src={r.image}
                              alt={r.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xl">
                              {r.icon ?? "🚜"}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">
                            {r.title}
                          </p>
                          <p className="text-[11px] text-white/45">
                            {r.brandName ?? "—"}
                            {r.price ? ` · ${formatCompactPrice(Number(r.price))}` : ""}
                          </p>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <span className="text-xs font-bold text-[#F58220]">
                            + افزودن
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Comparison table */}
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <GitCompare className="mx-auto h-12 w-12 text-white/20" />
              <p className="mt-4 text-sm text-white/50">
                هنوز دستگاهی برای مقایسه اضافه نکرده‌اید.
              </p>
              <p className="mt-1 text-xs text-white/35">
                با جستجو در کادر بالا، ۲ یا ۳ دستگاه اضافه کنید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#111]">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="w-40 px-4 py-5 text-right text-xs font-bold uppercase tracking-wider text-white/40">
                      مشخصات
                    </th>
                    {listings.map((l) => (
                      <th key={l.id} className="px-4 py-5 text-right">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => removeListing(l.id)}
                            className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition hover:bg-red-500/30"
                            aria-label="حذف از مقایسه"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="mb-3 aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                            {l.image ? (
                               
                              <img
                                src={l.image}
                                alt={l.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-5xl">
                                {l.icon ?? "🚜"}
                              </div>
                            )}
                          </div>
                          <Link
                            href={`/listings/${l.slug}`}
                            target="_blank"
                            className="block text-right text-sm font-bold leading-6 text-white transition hover:text-[#F58220]"
                          >
                            {l.title}
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec, idx) => (
                    <tr
                      key={spec.key}
                      className={
                        idx % 2 === 0
                          ? "border-b border-white/5 bg-white/[0.01]"
                          : "border-b border-white/5"
                      }
                    >
                      <td className="px-4 py-3 text-xs font-bold text-white/55">
                        {spec.label}
                      </td>
                      {listings.map((l) => (
                        <td
                          key={l.id}
                          className="px-4 py-3 text-center text-sm text-white"
                        >
                          {spec.render(l)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#F58220]"
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
              بازگشت به خانه
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
