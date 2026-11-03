import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toFa, faDate, formatFullPrice, formatCompactPrice, timeAgo } from "@/lib/format";
import {
  DEAL_STATUS_LABELS,
  DEAL_DOC_TYPE_LABELS,
} from "@/lib/inspection-checklists";
import DashboardNav from "@/components/dashboard/DashboardNav";
import Header from "@/components/layout/Header";
import DealRoomClient from "./DealRoomClient";
import {
  MessageSquare,
  FileText,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Truck,
  Wrench,
  ArrowRight,
  Phone,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_FLOW = [
  { key: "OPEN", label: "باز" },
  { key: "NEGOTIATING", label: "مذاکره" },
  { key: "AGREED", label: "توافق" },
  { key: "INSPECTION", label: "کارشناسی" },
  { key: "TRANSPORT", label: "حمل" },
  { key: "COMPLETED", label: "تکمیل" },
];

export default async function DealRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [room, headerCats] = await Promise.all([
    db.dealRoom.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            province: true,
            city: true,
            sellerId: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

  if (!room) notFound();

  const isBuyer = room.buyerId === user.id;
  const isSeller = room.sellerId === user.id;
  if (!isBuyer && !isSeller) {
    redirect("/dashboard/deal-rooms");
  }
  const role = isBuyer ? "BUYER" : "SELLER";
  const statusIdx = STATUS_FLOW.findIndex(
    (s) => s.key === (room.status || "OPEN").toUpperCase(),
  );

  // Build the serializable payload for the client component.
  const payload = {
    id: room.id,
    status: room.status,
    buyerConfirmed: room.buyerConfirmed,
    sellerConfirmed: room.sellerConfirmed,
    agreedPrice: room.agreedPrice ? room.agreedPrice.toString() : null,
    role,
    listing: room.listing
      ? {
          ...room.listing,
          price: room.listing.price ? room.listing.price.toString() : null,
        }
      : null,
    messages: room.messages.map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      senderName: m.senderName,
      message: m.message,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt.toISOString(),
    })),
    documents: room.documents.map((d) => ({
      id: d.id,
      type: d.type,
      url: d.url,
      uploadedBy: d.uploadedBy,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0b0b0b] text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,130,32,0.08), transparent 70%)",
      }}
    >
      <Header categories={headerCats} />
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-2 text-xs text-white/45">
          <Link href="/dashboard/deal-rooms" className="hover:text-[#F58220]">
            اتاق‌های معامله
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="truncate text-white/70">
            {room.listing?.title ?? "اتاق معامله"}
          </span>
        </nav>

        {/* Header card */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {room.listing?.images[0]?.url ? (
                <img
                  src={room.listing.images[0].url}
                  alt={room.listing?.title ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">🚜</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {room.listing && (
                <Link
                  href={`/listings/${room.listing.slug}`}
                  className="block truncate text-base font-black text-white transition hover:text-[#F58220]"
                >
                  {room.listing.title}
                </Link>
              )}
              <p className="mt-1 text-[11px] text-white/45">
                {room.listing?.province ?? "—"}، {room.listing?.city ?? "—"} · نقش شما:{" "}
                <span className="font-bold text-[#F58220]">
                  {isBuyer ? "خریدار" : "فروشنده"}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                ایجاد: {faDate(room.createdAt)} · آخرین به‌روزرسانی: {faDate(room.updatedAt)}
              </p>
            </div>
            {room.listing?.price && (
              <div className="shrink-0 text-left">
                <div className="text-[10px] text-white/40">قیمت آگهی</div>
                <div className="text-base font-black text-[#F58220]">
                  {formatCompactPrice(room.listing.price)}
                </div>
              </div>
            )}
          </div>

          {/* Status timeline */}
          <div className="mt-5">
            <div className="flex items-center justify-between gap-1">
              {STATUS_FLOW.map((s, i) => {
                const done = i <= statusIdx;
                const current = i === statusIdx;
                return (
                  <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                        done
                          ? "border-[#F58220] bg-[#F58220] text-white"
                          : "border-white/15 bg-white/5 text-white/40"
                      } ${current ? "ring-2 ring-[#F58220]/30" : ""}`}
                    >
                      {done ? "✓" : toFa(i + 1)}
                    </div>
                    <span
                      className={`text-[10px] ${
                        done ? "text-white/80" : "text-white/35"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-3 py-1 font-bold text-[#F58220]">
                وضعیت فعلی: {DEAL_STATUS_LABELS[room.status] ?? room.status}
              </span>
              {room.agreedPrice && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-300">
                  قیمت توافق شده: {formatFullPrice(room.agreedPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Quick action links */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Link
              href={`/listings/${room.listing?.slug ?? ""}?action=inspection`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold text-sky-300 transition hover:bg-sky-500/20"
            >
              <Wrench className="h-3.5 w-3.5" />
              درخواست کارشناسی
            </Link>
            <Link
              href={`/transport/request?listingId=${room.listing?.id ?? ""}&dealRoomId=${room.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-300 transition hover:bg-violet-500/20"
            >
              <Truck className="h-3.5 w-3.5" />
              درخواست حمل
            </Link>
            {room.buyerPhone && (
              <a
                href={`tel:${room.buyerPhone}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:border-[#F58220] hover:text-[#F58220]"
              >
                <Phone className="h-3.5 w-3.5" />
                تماس با خریدار
              </a>
            )}
            {room.sellerPhone && (
              <a
                href={`tel:${room.sellerPhone}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:border-[#F58220] hover:text-[#F58220]"
              >
                <Phone className="h-3.5 w-3.5" />
                تماس با فروشنده
              </a>
            )}
          </div>
        </div>

        {/* Confirmations */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              room.buyerConfirmed
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            {room.buyerConfirmed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-white/30" />
            )}
            <div>
              <div className="text-xs text-white/45">تأیید خریدار</div>
              <div className={`text-sm font-bold ${room.buyerConfirmed ? "text-emerald-300" : "text-white/60"}`}>
                {room.buyerConfirmed ? "تأیید شد ✓" : "در انتظار تأیید"}
              </div>
            </div>
          </div>
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              room.sellerConfirmed
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            {room.sellerConfirmed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-white/30" />
            )}
            <div>
              <div className="text-xs text-white/45">تأیید فروشنده</div>
              <div className={`text-sm font-bold ${room.sellerConfirmed ? "text-emerald-300" : "text-white/60"}`}>
                {room.sellerConfirmed ? "تأیید شد ✓" : "در انتظار تأیید"}
              </div>
            </div>
          </div>
        </div>

        <DealRoomClient dealRoom={payload} />

        {/* Documents */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white">
            <FileText className="h-4 w-4 text-[#F58220]" />
            اسناد معامله
          </h2>
          {payload.documents.length === 0 ? (
            <p className="text-xs text-white/40">هنوز سندی بارگذاری نشده است.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {payload.documents.map((d) => {
                const docStatus = (d.status || "PENDING").toUpperCase();
                const docStatusLabel =
                  docStatus === "VERIFIED"
                    ? "تأیید شده"
                    : docStatus === "REJECTED"
                      ? "رد شده"
                      : "در انتظار";
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/10 text-[#F58220]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-white">
                        {DEAL_DOC_TYPE_LABELS[d.type] ?? d.type}
                      </div>
                      <div className="text-[10px] text-white/40">{faDate(d.createdAt)}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        docStatus === "VERIFIED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : docStatus === "REJECTED"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {docStatusLabel}
                    </span>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/70 transition hover:border-[#F58220] hover:text-[#F58220]"
                    >
                      مشاهده
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
