import Link from "next/link";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { toFa, formatCompactPrice, faDate, timeAgo } from "@/lib/format";
import {
  PackageSearch,
  MapPin,
  CalendarClock,
  Users,
  Plus,
  ArrowLeft,
  Tag,
  Wallet,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "باز", cls: "bg-emerald-500/15 text-emerald-400" },
  QUOTING: { label: "در حال پیشنهاد", cls: "bg-blue-500/15 text-blue-400" },
  AWARDED: { label: "تأییدشده", cls: "bg-[#F58220]/15 text-[#F58220]" },
  CLOSED: { label: "بسته‌شده", cls: "bg-zinc-500/15 text-zinc-400" },
  CANCELLED: { label: "لغوشده", cls: "bg-red-500/15 text-red-400" },
};

export default async function RFQListPage() {
  const rfqs = await db.rFQ.findMany({
    where: { status: { in: ["OPEN", "QUOTING"] } },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { _count: { select: { quotes: true } } },
  });

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
          {/* Hero */}
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15">
                <PackageSearch className="h-7 w-7 text-[#F58220]" />
              </div>
              <h1 className="text-3xl font-black text-white lg:text-4xl">
                درخواست خرید ماشین‌آلات (RFQ)
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/50">
                نیاز خود را ثبت کنید و از فروشندگان سراسر ایران پیشنهاد قیمت
                دریافت کنید. پلتفرم هویکس با ساختار B2B، خرید حرفه‌ای را ساده می‌کند.
              </p>
            </div>
            <Link
              href="/rfq/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#ff8c38]"
            >
              <Plus className="h-4 w-4" />
              ثبت درخواست جدید
            </Link>
          </div>

          {/* Grid */}
          {rfqs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center">
              <PackageSearch className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="text-sm text-white/40">
                هنوز درخواست خریدی ثبت نشده است. اولین نفر باشید!
              </p>
              <Link
                href="/rfq/new"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-2.5 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                ثبت درخواست
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rfqs.map((r) => {
                const status = STATUS_BADGES[r.status] ?? STATUS_BADGES.OPEN;
                return (
                  <Link
                    key={r.id}
                    href={`/rfq/${r.id}`}
                    className="group flex flex-col rounded-3xl border border-white/10 bg-[#111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/40"
                  >
                    {/* Title + status */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 min-h-[44px] text-base font-bold leading-6 text-white transition-colors group-hover:text-[#F58220]">
                        {r.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Meta tags */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {r.machineType && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] text-white/60">
                          <Tag className="h-3 w-3 text-[#F58220]" />
                          {r.machineType}
                        </span>
                      )}
                      {r.brandPref && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] text-white/60">
                          {r.brandPref}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] text-white/60">
                        <Users className="h-3 w-3 text-[#F58220]" />
                        {toFa(r.quantity)} دستگاه
                      </span>
                    </div>

                    {/* Description */}
                    {r.description && (
                      <p className="mb-4 line-clamp-2 flex-1 text-xs leading-5 text-white/40">
                        {r.description}
                      </p>
                    )}

                    {/* Budget */}
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#F58220]/[0.07] px-3 py-2">
                      <Wallet className="h-3.5 w-3.5 text-[#F58220]" />
                      <span className="text-[11px] font-bold text-[#F58220]">
                        {r.budgetMin || r.budgetMax
                          ? `بودجه: ${
                              r.budgetMin
                                ? formatCompactPrice(r.budgetMin)
                                : "از"
                            }${r.budgetMax ? ` تا ${formatCompactPrice(r.budgetMax)}` : ""}`
                          : "بودجه توافقی"}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/35">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.location || "نامشخص"}
                      </span>
                      {r.deadline ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          تا {faDate(r.deadline)}
                        </span>
                      ) : (
                        <span>{timeAgo(r.createdAt)}</span>
                      )}
                    </div>

                    {/* Quote count */}
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-white/40">
                        <FileText className="h-3 w-3" />
                        {toFa(r._count.quotes)} پیشنهاد
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#F58220] opacity-0 transition-opacity group-hover:opacity-100">
                        مشاهده
                        <ArrowLeft className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
