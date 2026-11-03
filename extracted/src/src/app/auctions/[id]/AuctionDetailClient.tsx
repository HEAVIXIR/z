"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gavel,
  Clock,
  TrendingUp,
  Trophy,
  Users,
  CalendarClock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  MapPin,
  Calendar,
  Gauge,
  Info,
  ShieldCheck,
} from "lucide-react";
import {
  toFa,
  formatFullPrice,
  formatCompactPrice,
  faDate,
  CONDITION_LABELS,
} from "@/lib/format";

/* ============================================================
   AuctionDetailClient — bidding UI + countdown + bid history.
   Receives the initial payload from the server component and
   re-fetches the public detail API on bid submission so the new
   state (currentBid, minimumNextBid, bid history) renders without
   a full page reload.
   ============================================================ */

type InitialBid = {
  id: string;
  bidderName: string;
  amount: string;
  createdAt: string;
  isWinning: boolean;
  isLeading: boolean;
};

type Initial = {
  id: string;
  title: string;
  description: string | null;
  startPrice: string;
  reservePrice: string | null;
  minIncrement: string;
  startDate: string;
  endDate: string;
  status: string;
  liveStatus: "LIVE" | "UPCOMING" | "ENDED";
  winningBid: string | null;
  winnerName: string | null;
  inspectionReport: string | null;
  currentBid: string;
  minimumNextBid: string;
  bidCount: number;
  bids: InitialBid[];
  listing: {
    id: string;
    slug: string;
    title: string;
    shortDesc: string | null;
    description: string | null;
    condition: string | null;
    year: number | null;
    workingHours: number | null;
    city: string | null;
    province: string | null;
    price: string | null;
    brand: { name: string } | null;
    category: { name: string; icon: string | null } | null;
    images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
  };
};

export default function AuctionDetailClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [data, setData] = useState<Initial>(initial);
  const [now, setNow] = useState<number>(Date.now());
  const [bidAmount, setBidAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tick every second for the countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for new bids while LIVE (every 15s) — best-effort refresh.
  useEffect(() => {
    if (data.liveStatus !== "LIVE") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/auctions/${data.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.auction) {
          setData((prev) => ({ ...prev, ...json.auction }));
        }
      } catch {
        /* swallow */
      }
    }, 15000);
    return () => clearInterval(t);
  }, [data.id, data.liveStatus]);

  const startMs = new Date(data.startDate).getTime();
  const endMs = new Date(data.endDate).getTime();
  const remaining = Math.max(0, endMs - now);
  const countdown = formatCountdown(remaining);

  const liveStatus = useMemo(() => {
    if (data.liveStatus === "ENDED") return "ENDED" as const;
    if (now < startMs) return "UPCOMING" as const;
    if (now > endMs) return "ENDED" as const;
    return "LIVE" as const;
  }, [data.liveStatus, now, startMs, endMs]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amount = bidAmount.replace(/[^\d]/g, "");
    if (!amount) {
      setError("مبلغ پیشنهاد را وارد کنید");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${data.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?redirect=" + encodeURIComponent(`/auctions/${data.id}`));
          return;
        }
        throw new Error(json?.error ?? "ثبت پیشنهاد ناموفق بود");
      }
      setSuccess(`پیشنهاد شما به مبلغ ${Number(amount).toLocaleString("fa-IR")} تومان ثبت شد`);
      setBidAmount("");
      // Refresh auction state from server.
      const detailRes = await fetch(`/api/auctions/${data.id}`, { cache: "no-store" });
      const detailJson = await detailRes.json().catch(() => null);
      if (detailJson?.auction) {
        setData((prev) => ({ ...prev, ...detailJson.auction }));
      }
    } catch (err: any) {
      setError(err?.message ?? "خطا در ثبت پیشنهاد");
    } finally {
      setSubmitting(false);
    }
  };

  const listing = data.listing;
  const heroImage = listing.images[0]?.url ?? null;

  const inputCls =
    "h-12 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ── LEFT: listing info + bid history ── */}
      <div className="space-y-5">
        {/* Listing card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
          <div className="grid gap-0 sm:grid-cols-[420px_1fr]">
            {/* Image */}
            <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c] sm:aspect-auto">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={data.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center text-7xl">
                  {listing.category?.icon ?? "🔨"}
                </div>
              )}
              <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-3 py-1 text-[10px] font-black text-white">
                <Gavel className="h-3 w-3" />
                مزایده
              </div>
            </div>

            {/* Body */}
            <div className="p-5 lg:p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-white/45">
                {listing.brand && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 font-bold text-white/65">
                    {listing.brand.name}
                  </span>
                )}
                {listing.category && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/55">
                    {listing.category.icon} {listing.category.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-white lg:text-2xl">{data.title}</h1>
              {listing.shortDesc && (
                <p className="mt-2 text-xs leading-6 text-white/55">{listing.shortDesc}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {listing.year && (
                  <SpecRow icon={<Calendar className="h-3.5 w-3.5" />} label="سال ساخت" value={toFa(listing.year)} />
                )}
                {listing.workingHours != null && (
                  <SpecRow icon={<Gauge className="h-3.5 w-3.5" />} label="کارکرد" value={`${toFa(listing.workingHours)} ساعت`} />
                )}
                {listing.condition && (
                  <SpecRow icon={<ShieldCheck className="h-3.5 w-3.5" />} label="وضعیت" value={CONDITION_LABELS[listing.condition] ?? listing.condition} />
                )}
                {(listing.city || listing.province) && (
                  <SpecRow
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label="موقعیت"
                    value={[listing.province, listing.city].filter(Boolean).join("، ")}
                  />
                )}
              </div>

              {data.description && (
                <div className="mt-4 rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-[10px] font-bold text-white/40">شرح مزایده</p>
                  <p className="mt-1 text-xs leading-6 text-white/65">{data.description}</p>
                </div>
              )}

              <Link
                href={`/listings/${listing.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#F58220] hover:underline"
              >
                مشاهده آگهی کامل دستگاه ←
              </Link>
            </div>
          </div>
        </div>

        {/* Bid history */}
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-base font-black text-white">تاریخچه پیشنهادها</h2>
            <span className="text-xs text-white/40">({toFa(data.bidCount)} پیشنهاد)</span>
          </div>

          {data.bids.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/40">
              هنوز پیشنهادی ثبت نشده. اولین پیشنهاد‌دهنده باشید!
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-2xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-white/5 bg-[#0b0b0b] text-white/45">
                  <tr>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold">پیشنهاددهنده</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold">مبلغ</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold">زمان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.bids.map((b, idx) => (
                    <tr key={b.id} className={idx === 0 ? "bg-[#F58220]/[0.06]" : ""}>
                      <td className="px-4 py-2.5 text-xs font-bold text-white">
                        {b.bidderName}
                        {b.isLeading && (
                          <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                            <TrendingUp className="h-2.5 w-2.5" />
                            پیشرو
                          </span>
                        )}
                        {b.isWinning && liveStatus === "ENDED" && (
                          <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                            <Trophy className="h-2.5 w-2.5" />
                            برنده
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-black text-[#F58220]" dir="ltr">
                        {Number(b.amount).toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-white/45">
                        {faDate(b.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: status + bid panel ── */}
      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        {/* Status header */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0d0d0d] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-white/40">وضعیت مزایده</span>
            <StatusBadge liveStatus={liveStatus} />
          </div>

          {/* Countdown */}
          {liveStatus === "LIVE" && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-center">
              <p className="mb-1 text-[10px] font-bold text-emerald-400">زمان باقی‌مانده</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white" dir="ltr">
                {countdown}
              </p>
            </div>
          )}
          {liveStatus === "UPCOMING" && (
            <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4 text-center">
              <p className="mb-1 text-[10px] font-bold text-blue-400">شروع از</p>
              <p className="text-sm font-black text-white">{faDate(data.startDate)}</p>
              <p className="mt-1 font-mono text-xs text-white/55" dir="ltr">
                {new Date(data.startDate).toLocaleTimeString("fa-IR")}
              </p>
            </div>
          )}
          {liveStatus === "ENDED" && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-center">
              <p className="mb-1 text-[10px] font-bold text-amber-400">مزایده پایان یافته</p>
              {data.winnerName ? (
                <p className="text-sm font-black text-white">
                  برنده: {data.winnerName}
                </p>
              ) : (
                <p className="text-xs text-white/55">برنده‌ای اعلام نشده</p>
              )}
              {data.winningBid && (
                <p className="mt-1 text-xs text-[#F58220]" dir="ltr">
                  {Number(data.winningBid).toLocaleString("fa-IR")} تومان
                </p>
              )}
            </div>
          )}

          {/* Current bid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
              <p className="text-[10px] text-white/40">بالاترین پیشنهاد</p>
              <p className="mt-1 text-sm font-black text-[#F58220]" dir="ltr">
                {Number(data.currentBid).toLocaleString("fa-IR")}
              </p>
              <p className="mt-0.5 text-[9px] text-white/35">تومان</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
              <p className="text-[10px] text-white/40">حداقل پیشنهاد بعدی</p>
              <p className="mt-1 text-sm font-black text-white" dir="ltr">
                {Number(data.minimumNextBid).toLocaleString("fa-IR")}
              </p>
              <p className="mt-0.5 text-[9px] text-white/35">تومان</p>
            </div>
          </div>

          {/* Config */}
          <div className="mt-3 space-y-1.5 rounded-2xl border border-white/5 bg-black/20 p-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-white/45">قیمت شروع</span>
              <span className="font-bold text-white" dir="ltr">
                {formatFullPrice(BigInt(data.startPrice))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/45">حداقل افزایش</span>
              <span className="font-bold text-white" dir="ltr">
                {formatFullPrice(BigInt(data.minIncrement))}
              </span>
            </div>
            {data.reservePrice && (
              <div className="flex justify-between">
                <span className="text-white/45">قیمت رزرو</span>
                <span className="font-bold text-white/70" dir="ltr">
                  {formatCompactPrice(BigInt(data.reservePrice))}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="inline-flex items-center gap-1 text-white/45">
                <CalendarClock className="h-3 w-3" />
                پایان
              </span>
              <span className="font-bold text-white">{faDate(data.endDate)}</span>
            </div>
          </div>
        </div>

        {/* Bid form */}
        {liveStatus === "LIVE" && (
          <form
            onSubmit={submit}
            className="rounded-3xl border border-white/10 bg-[#111] p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Gavel className="h-4 w-4 text-[#F58220]" />
              <h3 className="text-sm font-black text-white">ثبت پیشنهاد</h3>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-xs font-bold text-red-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <label className="mb-1.5 block text-[11px] font-bold text-white/55">
              مبلغ پیشنهاد (تومان)
            </label>
            <input
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={`حداقل ${Number(data.minimumNextBid).toLocaleString("en-US")}`}
              dir="ltr"
              className={inputCls}
              inputMode="numeric"
            />
            <p className="mt-1.5 text-[10px] text-white/35">
              حداقل پیشنهاد بعدی: <span className="font-bold text-white/55" dir="ltr">{Number(data.minimumNextBid).toLocaleString("fa-IR")}</span> تومان
            </p>

            <button
              type="submit"
              disabled={submitting || !bidAmount}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gavel className="h-4 w-4" />
              )}
              {submitting ? "در حال ثبت..." : "ثبت پیشنهاد"}
            </button>

            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-5 text-white/40">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              برای ثبت پیشنهاد باید وارد حساب کاربری خود شوید. با ثبت پیشنهاد، قوانین مزایده را می‌پذیرید.
            </p>
          </form>
        )}

        {liveStatus === "UPCOMING" && (
          <div className="rounded-3xl border border-white/10 bg-[#111] p-5 text-center">
            <CalendarClock className="mx-auto mb-2 h-8 w-8 text-blue-400" />
            <p className="text-sm font-bold text-white">مزایده هنوز آغاز نشده</p>
            <p className="mt-1 text-xs text-white/45">
              شروع از {faDate(data.startDate)}
            </p>
          </div>
        )}

        {liveStatus === "ENDED" && (
          <div className="rounded-3xl border border-white/10 bg-[#111] p-5 text-center">
            <Trophy className="mx-auto mb-2 h-8 w-8 text-amber-400" />
            <p className="text-sm font-bold text-white">مزایده پایان یافته است</p>
            {data.winnerName ? (
              <p className="mt-1 text-xs text-white/55">برنده: {data.winnerName}</p>
            ) : (
              <p className="mt-1 text-xs text-white/55">برنده‌ای اعلام نشده</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function SpecRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
      <span className="text-[#F58220]">{icon}</span>
      <div>
        <p className="text-[9px] text-white/40">{label}</p>
        <p className="text-[11px] font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ liveStatus }: { liveStatus: "LIVE" | "UPCOMING" | "ENDED" }) {
  if (liveStatus === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black text-emerald-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        در حال برگزاری
      </span>
    );
  }
  if (liveStatus === "UPCOMING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-black text-blue-400">
        <Clock className="h-2.5 w-2.5" />
        رو به برگزاری
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/15 px-3 py-1 text-[10px] font-black text-white/60">
      پایان یافته
    </span>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "۰۰:۰۰:۰۰";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => toFa(String(n).padStart(2, "0"));
  if (d > 0) return `${toFa(d)} روز ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
