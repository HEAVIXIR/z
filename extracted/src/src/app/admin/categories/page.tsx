import Link from "next/link";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import { ChevronLeft } from "lucide-react";
import CategoryTreeExplorer, {
  type AppIndustry,
  type CategoryNode,
} from "./CategoryTreeExplorer";
import BatchGenerateImagesButton from "./BatchActions/BatchGenerateImagesButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "دسته‌بندی‌ها — هویکس" };

export default async function AdminCategoriesPage() {
  // Fetch all categories + industries in parallel
  const [allCats, industries] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { listings: true, children: true } },
        appIndustries: {
          include: {
            applicationIndustry: {
              select: { id: true, key: true, nameFa: true, nameEn: true, icon: true },
            },
          },
        },
      },
    }),
    db.applicationIndustry.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: { id: true, key: true, nameFa: true, nameEn: true, icon: true },
    }),
  ]);

  // Build flat + tree
  const flat: CategoryNode[] = allCats.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    nameEn: c.nameEn,
    slug: c.slug,
    icon: c.icon,
    imageUrl: c.imageUrl,
    description: c.description,
    domain: c.domain,
    layer: c.layer,
    taxPath: c.taxPath,
    featured: c.featured,
    active: c.active,
    showOnHome: c.showOnHome,
    sortOrder: c.sortOrder,
    level: c.level,
    listingCount: c._count.listings,
    appIndustries: c.appIndustries.map((ai) => ai.applicationIndustry),
  }));

  const map = new Map<string, CategoryNode>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  const indData: AppIndustry[] = industries;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>دسته‌ها</span>
        </div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">دسته‌بندی‌ها</h1>
            <p className="mt-1 text-sm text-zinc-500">
              درخت دسته با لایه‌بندی (HBR-1.0) — {toFa(roots.length)} ریشه ·{" "}
              {toFa(flat.length)} کل · {toFa(indData.length)} صنعت کاربرد.
            </p>
          </div>
          <BatchGenerateImagesButton />
        </div>
      </div>

      <CategoryTreeExplorer roots={roots} allFlat={flat} industries={indData} />
    </div>
  );
}
