import { db } from "@/lib/db";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import {
  INSPECTION_STATUS_LABELS,
} from "@/lib/inspection-checklists";
import AdminInspectionsClient from "./AdminInspectionsClient";

export const dynamic = "force-dynamic";

/* =========================================================
   /admin/inspections — admin inspection management.
   Stats + list + schedule/complete modals (handled by client).
   ========================================================= */

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700 border-amber-200",
  SCHEDULED: "bg-sky-100 text-sky-700 border-sky-200",
  IN_PROGRESS: "bg-violet-100 text-violet-700 border-violet-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

export default async function AdminInspectionsPage() {
  const [inspections, stats, users] = await Promise.all([
    db.inspection.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            province: true,
            city: true,
            category: { select: { name: true } },
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        },
      },
    }),
    (async () => {
      const grouped = await db.inspection.groupBy({ by: ["status"], _count: true });
      const map: Record<string, number> = {};
      for (const g of grouped) map[g.status] = g._count;
      return {
        total: Object.values(map).reduce((a, b) => a + b, 0),
        requested: map["REQUESTED"] ?? 0,
        scheduled: map["SCHEDULED"] ?? 0,
        inProgress: map["IN_PROGRESS"] ?? 0,
        completed: map["COMPLETED"] ?? 0,
        cancelled: map["CANCELLED"] ?? 0,
      };
    })(),
    db.user.findMany({
      where: { OR: [{ role: "ADMIN" }, { role: "SELLER" }] },
      select: { id: true, firstName: true, lastName: true, mobile: true },
      take: 50,
    }),
  ]);

  const inspectors = users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    mobile: u.mobile,
  }));

  const serialized = inspections.map((i) => ({
    id: i.id,
    status: i.status,
    requestedBy: i.requestedBy,
    inspectorId: i.inspectorId,
    scheduledDate: i.scheduledDate ? i.scheduledDate.toISOString() : null,
    completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    score: i.score,
    reportUrl: i.reportUrl,
    photos: i.photos ? JSON.parse(i.photos) : null,
    notes: i.notes,
    price: i.price ? i.price.toString() : null,
    checklist: i.checklist ? JSON.parse(i.checklist) : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    listing: i.listing
      ? {
          id: i.listing.id,
          slug: i.listing.slug,
          title: i.listing.title,
          price: i.listing.price ? i.listing.price.toString() : null,
          province: i.listing.province,
          city: i.listing.city,
          categoryName: i.listing.category?.name ?? null,
          image: i.listing.images[0]?.url ?? null,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">کارشناسی ماشین‌آلات</h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت درخواست‌های کارشناسی HEAVIX IronClad — زمان‌بندی، تخصیص کارشناس و ثبت گزارش
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="کل" value={stats.total} color="bg-zinc-100 text-zinc-800" />
        <StatCard label="درخواست شده" value={stats.requested} color="bg-amber-100 text-amber-700" />
        <StatCard label="زمان‌بندی شده" value={stats.scheduled} color="bg-sky-100 text-sky-700" />
        <StatCard label="در حال انجام" value={stats.inProgress} color="bg-violet-100 text-violet-700" />
        <StatCard label="تکمیل شده" value={stats.completed} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="لغو شده" value={stats.cancelled} color="bg-rose-100 text-rose-700" />
      </div>

      <AdminInspectionsClient
        inspections={serialized}
        inspectors={inspectors}
        statusColors={STATUS_COLORS}
        statusLabels={INSPECTION_STATUS_LABELS}
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
