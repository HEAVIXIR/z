import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ slug: string }>;
}

/* GET /api/products/[slug] — public product detail. */
export async function GET(_req: Request, { params }: Args) {
  try {
    const { slug } = await params;
    const product = await db.product.findUnique({
      where: { slug },
      include: {
        brand: {
          select: {
            id: true, name: true, nameEn: true, slug: true, logoUrl: true, country: true,
          },
        },
        category: { select: { id: true, name: true, slug: true, domain: true, layer: true } },
        model: { select: { id: true, name: true, nameEn: true, slug: true } },
        machines: {
          where: { status: { in: ["ACTIVE", "SOLD"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            listing: {
              select: {
                id: true, slug: true, title: true, price: true, status: true,
                province: true, city: true, year: true, workingHours: true,
              },
            },
          },
        },
        parts: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        attachments: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        listings: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, slug: true, title: true, price: true, priceType: true,
            province: true, city: true, year: true, workingHours: true,
            status: true, featured: true, verified: true, publishedAt: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        _count: {
          select: { listings: true, machines: true, parts: true, attachments: true },
        },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Outgoing compatibility edges
    const outEdges = await db.compatibilityEdge.findMany({
      where: { sourceEntityType: "Product", sourceEntityId: product.id },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    // Incoming compatibility edges
    const inEdges = await db.compatibilityEdge.findMany({
      where: { targetEntityType: "Product", targetEntityId: product.id },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      product: {
        ...product,
        priceToString: undefined,
        listingsCount: product._count.listings,
        machinesCount: product._count.machines,
        partsCount: product._count.parts,
        attachmentsCount: product._count.attachments,
        _count: undefined,
        listings: product.listings.map((l) => ({
          ...l,
          price: l.price ? l.price.toString() : null,
        })),
        compatibility: {
          outgoing: outEdges,
          incoming: inEdges,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
