import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductEditForm from "./ProductEditForm";

export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

/* /admin/products/[id]/edit — edit form for a single Product. */
export default async function AdminProductEditPage({ params }: Args) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true, nameEn: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      model: { select: { id: true, name: true, nameEn: true } },
    },
  });

  if (!product) notFound();

  const initial = {
    id: product.id,
    canonicalName: product.canonicalName,
    slug: product.slug,
    description: product.description ?? "",
    status: product.status,
    source: product.source ?? "MANUAL",
    confidence: product.confidence ?? null,
    verifiedBy: product.verifiedBy ?? "",
    verifiedAt: product.verifiedAt ? product.verifiedAt.toISOString() : null,
    sortOrder: product.sortOrder,
    categoryId: product.categoryId,
    brandId: product.brandId ?? "",
    brandName: product.brand?.name ?? "",
    brandNameEn: product.brand?.nameEn ?? null,
    brandSlug: product.brand?.slug ?? null,
    modelId: product.modelId ?? "",
    modelName: product.model?.name ?? "",
    modelNameEn: product.model?.nameEn ?? null,
  };

  return <ProductEditForm initial={initial} />;
}
