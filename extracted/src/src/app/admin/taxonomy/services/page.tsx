import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ServiceTypesManager, { type ServiceType } from "./ServiceTypesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "انواع خدمت — هویکس" };

export default async function ServiceTypesPage() {
  const rows = await db.serviceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
    select: {
      id: true,
      key: true,
      nameFa: true,
      nameEn: true,
      description: true,
      icon: true,
      active: true,
      sortOrder: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>انواع خدمت</span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-zinc-900">انواع خدمت</h1>
        <p className="mt-1 text-sm text-zinc-500">
          لایه خدمت (HBR-1.0 §19) — مستقل از دسته‌بندی. {toFa(rows.length)} نوع
          ثبت شده.
        </p>
      </div>

      <ServiceTypesManager initial={rows as ServiceType[]} />
    </div>
  );
}
