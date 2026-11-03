"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Gavel,
  Loader2,
  Plus,
  RefreshCw,
  X,
  Sparkles,
  Calendar,
  TrendingUp,
  Users,
} from "lucide-react";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";

/* ============================================================
   /admin/auctions — auction management dashboard
   List auctions + create new auction modal.
   ============================================================ */

type Auction = {
  id: string;
  listingId: string;
  title: string;
  description: string | null;
  startPrice: string;
  reservePrice: string | null;
  minIncrement: string;
  startDate: string;
  endDate: string;
  status: string;
  statusLabel: string;
  winningBid: string | null;
  winnerName: string | null;
  bidCount: number;
  listing: {
    id: string;
    title: string;
    slug: string;
    price: string | null;
  };
};

const STATUS_CLS: Record<string, string> = {
  SCHEDULED: "bg-zinc-100 text-zinc-600",
  LIVE: "bg-emerald-100 text-emerald-700",
  ENDED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const INPUT_CLS =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auctions");
      const json = await res.json();
      if (json.success) {
        setAuctions(json.data || []);
        setStats(json.stats);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Gavel className="h-6 w-6 text-[#F58220]" />
            مزایده ماشین‌آلات
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            ایجاد و مدیریت مزایده‌ها برای آگهی‌های انتخاب‌شده
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-3.5 w-3.5" />
            مزایده جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="کل مزایده‌ها" value={stats.total} />
          <StatCard label="در حال برگزاری" value={stats.live} tone="emerald" />
          <StatCard label="زمان‌بندی‌شده" value={stats.scheduled} tone="blue" />
          <StatCard label="پایان‌یافته" value={stats.ended} tone="amber" />
          <StatCard label="کل پیشنهادها" value={stats.totalBids} tone="violet" />
        </div>
      )}

      {/* Auctions list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : auctions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز مزایده‌ای ایجاد نشده. روی «مزایده جدید» کلیک کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-zinc-900">
                      {a.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_CLS[a.status] || "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {a.statusLabel}
                    </span>
                  </div>
                  <Link
                    href={`/listings/${a.listing.slug}`}
                    target="_blank"
                    className="mt-1 inline-block text-xs text-[#F58220] hover:underline"
                  >
                    آگهی مرتبط: {a.listing.title}
                  </Link>
                </div>
                <div className="shrink-0 text-left">
                  <p className="text-[11px] text-zinc-400">قیمت شروع</p>
                  <p className="text-sm font-black text-zinc-900">
                    {formatCompactPrice(BigInt(a.startPrice))}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3 text-xs sm:grid-cols-4">
                <Info label="حداقل افزایش" value={formatCompactPrice(BigInt(a.minIncrement))} />
                <Info
                  label="قیمت رزرو"
                  value={
                    a.reservePrice ? formatCompactPrice(BigInt(a.reservePrice)) : "ندارد"
                  }
                />
                <Info
                  label="بالاترین پیشنهاد"
                  value={
                    a.winningBid
                      ? formatCompactPrice(BigInt(a.winningBid))
                      : a.winnerName ?? "—"
                  }
                />
                <Info label="تعداد پیشنهادها" value={toFa(a.bidCount)} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#F58220]" />
                  شروع: {faDate(a.startDate)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#F58220]" />
                  پایان: {faDate(a.endDate)}
                </span>
                {a.status === "LIVE" && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                    در حال برگزاری
                  </span>
                )}
                {a.bidCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {toFa(a.bidCount)} پیشنهاد
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <CreateAuctionModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "red" | "amber" | "blue" | "violet";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-zinc-700">{value}</p>
    </div>
  );
}

function CreateAuctionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [listingSearch, setListingSearch] = useState("");
  const [listings, setListings] = useState<Array<{ id: string; title: string; price: string | null }>>([]);
  const [listingId, setListingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startPrice, setStartPrice] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [minIncrement, setMinIncrement] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search listings (admin endpoint)
  useEffect(() => {
    const q = listingSearch.trim();
    if (q.length < 2) {
      setListings([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/admin/listings?q=${encodeURIComponent(q)}&limit=10`)
      .then((r) => r.json())
      .then((json) => {
        const items = (json.listings || json.data || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          price: l.price ? l.price.toString() : null,
        }));
        setListings(items);
      })
      .catch(() => setListings([]));
    return () => ctrl.abort();
  }, [listingSearch]);

  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!listingId) {
      setError("یک آگهی انتخاب کنید");
      return;
    }
    if (!title.trim()) {
      setError("عنوان مزایده الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          title: title.trim(),
          description: description || undefined,
          startPrice: onlyDigits(startPrice),
          reservePrice: reservePrice ? onlyDigits(reservePrice) : undefined,
          minIncrement: onlyDigits(minIncrement),
          startDate,
          endDate,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "خطا در ایجاد مزایده");
      }
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? "خطای سرور");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-900">ایجاد مزایده جدید</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Listing picker */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              جستجوی آگهی <span className="text-red-500">*</span>
            </label>
            <input
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              placeholder="عنوان آگهی را بنویسید..."
              className={INPUT_CLS}
            />
            {listings.length > 0 && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
                {listings.map((l) => (
                  <button
                    type="button"
                    key={l.id}
                    onClick={() => {
                      setListingId(l.id);
                      setTitle(l.title);
                      setListingSearch(l.title);
                      setListings([]);
                      if (l.price && !startPrice) setStartPrice(l.price);
                    }}
                    className={`block w-full px-3 py-2 text-right text-xs transition hover:bg-[#F58220]/5 ${
                      listingId === l.id ? "bg-[#F58220]/10 font-bold text-[#F58220]" : "text-zinc-700"
                    }`}
                  >
                    {l.title}
                    {l.price && (
                      <span className="mr-2 text-[10px] text-zinc-400">
                        ({formatCompactPrice(BigInt(l.price))})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {listingId && (
              <p className="mt-2 text-[11px] font-bold text-emerald-600">
                ✓ آگهی انتخاب شد
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              عنوان مزایده <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLS}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              توضیحات
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                قیمت شروع (تومان) <span className="text-red-500">*</span>
              </label>
              <input
                value={startPrice}
                onChange={(e) => setStartPrice(onlyDigits(e.target.value))}
                dir="ltr"
                className={INPUT_CLS}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                قیمت رزرو (اختیاری)
              </label>
              <input
                value={reservePrice}
                onChange={(e) => setReservePrice(onlyDigits(e.target.value))}
                dir="ltr"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                حداقل افزایش <span className="text-red-500">*</span>
              </label>
              <input
                value={minIncrement}
                onChange={(e) => setMinIncrement(onlyDigits(e.target.value))}
                dir="ltr"
                className={INPUT_CLS}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                تاریخ شروع <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                dir="ltr"
                className={INPUT_CLS}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                تاریخ پایان <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                dir="ltr"
                className={INPUT_CLS}
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              ایجاد مزایده
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
