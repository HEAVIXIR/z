import { db } from "@/lib/db";
import { toFa, faDate, formatFullPrice, formatCompactPrice } from "@/lib/format";
import { DEAL_STATUS_LABELS } from "@/lib/inspection-checklists";
import AdminDealRoomsClient from "./AdminDealRoomsClient";

export const dynamic = "force-dynamic";

/* =========================================================
   /admin/deal-rooms — admin view of all deal rooms.
   Server-rendered list with client-side status filter + search.
   ========================================================= */

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-zinc-100 text-zinc-700 border-zinc-200",
  NEGOTIATING: "bg-amber-100 text-amber-700 border-amber-200",
  AGREED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INSPECTION: "bg-sky-100 text-sky-700 border-sky-200",
  TRANSPORT: "bg-violet-100 text-violet-700 border-violet-200",
  COMPLETED: "bg-emerald-200 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

export default async function AdminDealRoomsPage() {
  const [rooms, stats] = await Promise.all([
    db.dealRoom.findMany({
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
        buyer: { select: { id: true, firstName: true, lastName: true, mobile: true } },
        seller: { select: { id: true, firstName: true, lastName: true, mobile: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true, documents: true } },
      },
    }),
    (async () => {
      const grouped = await db.dealRoom.groupBy({ by: ["status"], _count: true });
      const map: Record<string, number> = {};
      for (const g of grouped) map[g.status] = g._count;
      return {
        total: Object.values(map).reduce((a, b) => a + b, 0),
        open: map["OPEN"] ?? 0,
        negotiating: map["NEGOTIATING"] ?? 0,
        agreed: map["AGREED"] ?? 0,
        completed: map["COMPLETED"] ?? 0,
        cancelled: map["CANCELLED"] ?? 0,
      };
    })(),
  ]);

  const serialized = rooms.map((r) => ({
    id: r.id,
    status: r.status,
    buyerConfirmed: r.buyerConfirmed,
    sellerConfirmed: r.sellerConfirmed,
    agreedPrice: r.agreedPrice ? r.agreedPrice.toString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    listing: r.listing
      ? {
          ...r.listing,
          price: r.listing.price ? r.listing.price.toString() : null,
        }
      : null,
    buyer: r.buyer
      ? {
          id: r.buyer.id,
          name: `${r.buyer.firstName} ${r.buyer.lastName}`.trim(),
          mobile: r.buyer.mobile,
        }
      : null,
    seller: r.seller
      ? {
          id: r.seller.id,
          name: `${r.seller.firstName} ${r.seller.lastName}`.trim(),
          mobile: r.seller.mobile,
        }
      : null,
    messageCount: r._count.messages,
    documentCount: r._count.documents,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">اتاق‌های معامله</h1>
        <p className="mt-1 text-sm text-zinc-500">
          مشاهده و مدیریت اتاق‌های مذاکره میان خریداران و فروشندگان
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="کل" value={stats.total} color="bg-zinc-100 text-zinc-800" />
        <StatCard label="باز" value={stats.open} color="bg-zinc-100 text-zinc-800" />
        <StatCard label="مذاکره" value={stats.negotiating} color="bg-amber-100 text-amber-700" />
        <StatCard label="توافق شده" value={stats.agreed} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="تکمیل شده" value={stats.completed} color="bg-emerald-200 text-emerald-800" />
        <StatCard label="لغو شده" value={stats.cancelled} color="bg-rose-100 text-rose-700" />
      </div>

      <AdminDealRoomsClient rooms={serialized} statusColors={STATUS_COLORS} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 p-3 ${color}`}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="mt-1 text-xl font-black">{toFa(value)}</div>
    </div>
  );
}
