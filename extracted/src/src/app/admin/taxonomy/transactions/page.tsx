import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import TransactionTypesManager, {
  type TransactionType,
} from "./TransactionTypesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "انواع معامله — هویکس" };

export default async function TransactionTypesPage() {
  const rows = await db.transactionType.findMany({
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
          <span>انواع معامله</span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-zinc-900">انواع معامله</h1>
        <p className="mt-1 text-sm text-zinc-500">
          لایه تراکنش (HBR-1.0 §18) — مستقل از دسته‌بندی. {toFa(rows.length)} نوع
          ثبت شده.
        </p>
      </div>

      <TransactionTypesManager initial={rows as TransactionType[]} />
    </div>
  );
}
