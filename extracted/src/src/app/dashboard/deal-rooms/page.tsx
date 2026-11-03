import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toFa, faDate, formatCompactPrice, timeAgo } from "@/lib/format";
import { DEAL_STATUS_LABELS } from "@/lib/inspection-checklists";
import DashboardNav from "@/components/dashboard/DashboardNav";
import Header from "@/components/layout/Header";
import { MessageSquare, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  NEGOTIATING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  AGREED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  INSPECTION: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  TRANSPORT: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  COMPLETED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  CANCELLED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default async function DealRoomListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [rooms, headerCats] = await Promise.all([
    db.dealRoom.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      orderBy: { updatedAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            province: true,
            city: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

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
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6 lg:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white lg:text-3xl">
              <MessageSquare className="h-6 w-6 text-[#F58220]" />
              اتاق‌های معامله
            </h1>
            <p className="mt-2 text-sm text-white/55">
              مذاکرات، اسناد و توافقات شما با طرف مقابل در یک اتاق امن
            </p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-6 py-16 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-white/30" />
            <p className="mt-4 text-sm text-white/55">
              هنوز اتاق معامله‌ای ندارید.
            </p>
            <Link
              href="/listings"
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38]"
            >
              مشاهده آگهی‌ها
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((r) => {
              const isBuyer = r.buyerId === user.id;
              const status = (r.status || "OPEN").toUpperCase();
              const statusLabel = DEAL_STATUS_LABELS[status] ?? status;
              const statusColor =
                STATUS_COLORS[status] ?? STATUS_COLORS.OPEN;
              const lastMsg = r.messages[0];
              const img = r.listing?.images[0]?.url;
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/deal-rooms/${r.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-[#F58220]/40 hover:bg-white/[0.04]"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {img ? (
                      <img src={img} alt={r.listing?.title ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🚜</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-[#F58220]">
                        {r.listing?.title ?? "آگهی حذف شده"}
                      </h3>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-white/45">
                      نقش شما: {isBuyer ? "خریدار" : "فروشنده"} ·{" "}
                      {r.listing?.province ?? "—"}، {r.listing?.city ?? "—"}
                    </p>
                    {lastMsg ? (
                      <p className="mt-1 truncate text-[11px] text-white/55">
                        {lastMsg.senderRole === "BUYER" ? "خریدار" : "فروشنده"}: {lastMsg.message || "📎 پیوست"}
                        <span className="mr-2 text-white/35">· {timeAgo(lastMsg.createdAt)}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-white/35">بدون پیام</p>
                    )}
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    {r.listing?.price && (
                      <span className="text-xs font-bold text-[#F58220]">
                        {formatCompactPrice(r.listing.price)}
                      </span>
                    )}
                    <span className="text-[10px] text-white/40">{faDate(r.updatedAt)}</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 shrink-0 text-white/30 transition group-hover:text-[#F58220]" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
