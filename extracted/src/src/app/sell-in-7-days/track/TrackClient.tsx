"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  BadgeDollarSign,
  FileSignature,
  XCircle,
  Calendar,
} from "lucide-react";
import { toFa, formatFullPrice, faDate } from "@/lib/format";

/* ============================================================
   SellIn7TrackClient — enter a tracking code, see status +
   current step + timeline. Reads ?code= on mount (initialCode).
   ============================================================ */

type App = {
  id: string;
  trackingCode: string;
  deviceName: string;
  sellerName: string;
  sellerMobile: string;
  sellerEmail: string | null;
  modelName: string | null;
  year: number | null;
  workingHours: number | null;
  condition: string | null;
  province: string | null;
  city: string | null;
  expectedPrice: string | null;
  description: string | null;
  prepaymentPaid: boolean;
  prepaymentAmount: string | null;
  status: string;
  currentStep: number;
  inspectionDate: string | null;
  valuationPrice: string | null;
  salePrice: string | null;
  commissionAmount: string | null;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PREPAYMENT: "در انتظار پیش‌پرداخت",
  PREPAYMENT_PAID: "پیش‌پرداخت پرداخت شد",
  INSPECTION_SCHEDULED: "کارشناسی برنامه‌ریزی شد",
  INSPECTED: "کارشناسی انجام شد",
  VALUATION_DONE: "ارزش‌گذاری انجام شد",
  LISTED: "برای فروش ارائه شد",
  SOLD: "فروخته شد",
  CANCELLED: "لغو شد",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PREPAYMENT: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  PREPAYMENT_PAID: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  INSPECTION_SCHEDULED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  INSPECTED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  VALUATION_DONE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  LISTED: "bg-[#F58220]/15 text-[#F58220] border-[#F58220]/30",
  SOLD: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  CANCELLED: "bg-red-500/15 text-red-300 border-red-500/30",
};

const STEPS = [
  { num: 1, label: "ثبت و رزرو", icon: ClipboardList },
  { num: 2, label: "کارشناسی", icon: ShieldCheck },
  { num: 3, label: "ارزش‌گذاری", icon: BadgeDollarSign },
  { num: 4, label: "قرارداد و تسویه", icon: FileSignature },
];

export default function SellIn7TrackClient({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<App | null>(null);

  const lookup = async (codeToQuery?: string) => {
    const c = (codeToQuery ?? code).trim().toUpperCase();
    if (!c) {
      setError("کد رهگیری را وارد کنید.");
      return;
    }
    setError(null);
    setLoading(true);
    setApp(null);
    try {
      const res = await fetch(`/api/sell-in-7-days?trackingCode=${encodeURIComponent(c)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "خطا در دریافت اطلاعات.");
      } else if (json.application) {
        setApp(json.application as App);
      } else {
        setError("درخواستی یافت نشد.");
      }
    } catch (e: any) {
      setError(e?.message || "خطای شبکه.");
    }
    setLoading(false);
  };

  // Auto-query on mount if initialCode is set (?code= link from success page).
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      lookup(initialCode);
    }
  }, [initialCode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Keep URL in sync (so a refresh keeps the code).
    if (code) {
      router.replace(`/sell-in-7-days/track?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    }
    lookup();
  };

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,rgba(245,130,32,0.1),transparent_70%)]" />
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-white/40">
          <Link href="/sell-in-7-days" className="hover:text-[#F58220]">
            فروش در ۷ روز
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/70">پیگیری درخواست</span>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-white lg:text-4xl">
            پیگیری درخواست فروش
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            کد رهگیری ۸ رقمی خود را وارد کنید تا وضعیت دستگاه را ببینید.
          </p>
        </div>

        {/* Search box */}
        <form onSubmit={submit} className="mx-auto max-w-xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="مثال: H7KX9PRQ"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pr-10 pl-4 text-center font-mono text-sm tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-white/30 outline-none transition focus:border-[#F58220]/60 focus:bg-white/[0.05]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-amber-500 to-[#F58220] px-6 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              پیگیری
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-xs font-bold text-red-300">
              {error}
            </div>
          )}
        </form>

        {/* Result */}
        {app && <ResultCard app={app} />}

        {/* Empty hint */}
        {!app && !loading && !error && (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/5 bg-white/[0.02] p-8 text-center text-xs text-white/40">
            کد رهگیری پس از ثبت دستگاه در صفحهٔ{" "}
            <Link href="/sell-in-7-days/register" className="text-[#F58220] hover:underline">
              ثبت دستگاه
            </Link>{" "}
            به شما نمایش داده می‌شود.
          </div>
        )}
      </div>
    </section>
  );
}

function ResultCard({ app }: { app: App }) {
  const isCancelled = app.status === "CANCELLED";
  const isSold = app.status === "SOLD";
  const currentStep = isCancelled ? 4 : app.currentStep;

  return (
    <div className="mt-10 space-y-6">
      {/* Header card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58220]/15 text-[#F58220]">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{app.deviceName}</h2>
                <p className="mt-0.5 text-xs text-white/45">
                  {app.brand?.name ?? "—"} · {app.modelName ?? "—"}{" "}
                  {app.year ? `· ${toFa(app.year)}` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              کد رهگیری
            </div>
            <div dir="ltr" className="font-mono text-lg font-black tracking-[0.2em] text-[#F58220]">
              {app.trackingCode}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
              STATUS_COLOR[app.status] ??
              "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            {isCancelled ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : isSold ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {STATUS_LABELS[app.status] ?? app.status}
          </span>
          <span className="text-[11px] text-white/40">
            آخرین به‌روزرسانی: {faDate(app.updatedAt)}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:p-8">
        <h3 className="mb-6 text-sm font-black text-white">مراحل فرآیند</h3>
        <div className="relative">
          {/* horizontal connector line */}
          <div className="absolute right-6 left-6 top-7 hidden h-[2px] bg-white/10 md:block" />
          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((step) => {
              const done = currentStep > step.num || isSold;
              const active = currentStep === step.num && !isSold && !isCancelled;
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className={`relative flex flex-col items-center text-center ${
                    done ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <div
                    className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition ${
                      done
                        ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                        : active
                          ? "border-[#F58220] bg-[#F58220] text-white animate-pulse"
                          : "border-white/10 bg-[#141414] text-white/40"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    {done && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] text-white/40">گام {toFa(step.num)}</div>
                  <div className={`mt-1 text-xs font-bold ${active ? "text-[#F58220]" : "text-white/70"}`}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard title="اطلاعات دستگاه">
          <DetailRow label="دسته‌بندی" value={app.category?.name} />
          <DetailRow label="برند" value={app.brand?.name} />
          <DetailRow label="مدل" value={app.modelName} />
          <DetailRow label="سال ساخت" value={app.year ? toFa(app.year) : null} />
          <DetailRow
            label="ساعت کار"
            value={app.workingHours ? toFa(app.workingHours) : null}
          />
          <DetailRow
            label="وضعیت"
            value={
              { NEW: "نو", USED: "کارکرده", REFURBISHED: "بازسازی‌شده", FOR_PARTS: "قطعات" }[
                app.condition ?? ""
              ] ?? null
            }
          />
        </DetailCard>

        <DetailCard title="موقعیت و تماس">
          <DetailRow
            label="موقعیت"
            value={
              app.province || app.city
                ? [app.province, app.city].filter(Boolean).join("، ")
                : null
            }
          />
          <DetailRow label="نام فروشنده" value={app.sellerName} />
          <DetailRow
            label="موبایل"
            value={
              <span dir="ltr" className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 text-[#F58220]" />
                {app.sellerMobile}
              </span>
            }
          />
          {app.sellerEmail && (
            <DetailRow label="ایمیل" value={<span dir="ltr">{app.sellerEmail}</span>} />
          )}
          <DetailRow label="تاریخ ثبت" value={faDate(app.createdAt)} />
        </DetailCard>

        <DetailCard title="مالی">
          <DetailRow
            label="قیمت پیشنهادی"
            value={app.expectedPrice ? formatFullPrice(BigInt(app.expectedPrice)) : null}
          />
          <DetailRow
            label="پیش‌پرداخت"
            value={
              app.prepaymentPaid && app.prepaymentAmount
                ? `${formatFullPrice(BigInt(app.prepaymentAmount))} (پرداخت شد)`
                : "پرداخت نشده"
            }
          />
          <DetailRow
            label="قیمت کارشناسی"
            value={app.valuationPrice ? formatFullPrice(BigInt(app.valuationPrice)) : null}
          />
          <DetailRow
            label="قیمت فروش نهایی"
            value={app.salePrice ? formatFullPrice(BigInt(app.salePrice)) : null}
          />
          <DetailRow
            label="کارمزد ۱٪"
            value={
              app.commissionAmount
                ? formatFullPrice(BigInt(app.commissionAmount))
                : null
            }
          />
        </DetailCard>

        {app.description && (
          <DetailCard title="توضیحات">
            <p className="text-xs leading-7 text-white/60">{app.description}</p>
          </DetailCard>
        )}

        {app.inspectionDate && (
          <DetailCard title="کارشناسی">
            <DetailRow
              label="تاریخ کارشناسی"
              value={
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#F58220]" />
                  {faDate(app.inspectionDate)}
                </span>
              }
            />
          </DetailCard>
        )}

        {app.soldAt && (
          <DetailCard title="تسویه">
            <DetailRow
              label="تاریخ فروش"
              value={
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-emerald-400" />
                  {faDate(app.soldAt)}
                </span>
              }
            />
          </DetailCard>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href="/sell-in-7-days"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-white transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به صفحهٔ کمپین
        </Link>
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h4 className="mb-4 text-sm font-black text-white">{title}</h4>
      <dl className="space-y-2.5">{children}</dl>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5 text-xs last:border-0">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-left font-bold text-white/80">
        {empty ? <span className="text-white/30">—</span> : value}
      </dd>
    </div>
  );
}

void MapPin;
