import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ApplicationIndustriesManager, {
  type ApplicationIndustry,
} from "./ApplicationIndustriesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "صنایع کاربرد — هویکس" };

export default async function ApplicationIndustriesPage() {
  const rows = await db.applicationIndustry.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
    include: {
      _count: { select: { categories: true } },
    },
  });

  const data: ApplicationIndustry[] = rows.map((r) => ({
    id: r.id,
    key: r.key,
    nameFa: r.nameFa,
    nameEn: r.nameEn,
    icon: r.icon,
    active: r.active,
    sortOrder: r.sortOrder,
    categoryCount: r._count.categories,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>صنایع کاربرد</span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-zinc-900">صنایع کاربرد</h1>
        <p className="mt-1 text-sm text-zinc-500">
          ۱۶ صنعت کاربرد (HBR-1.0 §17) — بُعد مستقل از صنعت برند. {toFa(rows.length)}{" "}
          صنعت ثبت شده.
        </p>
      </div>

      <ApplicationIndustriesManager initial={data} />
    </div>
  );
}
