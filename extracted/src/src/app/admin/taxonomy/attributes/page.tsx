import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AttributesManager, {
  type AttributeRow,
  type CategoryOption,
} from "./AttributesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "ویژگی‌ها — هویکس" };

export default async function AttributesPage() {
  // Attributes with options + linked categories
  const attrs = await db.attributeDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      options: { orderBy: [{ sortOrder: "asc" }, { value: "asc" }] },
      categories: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const rows: AttributeRow[] = attrs.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    nameEn: a.nameEn,
    labelFa: a.labelFa ?? a.name,
    labelEn: a.labelEn ?? a.nameEn ?? null,
    type: a.type,
    unit: a.unit,
    required: a.required,
    filterable: a.filterable,
    searchable: a.searchable,
    sortable: a.sortable,
    visibleOnCard: a.visibleOnCard,
    visibleOnDetail: a.visibleOnDetail,
    seoRelevant: a.seoRelevant,
    aiRelevant: a.aiRelevant,
    sortOrder: a.sortOrder,
    options: a.options.map((o) => ({
      id: o.id,
      value: o.value,
      label: o.label,
      sortOrder: o.sortOrder,
    })),
    categories: a.categories.map((l) => ({
      id: l.id,
      categoryId: l.categoryId,
      category: l.category,
      required: l.required,
      filterable: l.filterable,
      searchable: l.searchable,
      sortable: l.sortable,
      displayOrder: l.displayOrder,
    })),
  }));

  // Categories for the link-manager dropdown
  const cats = await db.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const categoryOptions: CategoryOption[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>ویژگی‌ها</span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-zinc-900">
          مدیریت ویژگی‌ها
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          کاتالوگ AttributeDefinition و گزینه‌ها — ویژگی‌های فنی قابل
          فیلتر برای هر دسته. {toFa(rows.length)} ویژگی ثبت شده.
        </p>
      </div>

      <AttributesManager
        initial={rows}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
