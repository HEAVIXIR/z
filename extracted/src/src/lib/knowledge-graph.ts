import { db } from "@/lib/db";

/* ============================================================
   HEAVIX — Knowledge Graph (P2-21)
   ------------------------------------------------------------
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-21
   HEAVIX-CORRECTED-REFERENCE-V1.1.md §4 (Canonical Domain Model)

   Queryable derived view layer that connects brands, models,
   products, machines, parts, attachments, categories, listings,
   and companies. This module is intentionally READ-ONLY — no
   graph mutations; the CompatibilityEdge table (P1-4) already
   owns compatibility edges and is consulted here as a
   cross-cutting relation layer.

   The graph is built as a derived view (no new tables) by
   walking the existing Prisma relations:
     Brand ─┬─ BrandFamily
            ├─ ProductModel ─ Generation
            ├─ Product ─┬─ Machine
            │           ├─ Part
            │           └─ Attachment
            ├─ Listing
            ├─ BrandCategory ─ Category
            ├─ BrandDomain
            ├─ BrandIndustry
            └─ BrandAlias
     Category ─┬─ children (recursive)
               ├─ Product
               ├─ Listing
               ├─ CategoryAttribute ─ AttributeDefinition
               └─ brands (BrandCategory)
     Listing ─┬─ Brand / Category / Model / Product
              ├─ Company / User (seller)
              ├─ Machine (primary)
              └─ Images
     CompatibilityEdge — generic cross-entity edges (Product↔Part,
                        Product↔Attachment, etc.) consulted at BFS
                        traversal time.

   Public contract:
     getEntityGraph(entityType, entityId, depth) — BFS from any
       typed entity, returning nodes + edges. depth limits traversal
       (default 2). Each node carries its entity type + minimal
       scalar fields; each edge carries a relationType label.
     getBrandGraph(brandId) — full brand context bundle.
     getCategoryGraph(categoryId) — full category context bundle.
     getProductGraph(productId) — full product context bundle.

   The module is intentionally server-only (imports Prisma).
   ============================================================ */

export type GraphEntityType =
  | "Brand"
  | "Model"
  | "Product"
  | "Machine"
  | "Part"
  | "Attachment"
  | "Category"
  | "Listing"
  | "Company";

export interface GraphNode {
  id: string;
  type: GraphEntityType;
  label: string;
  sublabel?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  sourceType: GraphEntityType;
  targetType: GraphEntityType;
  relation: string;
}

export interface GraphBundle {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ─────────── Helpers ─────────── */

function brandHref(b: { slug: string }): string {
  return `/brands/${b.slug}`;
}
function categoryHref(c: { slug: string }): string {
  return `/categories/${c.slug}`;
}
function listingHref(l: { slug: string }): string {
  return `/listings/${l.slug}`;
}
function modelHref(m: { slug: string }): string {
  return `/models/${m.slug}`;
}

/* ─────────── Entity → Node adapters ─────────── */

function brandNode(b: {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  country?: string | null;
  verification?: string | null;
}): GraphNode {
  return {
    id: b.id,
    type: "Brand",
    label: b.name,
    sublabel: b.nameEn ?? null,
    href: brandHref(b),
    meta: { country: b.country ?? null, verification: b.verification ?? null },
  };
}

function modelNode(m: {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  status?: string | null;
}): GraphNode {
  return {
    id: m.id,
    type: "Model",
    label: m.name,
    sublabel: m.nameEn ?? null,
    href: modelHref(m),
    meta: { status: m.status ?? null },
  };
}

function productNode(p: {
  id: string;
  canonicalName: string;
  slug: string;
  status?: string | null;
}): GraphNode {
  return {
    id: p.id,
    type: "Product",
    label: p.canonicalName,
    sublabel: p.slug,
    href: null,
    meta: { status: p.status ?? null },
  };
}

function machineNode(m: {
  id: string;
  serialNumber?: string | null;
  manufactureYear?: number | null;
  status?: string | null;
}): GraphNode {
  return {
    id: m.id,
    type: "Machine",
    label: m.serialNumber ? `S/N ${m.serialNumber}` : `Machine ${m.id.slice(-6)}`,
    sublabel: m.manufactureYear ? String(m.manufactureYear) : null,
    href: null,
    meta: { status: m.status ?? null, year: m.manufactureYear ?? null },
  };
}

function partNode(p: {
  id: string;
  partNumber?: string | null;
  condition?: string | null;
}): GraphNode {
  return {
    id: p.id,
    type: "Part",
    label: p.partNumber ? `Part ${p.partNumber}` : `Part ${p.id.slice(-6)}`,
    sublabel: p.condition ?? null,
    href: null,
    meta: { condition: p.condition ?? null },
  };
}

function attachmentNode(a: {
  id: string;
  attachmentType?: string | null;
  capacity?: string | null;
}): GraphNode {
  return {
    id: a.id,
    type: "Attachment",
    label: a.attachmentType ?? `Attachment ${a.id.slice(-6)}`,
    sublabel: a.capacity ?? null,
    href: null,
    meta: { capacity: a.capacity ?? null },
  };
}

function categoryNode(c: {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  layer?: string | null;
  level?: number | null;
}): GraphNode {
  return {
    id: c.id,
    type: "Category",
    label: c.name,
    sublabel: c.nameEn ?? null,
    href: categoryHref(c),
    meta: { layer: c.layer ?? null, level: c.level ?? null },
  };
}

function listingNode(l: {
  id: string;
  title: string;
  slug: string;
  price?: bigint | number | null;
  year?: number | null;
  status?: string | null;
}): GraphNode {
  return {
    id: l.id,
    type: "Listing",
    label: l.title,
    sublabel: l.slug,
    href: listingHref(l),
    meta: {
      price: l.price != null ? l.price.toString() : null,
      year: l.year ?? null,
      status: l.status ?? null,
    },
  };
}

function companyNode(c: {
  id: string;
  name?: string | null;
  slug?: string | null;
  verified?: boolean | null;
}): GraphNode {
  return {
    id: c.id,
    type: "Company",
    label: c.name ?? `Company ${c.id.slice(-6)}`,
    sublabel: c.slug ?? null,
    href: c.slug ? `/companies/${c.slug}` : null,
    meta: { verified: c.verified ?? null },
  };
}

/* ─────────── Entity fetchers ───────────
   Each fetcher loads one entity + its immediate neighbours and
   contributes nodes + edges to the running bundle. The BFS layer
   in `getEntityGraph` decides which fetchers to invoke based on
   the node type popped from the queue. */

interface FetchedLayer {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

async function fetchBrandLayer(brandId: string): Promise<FetchedLayer> {
  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      country: true,
      verification: true,
      brandFamilyId: true,
    },
  });
  if (!brand) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [brandNode(brand)];
  const edges: GraphEdge[] = [];

  // Family
  if (brand.brandFamilyId) {
    const fam = await db.brandFamily.findUnique({
      where: { id: brand.brandFamilyId },
      select: { id: true, name: true, slug: true },
    });
    if (fam) {
      // Family is represented as a Brand-typed node with sublabel
      nodes.push({
        id: fam.id,
        type: "Brand",
        label: fam.name,
        sublabel: "خانواده برند",
        href: `/brand-families/${fam.slug}`,
        meta: { family: true },
      });
      edges.push({
        source: brand.id,
        target: fam.id,
        sourceType: "Brand",
        targetType: "Brand",
        relation: "MEMBER_OF_FAMILY",
      });
    }
  }

  // Models
  const models = await db.productModel.findMany({
    where: { brandId },
    select: { id: true, name: true, nameEn: true, slug: true, status: true },
    take: 50,
  });
  for (const m of models) {
    nodes.push(modelNode(m));
    edges.push({
      source: brand.id,
      target: m.id,
      sourceType: "Brand",
      targetType: "Model",
      relation: "HAS_MODEL",
    });
  }

  // Products (directly under brand, not via model)
  const products = await db.product.findMany({
    where: { brandId, modelId: null },
    select: { id: true, canonicalName: true, slug: true, status: true },
    take: 50,
  });
  for (const p of products) {
    nodes.push(productNode(p));
    edges.push({
      source: brand.id,
      target: p.id,
      sourceType: "Brand",
      targetType: "Product",
      relation: "MAKES_PRODUCT",
    });
  }

  // Listings
  const listings = await db.listing.findMany({
    where: { brandId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      year: true,
      status: true,
    },
    take: 50,
  });
  for (const l of listings) {
    nodes.push(listingNode(l));
    edges.push({
      source: brand.id,
      target: l.id,
      sourceType: "Brand",
      targetType: "Listing",
      relation: "HAS_LISTING",
    });
  }

  // Categories via BrandCategory
  const brandCats = await db.brandCategory.findMany({
    where: { brandId },
    select: {
      category: { select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true } },
    },
    take: 30,
  });
  for (const bc of brandCats) {
    const c = bc.category;
    nodes.push(categoryNode(c));
    edges.push({
      source: brand.id,
      target: c.id,
      sourceType: "Brand",
      targetType: "Category",
      relation: "ACTIVE_IN_CATEGORY",
    });
  }

  return { nodes, edges };
}

async function fetchModelLayer(modelId: string): Promise<FetchedLayer> {
  const model = await db.productModel.findUnique({
    where: { id: modelId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      status: true,
      brandId: true,
      categoryId: true,
    },
  });
  if (!model) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Brand parent
  if (model.brandId) {
    const b = await db.brand.findUnique({
      where: { id: model.brandId },
      select: { id: true, name: true, nameEn: true, slug: true, country: true, verification: true },
    });
    if (b) {
      nodes.push(brandNode(b));
      edges.push({
        source: b.id,
        target: model.id,
        sourceType: "Brand",
        targetType: "Model",
        relation: "HAS_MODEL",
      });
    }
  }

  // Products under this model
  const products = await db.product.findMany({
    where: { modelId },
    select: { id: true, canonicalName: true, slug: true, status: true },
    take: 30,
  });
  for (const p of products) {
    nodes.push(productNode(p));
    edges.push({
      source: model.id,
      target: p.id,
      sourceType: "Model",
      targetType: "Product",
      relation: "HAS_PRODUCT",
    });
  }

  // Listings under this model
  const listings = await db.listing.findMany({
    where: { modelId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, price: true, year: true, status: true },
    take: 30,
  });
  for (const l of listings) {
    nodes.push(listingNode(l));
    edges.push({
      source: model.id,
      target: l.id,
      sourceType: "Model",
      targetType: "Listing",
      relation: "HAS_LISTING",
    });
  }

  return { nodes, edges };
}

async function fetchProductLayer(productId: string): Promise<FetchedLayer> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      canonicalName: true,
      slug: true,
      status: true,
      brandId: true,
      modelId: true,
      categoryId: true,
    },
  });
  if (!product) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [productNode(product)];
  const edges: GraphEdge[] = [];

  if (product.brandId) {
    const b = await db.brand.findUnique({
      where: { id: product.brandId },
      select: { id: true, name: true, nameEn: true, slug: true, country: true, verification: true },
    });
    if (b) {
      nodes.push(brandNode(b));
      edges.push({
        source: b.id,
        target: product.id,
        sourceType: "Brand",
        targetType: "Product",
        relation: "MAKES_PRODUCT",
      });
    }
  }
  if (product.modelId) {
    const m = await db.productModel.findUnique({
      where: { id: product.modelId },
      select: { id: true, name: true, nameEn: true, slug: true, status: true },
    });
    if (m) {
      nodes.push(modelNode(m));
      edges.push({
        source: m.id,
        target: product.id,
        sourceType: "Model",
        targetType: "Product",
        relation: "HAS_PRODUCT",
      });
    }
  }
  if (product.categoryId) {
    const c = await db.category.findUnique({
      where: { id: product.categoryId },
      select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true },
    });
    if (c) {
      nodes.push(categoryNode(c));
      edges.push({
        source: c.id,
        target: product.id,
        sourceType: "Category",
        targetType: "Product",
        relation: "CONTAINS_PRODUCT",
      });
    }
  }

  // Machines, parts, attachments
  const [machines, parts, attachments] = await Promise.all([
    db.machine.findMany({
      where: { productId },
      select: { id: true, serialNumber: true, manufactureYear: true, status: true },
      take: 20,
    }),
    db.part.findMany({
      where: { productId },
      select: { id: true, partNumber: true, condition: true },
      take: 20,
    }),
    db.attachment.findMany({
      where: { productId },
      select: { id: true, attachmentType: true, capacity: true },
      take: 20,
    }),
  ]);
  for (const m of machines) {
    nodes.push(machineNode(m));
    edges.push({
      source: product.id,
      target: m.id,
      sourceType: "Product",
      targetType: "Machine",
      relation: "HAS_MACHINE",
    });
  }
  for (const p of parts) {
    nodes.push(partNode(p));
    edges.push({
      source: product.id,
      target: p.id,
      sourceType: "Product",
      targetType: "Part",
      relation: "HAS_PART",
    });
  }
  for (const a of attachments) {
    nodes.push(attachmentNode(a));
    edges.push({
      source: product.id,
      target: a.id,
      sourceType: "Product",
      targetType: "Attachment",
      relation: "HAS_ATTACHMENT",
    });
  }

  // Listings attached to this product
  const listings = await db.listing.findMany({
    where: { productId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, price: true, year: true, status: true },
    take: 20,
  });
  for (const l of listings) {
    nodes.push(listingNode(l));
    edges.push({
      source: product.id,
      target: l.id,
      sourceType: "Product",
      targetType: "Listing",
      relation: "HAS_LISTING",
    });
  }

  return { nodes, edges };
}

async function fetchCategoryLayer(categoryId: string): Promise<FetchedLayer> {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true, parentId: true },
  });
  if (!category) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [categoryNode(category)];
  const edges: GraphEdge[] = [];

  // Parent
  if (category.parentId) {
    const p = await db.category.findUnique({
      where: { id: category.parentId },
      select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true },
    });
    if (p) {
      nodes.push(categoryNode(p));
      edges.push({
        source: p.id,
        target: category.id,
        sourceType: "Category",
        targetType: "Category",
        relation: "HAS_CHILD",
      });
    }
  }

  // Children
  const children = await db.category.findMany({
    where: { parentId: categoryId },
    select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true },
    take: 50,
  });
  for (const c of children) {
    nodes.push(categoryNode(c));
    edges.push({
      source: category.id,
      target: c.id,
      sourceType: "Category",
      targetType: "Category",
      relation: "HAS_CHILD",
    });
  }

  // Products in this category
  const products = await db.product.findMany({
    where: { categoryId },
    select: { id: true, canonicalName: true, slug: true, status: true },
    take: 50,
  });
  for (const p of products) {
    nodes.push(productNode(p));
    edges.push({
      source: category.id,
      target: p.id,
      sourceType: "Category",
      targetType: "Product",
      relation: "CONTAINS_PRODUCT",
    });
  }

  // Listings in this category
  const listings = await db.listing.findMany({
    where: { categoryId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, price: true, year: true, status: true },
    take: 50,
  });
  for (const l of listings) {
    nodes.push(listingNode(l));
    edges.push({
      source: category.id,
      target: l.id,
      sourceType: "Category",
      targetType: "Listing",
      relation: "HAS_LISTING",
    });
  }

  // Brands active in this category
  const brandCats = await db.brandCategory.findMany({
    where: { categoryId },
    select: {
      brand: { select: { id: true, name: true, nameEn: true, slug: true, country: true, verification: true } },
    },
    take: 30,
  });
  for (const bc of brandCats) {
    nodes.push(brandNode(bc.brand));
    edges.push({
      source: bc.brand.id,
      target: category.id,
      sourceType: "Brand",
      targetType: "Category",
      relation: "ACTIVE_IN_CATEGORY",
    });
  }

  return { nodes, edges };
}

async function fetchListingLayer(listingId: string): Promise<FetchedLayer> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      year: true,
      status: true,
      brandId: true,
      categoryId: true,
      modelId: true,
      productId: true,
      companyId: true,
      sellerId: true,
    },
  });
  if (!listing) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [listingNode(listing)];
  const edges: GraphEdge[] = [];

  if (listing.brandId) {
    const b = await db.brand.findUnique({
      where: { id: listing.brandId },
      select: { id: true, name: true, nameEn: true, slug: true, country: true, verification: true },
    });
    if (b) {
      nodes.push(brandNode(b));
      edges.push({
        source: b.id,
        target: listing.id,
        sourceType: "Brand",
        targetType: "Listing",
        relation: "HAS_LISTING",
      });
    }
  }
  if (listing.categoryId) {
    const c = await db.category.findUnique({
      where: { id: listing.categoryId },
      select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true },
    });
    if (c) {
      nodes.push(categoryNode(c));
      edges.push({
        source: c.id,
        target: listing.id,
        sourceType: "Category",
        targetType: "Listing",
        relation: "HAS_LISTING",
      });
    }
  }
  if (listing.modelId) {
    const m = await db.productModel.findUnique({
      where: { id: listing.modelId },
      select: { id: true, name: true, nameEn: true, slug: true, status: true },
    });
    if (m) {
      nodes.push(modelNode(m));
      edges.push({
        source: m.id,
        target: listing.id,
        sourceType: "Model",
        targetType: "Listing",
        relation: "HAS_LISTING",
      });
    }
  }
  if (listing.productId) {
    const p = await db.product.findUnique({
      where: { id: listing.productId },
      select: { id: true, canonicalName: true, slug: true, status: true },
    });
    if (p) {
      nodes.push(productNode(p));
      edges.push({
        source: p.id,
        target: listing.id,
        sourceType: "Product",
        targetType: "Listing",
        relation: "HAS_LISTING",
      });
    }
  }
  if (listing.companyId) {
    const c = await db.company.findUnique({
      where: { id: listing.companyId },
      select: { id: true, name: true, slug: true, verified: true },
    });
    if (c) {
      nodes.push(companyNode(c));
      edges.push({
        source: c.id,
        target: listing.id,
        sourceType: "Company",
        targetType: "Listing",
        relation: "OWNS_LISTING",
      });
    }
  }

  return { nodes, edges };
}

async function fetchCompanyLayer(companyId: string): Promise<FetchedLayer> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, verified: true },
  });
  if (!company) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [companyNode(company)];
  const edges: GraphEdge[] = [];

  const listings = await db.listing.findMany({
    where: { companyId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, price: true, year: true, status: true },
    take: 30,
  });
  for (const l of listings) {
    nodes.push(listingNode(l));
    edges.push({
      source: company.id,
      target: l.id,
      sourceType: "Company",
      targetType: "Listing",
      relation: "OWNS_LISTING",
    });
  }

  return { nodes, edges };
}

async function fetchMachineLayer(machineId: string): Promise<FetchedLayer> {
  const machine = await db.machine.findUnique({
    where: { id: machineId },
    select: {
      id: true,
      serialNumber: true,
      manufactureYear: true,
      status: true,
      productId: true,
      listingId: true,
    },
  });
  if (!machine) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [machineNode(machine)];
  const edges: GraphEdge[] = [];

  if (machine.productId) {
    const p = await db.product.findUnique({
      where: { id: machine.productId },
      select: { id: true, canonicalName: true, slug: true, status: true },
    });
    if (p) {
      nodes.push(productNode(p));
      edges.push({
        source: p.id,
        target: machine.id,
        sourceType: "Product",
        targetType: "Machine",
        relation: "HAS_MACHINE",
      });
    }
  }
  if (machine.listingId) {
    const l = await db.listing.findUnique({
      where: { id: machine.listingId },
      select: { id: true, title: true, slug: true, price: true, year: true, status: true },
    });
    if (l) {
      nodes.push(listingNode(l));
      edges.push({
        source: l.id,
        target: machine.id,
        sourceType: "Listing",
        targetType: "Machine",
        relation: "PRIMARY_MACHINE",
      });
    }
  }

  return { nodes, edges };
}

async function fetchPartLayer(partId: string): Promise<FetchedLayer> {
  const part = await db.part.findUnique({
    where: { id: partId },
    select: { id: true, partNumber: true, condition: true, productId: true },
  });
  if (!part) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [partNode(part)];
  const edges: GraphEdge[] = [];
  if (part.productId) {
    const p = await db.product.findUnique({
      where: { id: part.productId },
      select: { id: true, canonicalName: true, slug: true, status: true },
    });
    if (p) {
      nodes.push(productNode(p));
      edges.push({
        source: p.id,
        target: part.id,
        sourceType: "Product",
        targetType: "Part",
        relation: "HAS_PART",
      });
    }
  }
  return { nodes, edges };
}

async function fetchAttachmentLayer(attachmentId: string): Promise<FetchedLayer> {
  const a = await db.attachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, attachmentType: true, capacity: true, productId: true },
  });
  if (!a) return { nodes: [], edges: [] };
  const nodes: GraphNode[] = [attachmentNode(a)];
  const edges: GraphEdge[] = [];
  if (a.productId) {
    const p = await db.product.findUnique({
      where: { id: a.productId },
      select: { id: true, canonicalName: true, slug: true, status: true },
    });
    if (p) {
      nodes.push(productNode(p));
      edges.push({
        source: p.id,
        target: a.id,
        sourceType: "Product",
        targetType: "Attachment",
        relation: "HAS_ATTACHMENT",
      });
    }
  }
  return { nodes, edges };
}

/* ─────────── Compatibility edges ───────────
   Cross-entity compatibility edges are merged into every fetch
   result so the graph view can show FITS / REPLACES / UPGRADES
   relations between Products/Parts/Attachments. */

async function fetchCompatibilityLayer(
  entityType: GraphEntityType,
  entityId: string,
): Promise<FetchedLayer> {
  // CompatibilityEdge stores entity types as "Product" | "Machine" |
  // "Part" | "Attachment" | "Model" (no Brand/Category/Listing/
  // Company). We still attempt the lookup for any type so future
  // edge additions are picked up automatically.
  const edges = await db.compatibilityEdge.findMany({
    where: {
      OR: [
        { sourceEntityType: entityType, sourceEntityId: entityId },
        { targetEntityType: entityType, targetEntityId: entityId },
      ],
    },
    take: 50,
  });
  if (edges.length === 0) return { nodes: [], edges: [] };

  const nodes: GraphNode[] = [];
  const out: GraphEdge[] = [];
  const seenNodes = new Set<string>();

  for (const e of edges) {
    const isSource = e.sourceEntityType === entityType && e.sourceEntityId === entityId;
    const otherType = (isSource ? e.targetEntityType : e.sourceEntityType) as GraphEntityType;
    const otherId = isSource ? e.targetEntityId : e.sourceEntityId;
    const nodeKey = `${otherType}:${otherId}`;
    if (!seenNodes.has(nodeKey)) {
      seenNodes.add(nodeKey);
      // Lazy-load a minimal node by type
      const node = await loadMinimalNode(otherType, otherId);
      if (node) nodes.push(node);
    }
    out.push({
      source: e.sourceEntityType === entityType ? entityId : e.sourceEntityId,
      target: e.targetEntityType === entityType ? entityId : e.targetEntityId,
      sourceType: e.sourceEntityType as GraphEntityType,
      targetType: e.targetEntityType as GraphEntityType,
      relation: e.relationType,
    });
  }

  return { nodes, edges: out };
}

async function loadMinimalNode(
  type: GraphEntityType,
  id: string,
): Promise<GraphNode | null> {
  try {
    switch (type) {
      case "Brand": {
        const b = await db.brand.findUnique({
          where: { id },
          select: { id: true, name: true, nameEn: true, slug: true, country: true, verification: true },
        });
        return b ? brandNode(b) : null;
      }
      case "Model": {
        const m = await db.productModel.findUnique({
          where: { id },
          select: { id: true, name: true, nameEn: true, slug: true, status: true },
        });
        return m ? modelNode(m) : null;
      }
      case "Product": {
        const p = await db.product.findUnique({
          where: { id },
          select: { id: true, canonicalName: true, slug: true, status: true },
        });
        return p ? productNode(p) : null;
      }
      case "Machine": {
        const m = await db.machine.findUnique({
          where: { id },
          select: { id: true, serialNumber: true, manufactureYear: true, status: true },
        });
        return m ? machineNode(m) : null;
      }
      case "Part": {
        const p = await db.part.findUnique({
          where: { id },
          select: { id: true, partNumber: true, condition: true },
        });
        return p ? partNode(p) : null;
      }
      case "Attachment": {
        const a = await db.attachment.findUnique({
          where: { id },
          select: { id: true, attachmentType: true, capacity: true },
        });
        return a ? attachmentNode(a) : null;
      }
      case "Category": {
        const c = await db.category.findUnique({
          where: { id },
          select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true },
        });
        return c ? categoryNode(c) : null;
      }
      case "Listing": {
        const l = await db.listing.findUnique({
          where: { id },
          select: { id: true, title: true, slug: true, price: true, year: true, status: true },
        });
        return l ? listingNode(l) : null;
      }
      case "Company": {
        const c = await db.company.findUnique({
          where: { id },
          select: { id: true, name: true, slug: true, verified: true },
        });
        return c ? companyNode(c) : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/* ─────────── BFS traversal ─────────── */

const LAYER_FETCHERS: Record<
  GraphEntityType,
  (id: string) => Promise<FetchedLayer>
> = {
  Brand: fetchBrandLayer,
  Model: fetchModelLayer,
  Product: fetchProductLayer,
  Machine: fetchMachineLayer,
  Part: fetchPartLayer,
  Attachment: fetchAttachmentLayer,
  Category: fetchCategoryLayer,
  Listing: fetchListingLayer,
  Company: fetchCompanyLayer,
};

/**
 * BFS traversal of the knowledge graph starting at any typed entity.
 *
 * Depth limits traversal (default 2). At each level we invoke the
 * per-type fetcher for every queued node, merge the new nodes +
 * edges, and queue the new nodes for the next level. Compatibility
 * edges (cross-entity FITS / REPLACES / UPGRADES) are also followed
 * so the graph view shows inter-catalog relations.
 */
export async function getEntityGraph(
  entityType: string,
  entityId: string,
  depth: number = 2,
): Promise<GraphBundle> {
  const startType = entityType as GraphEntityType;
  const fetcher = LAYER_FETCHERS[startType];
  if (!fetcher) {
    return { nodes: [], edges: [] };
  }

  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  // Seed the BFS with the root node.
  const rootLayer = await fetcher(entityId);
  const compatLayer = await fetchCompatibilityLayer(startType, entityId);
  mergeLayer(rootLayer);
  mergeLayer(compatLayer);

  // BFS frontier
  let frontier: { type: GraphEntityType; id: string }[] = [
    ...rootLayer.nodes
      .filter((n) => !(n.type === startType && n.id === entityId))
      .map((n) => ({ type: n.type, id: n.id })),
    ...compatLayer.nodes.map((n) => ({ type: n.type, id: n.id })),
  ];

  for (let d = 1; d < depth; d++) {
    const nextFrontier: { type: GraphEntityType; id: string }[] = [];
    for (const item of frontier) {
      const f = LAYER_FETCHERS[item.type];
      if (!f) continue;
      const layer = await f(item.id);
      const compat = await fetchCompatibilityLayer(item.type, item.id);
      const newNodes = mergeLayer(layer).concat(mergeLayer(compat));
      for (const n of newNodes) {
        nextFrontier.push({ type: n.type, id: n.id });
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return { nodes: Array.from(nodesMap.values()), edges };

  function mergeLayer(layer: FetchedLayer): GraphNode[] {
    const fresh: GraphNode[] = [];
    for (const n of layer.nodes) {
      const key = `${n.type}:${n.id}`;
      if (!nodesMap.has(key)) {
        nodesMap.set(key, n);
        fresh.push(n);
      }
    }
    for (const e of layer.edges) {
      const k = `${e.source}|${e.target}|${e.relation}`;
      if (!edgeKeys.has(k)) {
        edgeKeys.add(k);
        edges.push(e);
      }
    }
    return fresh;
  }
}

/* ─────────── Full-context bundles ─────────── */

export interface BrandGraph {
  brand: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    country: string | null;
    verification: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
  } | null;
  models: Array<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    status: string;
  }>;
  products: Array<{
    id: string;
    canonicalName: string;
    slug: string;
    status: string;
  }>;
  listings: Array<{
    id: string;
    title: string;
    slug: string;
    price: string | null;
    year: number | null;
  }>;
  categories: Array<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    layer: string;
    level: number;
  }>;
  industries: string[];
  families: Array<{ id: string; name: string; slug: string }>;
  counts: {
    models: number;
    products: number;
    listings: number;
    categories: number;
    industries: number;
  };
}

export async function getBrandGraph(brandId: string): Promise<BrandGraph> {
  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      country: true,
      verification: true,
      description: true,
      logoUrl: true,
      website: true,
      brandFamilyId: true,
    },
  });
  if (!brand) {
    return {
      brand: null,
      models: [],
      products: [],
      listings: [],
      categories: [],
      industries: [],
      families: [],
      counts: {
        models: 0,
        products: 0,
        listings: 0,
        categories: 0,
        industries: 0,
      },
    };
  }

  const [models, products, listings, brandCats, brandInds, family] = await Promise.all([
    db.productModel.findMany({
      where: { brandId },
      select: { id: true, name: true, nameEn: true, slug: true, status: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { brandId },
      select: { id: true, canonicalName: true, slug: true, status: true },
      orderBy: { canonicalName: "asc" },
    }),
    db.listing.findMany({
      where: { brandId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, price: true, year: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.brandCategory.findMany({
      where: { brandId },
      select: {
        category: { select: { id: true, name: true, nameEn: true, slug: true, layer: true, level: true } },
      },
    }),
    db.brandIndustry.findMany({ where: { brandId }, select: { industry: true } }),
    brand.brandFamilyId
      ? db.brandFamily.findUnique({
          where: { id: brand.brandFamilyId },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve(null),
  ]);

  // Sibling brands in the same family
  let families: Array<{ id: string; name: string; slug: string }> = [];
  if (family) {
    families = [family];
    const siblings = await db.brand.findMany({
      where: { brandFamilyId: family.id, id: { not: brandId } },
      select: { id: true, name: true, slug: true },
      take: 20,
    });
    families = families.concat(
      siblings.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    );
  }

  return {
    brand: {
      id: brand.id,
      name: brand.name,
      nameEn: brand.nameEn,
      slug: brand.slug,
      country: brand.country,
      verification: brand.verification,
      description: brand.description,
      logoUrl: brand.logoUrl,
      website: brand.website,
    },
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn,
      slug: m.slug,
      status: m.status,
    })),
    products: products.map((p) => ({
      id: p.id,
      canonicalName: p.canonicalName,
      slug: p.slug,
      status: p.status,
    })),
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      price: l.price ? l.price.toString() : null,
      year: l.year,
    })),
    categories: brandCats.map((bc) => ({
      id: bc.category.id,
      name: bc.category.name,
      nameEn: bc.category.nameEn,
      slug: bc.category.slug,
      layer: bc.category.layer,
      level: bc.category.level,
    })),
    industries: brandInds.map((bi) => bi.industry),
    families,
    counts: {
      models: models.length,
      products: products.length,
      listings: listings.length,
      categories: brandCats.length,
      industries: brandInds.length,
    },
  };
}

export interface CategoryGraph {
  category: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    layer: string;
    level: number;
    parentId: string | null;
    description: string | null;
  } | null;
  children: Array<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    level: number;
  }>;
  brands: Array<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    country: string | null;
  }>;
  products: Array<{
    id: string;
    canonicalName: string;
    slug: string;
    status: string;
  }>;
  listings: Array<{
    id: string;
    title: string;
    slug: string;
    price: string | null;
    year: number | null;
  }>;
  attributes: Array<{
    id: string;
    key: string | null;
    labelFa: string | null;
    type: string;
    required: boolean;
  }>;
  counts: {
    children: number;
    brands: number;
    products: number;
    listings: number;
    attributes: number;
  };
}

export async function getCategoryGraph(categoryId: string): Promise<CategoryGraph> {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      layer: true,
      level: true,
      parentId: true,
      description: true,
    },
  });
  if (!category) {
    return {
      category: null,
      children: [],
      brands: [],
      products: [],
      listings: [],
      attributes: [],
      counts: { children: 0, brands: 0, products: 0, listings: 0, attributes: 0 },
    };
  }

  const [children, brandCats, products, listings, catAttrs] = await Promise.all([
    db.category.findMany({
      where: { parentId: categoryId },
      select: { id: true, name: true, nameEn: true, slug: true, level: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.brandCategory.findMany({
      where: { categoryId },
      select: {
        brand: { select: { id: true, name: true, nameEn: true, slug: true, country: true } },
      },
    }),
    db.product.findMany({
      where: { categoryId },
      select: { id: true, canonicalName: true, slug: true, status: true },
      orderBy: { canonicalName: "asc" },
      take: 100,
    }),
    db.listing.findMany({
      where: { categoryId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, price: true, year: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.categoryAttribute.findMany({
      where: { categoryId },
      select: {
        required: true,
        attribute: {
          select: { id: true, key: true, labelFa: true, type: true },
        },
      },
      take: 100,
    }),
  ]);

  return {
    category: {
      id: category.id,
      name: category.name,
      nameEn: category.nameEn,
      slug: category.slug,
      layer: category.layer,
      level: category.level,
      parentId: category.parentId,
      description: category.description,
    },
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      slug: c.slug,
      level: c.level,
    })),
    brands: brandCats.map((bc) => ({
      id: bc.brand.id,
      name: bc.brand.name,
      nameEn: bc.brand.nameEn,
      slug: bc.brand.slug,
      country: bc.brand.country,
    })),
    products: products.map((p) => ({
      id: p.id,
      canonicalName: p.canonicalName,
      slug: p.slug,
      status: p.status,
    })),
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      price: l.price ? l.price.toString() : null,
      year: l.year,
    })),
    attributes: catAttrs.map((ca) => ({
      id: ca.attribute.id,
      key: ca.attribute.key,
      labelFa: ca.attribute.labelFa,
      type: ca.attribute.type,
      required: ca.required,
    })),
    counts: {
      children: children.length,
      brands: brandCats.length,
      products: products.length,
      listings: listings.length,
      attributes: catAttrs.length,
    },
  };
}

export interface ProductGraph {
  product: {
    id: string;
    canonicalName: string;
    slug: string;
    status: string;
    description: string | null;
  } | null;
  brand: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
  } | null;
  model: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
  } | null;
  category: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
  } | null;
  compatibleParts: Array<{
    id: string;
    partNumber: string | null;
    condition: string | null;
    relation: string;
  }>;
  compatibleAttachments: Array<{
    id: string;
    attachmentType: string | null;
    capacity: string | null;
    relation: string;
  }>;
  listings: Array<{
    id: string;
    title: string;
    slug: string;
    price: string | null;
    year: number | null;
  }>;
  machines: Array<{
    id: string;
    serialNumber: string | null;
    manufactureYear: number | null;
    status: string;
  }>;
  counts: {
    listings: number;
    machines: number;
    compatibleParts: number;
    compatibleAttachments: number;
  };
}

export async function getProductGraph(productId: string): Promise<ProductGraph> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      canonicalName: true,
      slug: true,
      status: true,
      description: true,
      brandId: true,
      modelId: true,
      categoryId: true,
    },
  });
  if (!product) {
    return {
      product: null,
      brand: null,
      model: null,
      category: null,
      compatibleParts: [],
      compatibleAttachments: [],
      listings: [],
      machines: [],
      counts: {
        listings: 0,
        machines: 0,
        compatibleParts: 0,
        compatibleAttachments: 0,
      },
    };
  }

  const [brand, model, category, machines, listings, compatEdges] = await Promise.all([
    product.brandId
      ? db.brand.findUnique({
          where: { id: product.brandId },
          select: { id: true, name: true, nameEn: true, slug: true },
        })
      : Promise.resolve(null),
    product.modelId
      ? db.productModel.findUnique({
          where: { id: product.modelId },
          select: { id: true, name: true, nameEn: true, slug: true },
        })
      : Promise.resolve(null),
    product.categoryId
      ? db.category.findUnique({
          where: { id: product.categoryId },
          select: { id: true, name: true, nameEn: true, slug: true },
        })
      : Promise.resolve(null),
    db.machine.findMany({
      where: { productId },
      select: { id: true, serialNumber: true, manufactureYear: true, status: true },
      take: 30,
    }),
    db.listing.findMany({
      where: { productId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, price: true, year: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.compatibilityEdge.findMany({
      where: {
        OR: [
          { sourceEntityType: "Product", sourceEntityId: productId },
          { targetEntityType: "Product", targetEntityId: productId },
        ],
      },
      take: 100,
    }),
  ]);

  // Resolve compat edges → compatible Parts + Attachments
  const partIds = new Set<string>();
  const attachmentIds = new Set<string>();
  for (const e of compatEdges) {
    const otherType =
      e.sourceEntityType === "Product" && e.sourceEntityId === productId
        ? e.targetEntityType
        : e.sourceEntityType;
    const otherId =
      e.sourceEntityType === "Product" && e.sourceEntityId === productId
        ? e.targetEntityId
        : e.sourceEntityId;
    if (otherType === "Part") partIds.add(otherId);
    if (otherType === "Attachment") attachmentIds.add(otherId);
  }

  const [parts, attachments] = await Promise.all([
    partIds.size > 0
      ? db.part.findMany({
          where: { id: { in: Array.from(partIds) } },
          select: { id: true, partNumber: true, condition: true },
        })
      : Promise.resolve([]),
    attachmentIds.size > 0
      ? db.attachment.findMany({
          where: { id: { in: Array.from(attachmentIds) } },
          select: { id: true, attachmentType: true, capacity: true },
        })
      : Promise.resolve([]),
  ]);

  const edgeRelationFor = (
    otherType: string,
    otherId: string,
  ): string => {
    const e = compatEdges.find(
      (x) =>
        (x.sourceEntityType === "Product" &&
          x.sourceEntityId === productId &&
          x.targetEntityType === otherType &&
          x.targetEntityId === otherId) ||
        (x.targetEntityType === "Product" &&
          x.targetEntityId === productId &&
          x.sourceEntityType === otherType &&
          x.sourceEntityId === otherId),
    );
    return e?.relationType ?? "COMPATIBLE_WITH";
  };

  return {
    product: {
      id: product.id,
      canonicalName: product.canonicalName,
      slug: product.slug,
      status: product.status,
      description: product.description,
    },
    brand: brand
      ? { id: brand.id, name: brand.name, nameEn: brand.nameEn, slug: brand.slug }
      : null,
    model: model
      ? { id: model.id, name: model.name, nameEn: model.nameEn, slug: model.slug }
      : null,
    category: category
      ? { id: category.id, name: category.name, nameEn: category.nameEn, slug: category.slug }
      : null,
    compatibleParts: parts.map((p) => ({
      id: p.id,
      partNumber: p.partNumber,
      condition: p.condition,
      relation: edgeRelationFor("Part", p.id),
    })),
    compatibleAttachments: attachments.map((a) => ({
      id: a.id,
      attachmentType: a.attachmentType,
      capacity: a.capacity,
      relation: edgeRelationFor("Attachment", a.id),
    })),
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      price: l.price ? l.price.toString() : null,
      year: l.year,
    })),
    machines: machines.map((m) => ({
      id: m.id,
      serialNumber: m.serialNumber,
      manufactureYear: m.manufactureYear,
      status: m.status,
    })),
    counts: {
      listings: listings.length,
      machines: machines.length,
      compatibleParts: parts.length,
      compatibleAttachments: attachments.length,
    },
  };
}
