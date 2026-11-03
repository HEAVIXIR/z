import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RFQQuoteForm from "./RFQQuoteForm";
import { toFa, formatCompactPrice, formatFullPrice, faDate, timeAgo } from "@/lib/format";
import {
  PackageSearch,
  MapPin,
  CalendarClock,
  Users,
  Tag,
  Wallet,
  FileText,
  ArrowRight,
  Phone,
  Mail,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "باز", cls: "bg-emerald-500/15 text-emerald-400" },
  QUOTING: { label: "در حال پیشنهاد", cls: "bg-blue-500/15 text-blue-400" },
  AWARDED: { label: "تأییدشده", cls: "bg-[#F58220]/15 text-[#F58220]" },
  CLOSED: { label: "بسته‌شده", cls: "bg-zinc-500/15 text-zinc-400" },
  CANCELLED: { label: "لغوشده", cls: "bg-red-500/15 text-red-400" },
};

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "در انتظار", cls: "bg-amber-500/15 text-amber-400" },
  ACCEPTED: { label: "پذیرفته‌شده", cls: "bg-emerald-500/15 text-emerald-400" },
  REJECTED: { label: "رد‌شده", cls: "bg-red-500/15 text-red-400" },
  COUNTERED: { label: "پیشنهاد متقابل", cls: "bg-blue-500/15 text-blue-400" },
};

type Params = { params: Promise<{ id: string }> };

export default async function RFQDetailPage({ params }: Params) {
  const { id } = await params;
  const rfq = await db.rFQ.findUnique({
    where: { id },
    include: {
      quotes: { orderBy: { createdAt: "desc" } },
      buyer: { select: { id: true, firstName: true, lastName: true, mobile: true, email: true } },
    },
  });

  if (!rfq) notFound();

  const status = STATUS_BADGES[rfq.status] ?? STATUS_BADGES.OPEN;
  const canQuote = rfq.status === "OPEN" || rfq.status === "QUOTING";

  // BigInt → string for client serialization
  const safeRfq = {
    ...rfq,
    budgetMin: rfq.budgetMin ? rfq.budgetMin.toString() : null,
    budgetMax: rfq.budgetMax ? rfq.budgetMax.toString() : null,
    quotes: rfq.quotes.map((q) => ({
      ...q,
      unitPrice: q.unitPrice.toString(),
      totalPrice: q.totalPrice.toString(),
    })),
  };

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
          {/* Breadcrumb */}
          <Link
            href="/rfq"
            className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-white/40 transition hover:text-[#F58220]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            بازگشت به فهرست درخواست‌ها
          </Link>

          {/* Header */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0c0c0c] p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F58220]/15">
                    <PackageSearch className="h-5 w-5 text-[#F58220]" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}
                  >
                    {status.label}
                  </span>
                  <span className="text-[11px] text-white/35">
                    {timeAgo(rfq.createdAt)}
                  </span>
                </div>
                <h1 className="text-2xl font-black leading-9 text-white lg:text-3xl">
                  {rfq.title}
                </h1>
              </div>
            </div>

            {/* Meta grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {rfq.machineType && (
                <MetaTile icon={<Tag className="h-3.5 w-3.5 text-[#F58220]" />} label="نوع ماشین" value={rfq.machineType} />
              )}
              {rfq.brandPref && (
                <MetaTile icon={<Tag className="h-3.5 w-3.5 text-[#F58220]" />} label="برند ترجیحی" value={rfq.brandPref} />
              )}
              <MetaTile icon={<Users className="h-3.5 w-3.5 text-[#F58220]" />} label="تعداد" value={`${toFa(rfq.quantity)} دستگاه`} />
              {rfq.location && (
                <MetaTile icon={<MapPin className="h-3.5 w-3.5 text-[#F58220]" />} label="موقعیت" value={rfq.location} />
              )}
            </div>
          </div>

          {/* Body grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left: description + budget + quotes */}
            <div className="space-y-6">
              {/* Description */}
              {rfq.description && (
                <Section title="شرح درخواست" icon={<FileText className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
                    {rfq.description}
                  </p>
                </Section>
              )}

              {/* Budget */}
              <Section title="بودجه" icon={<Wallet className="h-4 w-4" />}>
                {rfq.budgetMin || rfq.budgetMax ? (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {rfq.budgetMin && (
                      <span className="text-sm text-white/50">
                        از{" "}
                        <span className="font-bold text-white">
                          {formatFullPrice(safeRfq.budgetMin as unknown as bigint)}
                        </span>
                      </span>
                    )}
                    {rfq.budgetMax && (
                      <span className="text-sm text-white/50">
                        تا{" "}
                        <span className="font-bold text-white">
                          {formatFullPrice(safeRfq.budgetMax as unknown as bigint)}
                        </span>
                      </span>
                    )}
                    <span className="text-xs text-white/35">
                      (
                      {formatCompactPrice(
                        (rfq.budgetMax ?? rfq.budgetMin) as bigint | number | null,
                      )}
                      )
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-white/40">بودجه توافقی</p>
                )}
              </Section>

              {/* Terms */}
              {rfq.terms && (
                <Section title="شرایط پرداخت و تحویل" icon={<FileText className="h-4 w-4" />}>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
                    {rfq.terms}
                  </p>
                </Section>
              )}

              {/* Deadline */}
              {rfq.deadline && (
                <Section title="مهلت پاسخ‌گویی" icon={<CalendarClock className="h-4 w-4" />}>
                  <p className="text-sm text-white/70">{faDate(rfq.deadline)}</p>
                </Section>
              )}

              {/* Quotes list */}
              <Section
                title={`پیشنهادهای فروشندگان (${toFa(rfq.quotes.length)})`}
                icon={<Users className="h-4 w-4" />}
              >
                {rfq.quotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                    <p className="text-sm text-white/40">
                      هنوز پیشنهادی ثبت نشده است. اولین فروشنده باشید!
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {rfq.quotes.map((q) => {
                      const qs =
                        QUOTE_STATUS[q.status] ?? QUOTE_STATUS.PENDING;
                      return (
                        <li
                          key={q.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white">
                                  {q.sellerName}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${qs.cls}`}
                                >
                                  {qs.label}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-white/40">
                                {timeAgo(q.createdAt)}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-[#F58220]">
                                {formatFullPrice(q.unitPrice)}
                              </p>
                              <p className="text-[11px] text-white/40">
                                قیمت واحد
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/55">
                            <span className="inline-flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              کل: {formatFullPrice(q.totalPrice)}
                            </span>
                            {q.deliveryTime && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                تحویل: {q.deliveryTime}
                              </span>
                            )}
                            {q.sellerPhone && (
                              <span className="inline-flex items-center gap-1" dir="ltr">
                                <Phone className="h-3 w-3" />
                                {q.sellerPhone}
                              </span>
                            )}
                          </div>

                          {q.notes && (
                            <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-6 text-white/55">
                              {q.notes}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>
            </div>

            {/* Right: buyer contact + quote form */}
            <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
              {/* Buyer card */}
              <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#F58220]">
                  <User className="h-4 w-4" />
                  اطلاعات خریدار
                </h3>
                <ul className="space-y-2 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-white/40" />
                    <span>{rfq.buyerName || rfq.buyer?.firstName + " " + rfq.buyer?.lastName || "—"}</span>
                  </li>
                  <li className="flex items-center gap-2" dir="ltr">
                    <Phone className="h-3.5 w-3.5 text-white/40" />
                    <span>{rfq.buyerPhone}</span>
                  </li>
                  {rfq.buyerEmail && (
                    <li className="flex items-center gap-2" dir="ltr">
                      <Mail className="h-3.5 w-3.5 text-white/40" />
                      <span>{rfq.buyerEmail}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Submit quote form */}
              <RFQQuoteForm rfqId={rfq.id} canQuote={canQuote} />

              {rfq.status === "AWARDED" && (
                <div className="rounded-2xl border border-[#F58220]/30 bg-[#F58220]/[0.07] p-4 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#F58220]" />
                  <p className="text-xs font-bold text-[#F58220]">
                    این درخواست به یک فروشنده تأیید شد.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ── small UI helpers ───────────────────────────────────────── */

function MetaTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-white/40">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111] p-5 lg:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white">
        <span className="text-[#F58220]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
