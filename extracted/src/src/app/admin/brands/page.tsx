import Link from "next/link";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { listings: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">برندها</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {toFa(brands.length)} برند
          </p>
        </div>
        <Link
          href="/admin/taxonomy/brands"
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
        >
          <Plus className="h-4 w-4" />
          برند جدید
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 p-1">
                {b.logoUrl ? (
                   
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xl font-black text-[#F58220]">
                    {(b.nameEn ?? b.name).charAt(0)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-zinc-800">{b.name}</h3>
                {b.nameEn && (
                  <p className="text-xs text-zinc-400">{b.nameEn}</p>
                )}
              </div>
              {b.featured && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  ویژه
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-xs text-zinc-500">
                {toFa(b._count.listings)} آگهی
              </span>
              {b.country && (
                <span className="text-xs text-zinc-400">{b.country}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
