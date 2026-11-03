import { db } from "@/lib/db";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import {
  TRANSPORT_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
} from "@/lib/inspection-checklists";
import AdminTransportClient from "./AdminTransportClient";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700 border-amber-200",
  QUOTING: "bg-sky-100 text-sky-700 border-sky-200",
  ACCEPTED: "bg-violet-100 text-violet-700 border-violet-200",
  IN_TRANSIT: "bg-indigo-100 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

export default async function AdminTransportPage() {
  const [requests, stats] = await Promise.all([
    db.transportRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
      },
    }),
    (async () => {
      const grouped = await db.transportRequest.groupBy({ by: ["status"], _count: true });
      const map: Record<string, number> = {};
      for (const g of grouped) map[g.status] = g._count;
      return {
        total: Object.values(map).reduce((a, b) => a + b, 0),
        requested: map["REQUESTED"] ?? 0,
        quoting: map["QUOTING"] ?? 0,
        accepted: map["ACCEPTED"] ?? 0,
        inTransit: map["IN_TRANSIT"] ?? 0,
        delivered: map["DELIVERED"] ?? 0,
        cancelled: map["CANCELLED"] ?? 0,
      };
    })(),
  ]);

  const serialized = requests.map((r) => ({
    id: r.id,
    status: r.status,
    origin: r.origin,
    destination: r.destination,
    cargoType: r.cargoType,
    cargoWeight: r.cargoWeight,
    cargoLength: r.cargoLength,
    cargoWidth: r.cargoWidth,
    cargoHeight: r.cargoHeight,
    vehicleType: r.vehicleType,
    loadingDate: r.loadingDate ? r.loadingDate.toISOString() : null,
    deliveryDate: r.deliveryDate ? r.deliveryDate.toISOString() : null,
    quotedPrice: r.quotedPrice ? r.quotedPrice.toString() : null,
    carrierName: r.carrierName,
    carrierPhone: r.carrierPhone,
    trackingCode: r.trackingCode,
    notes: r.notes,
    requestedBy: r.requestedBy,
    listingId: r.listingId,
    dealRoomId: r.dealRoomId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    listing: r.listing
      ? {
          id: r.listing.id,
          slug: r.listing.slug,
          title: r.listing.title,
          price: r.listing.price ? r.listing.price.toString() : null,
          image: r.listing.images[0]?.url ?? null,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">حمل‌ونقل ماشین‌آلات</h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت درخواست‌های حمل — استعلام قیمت، تخصیص باربر و به‌روزرسانی وضعیت
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="کل" value={stats.total} color="bg-zinc-100 text-zinc-800" />
        <StatCard label="درخواست" value={stats.requested} color="bg-amber-100 text-amber-700" />
        <StatCard label="استعلام" value={stats.quoting} color="bg-sky-100 text-sky-700" />
        <StatCard label="پذیرفته" value={stats.accepted} color="bg-violet-100 text-violet-700" />
        <StatCard label="در حال حمل" value={stats.inTransit} color="bg-indigo-100 text-indigo-700" />
        <StatCard label="تحویل شده" value={stats.delivered} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="لغو" value={stats.cancelled} color="bg-rose-100 text-rose-700" />
      </div>

      <AdminTransportClient
        requests={serialized}
        statusColors={STATUS_COLORS}
        statusLabels={TRANSPORT_STATUS_LABELS}
        vehicleLabels={VEHICLE_TYPE_LABELS}
      />
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
