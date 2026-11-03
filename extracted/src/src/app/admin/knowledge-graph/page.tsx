"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Network,
  Search,
  Loader2,
  RefreshCw,
  Boxes,
  FolderTree,
  Tag,
  Megaphone,
  Building2,
  Cpu,
  ChevronLeft,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

/* ============================================================
   /admin/knowledge-graph — queryable knowledge graph viewer.
   Lets an admin pick a Brand / Category / Product (or any
   typed entity via free-form) and explore its derived graph:
   nodes + edges, plus a structured nested-list view + counts.
   ============================================================ */

type EntityType =
  | "Brand"
  | "Model"
  | "Product"
  | "Machine"
  | "Part"
  | "Attachment"
  | "Category"
  | "Listing"
  | "Company";

type GraphNode = {
  id: string;
  type: EntityType;
  label: string;
  sublabel?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
};

type GraphEdge = {
  source: string;
  target: string;
  sourceType: EntityType;
  targetType: EntityType;
  relation: string;
};

type BrandBundle = {
  view: "brand";
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
  models: Array<{ id: string; name: string; nameEn: string | null; slug: string; status: string }>;
  products: Array<{ id: string; canonicalName: string; slug: string; status: string }>;
  listings: Array<{ id: string; title: string; slug: string; price: string | null; year: number | null }>;
  categories: Array<{ id: string; name: string; nameEn: string | null; slug: string; layer: string; level: number }>;
  industries: string[];
  families: Array<{ id: string; name: string; slug: string }>;
  counts: { models: number; products: number; listings: number; categories: number; industries: number };
};

type CategoryBundle = {
  view: "category";
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
  children: Array<{ id: string; name: string; nameEn: string | null; slug: string; level: number }>;
  brands: Array<{ id: string; name: string; nameEn: string | null; slug: string; country: string | null }>;
  products: Array<{ id: string; canonicalName: string; slug: string; status: string }>;
  listings: Array<{ id: string; title: string; slug: string; price: string | null; year: number | null }>;
  attributes: Array<{ id: string; key: string | null; labelFa: string | null; type: string; required: boolean }>;
  counts: { children: number; brands: number; products: number; listings: number; attributes: number };
};

type ProductBundle = {
  view: "product";
  product: {
    id: string;
    canonicalName: string;
    slug: string;
    status: string;
    description: string | null;
  } | null;
  brand: { id: string; name: string; nameEn: string | null; slug: string } | null;
  model: { id: string; name: string; nameEn: string | null; slug: string } | null;
  category: { id: string; name: string; nameEn: string | null; slug: string } | null;
  compatibleParts: Array<{ id: string; partNumber: string | null; condition: string | null; relation: string }>;
  compatibleAttachments: Array<{ id: string; attachmentType: string | null; capacity: string | null; relation: string }>;
  listings: Array<{ id: string; title: string; slug: string; price: string | null; year: number | null }>;
  machines: Array<{ id: string; serialNumber: string | null; manufactureYear: number | null; status: string }>;
  counts: { listings: number; machines: number; compatibleParts: number; compatibleAttachments: number };
};

type GraphView = {
  view: "graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type Bundle = (BrandBundle | CategoryBundle | ProductBundle | GraphView) & { error?: string };

type SearchHit =
  | { kind: "brand"; id: string; name: string; slug: string; sublabel: string | null }
  | { kind: "category"; id: string; name: string; slug: string; sublabel: string | null }
  | { kind: "product"; id: string; name: string; slug: string; sublabel: string | null };

const ENTITY_ICONS: Record<EntityType, any> = {
  Brand: Tag,
  Model: Cpu,
  Product: Boxes,
  Machine: Cpu,
  Part: Cpu,
  Attachment: Cpu,
  Category: FolderTree,
  Listing: Megaphone,
  Company: Building2,
};

export default function KnowledgeGraphAdminPage() {
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<{ type: EntityType; id: string } | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [depth, setDepth] = useState(2);

  // Debounced search across brands/categories/products
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}&type=all&limit=10`,
        );
        const json = await res.json();
        if (cancelled) return;
        const hits: SearchHit[] = [];
        for (const b of json.results?.brands ?? []) {
          hits.push({
            kind: "brand",
            id: b.id,
            name: b.name,
            slug: b.slug,
            sublabel: b.nameEn ?? null,
          });
        }
        for (const c of json.results?.categories ?? []) {
          hits.push({
            kind: "category",
            id: c.id,
            name: c.name,
            slug: c.slug,
            sublabel: c.nameEn ?? null,
          });
        }
        for (const p of json.results?.listings ?? []) {
          hits.push({
            kind: "product",
            id: p.id,
            name: p.title,
            slug: p.slug,
            sublabel: p.brand?.name ?? null,
          });
        }
        setSearchResults(hits);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const loadBundle = useCallback(
    async (type: EntityType, id: string, d: number) => {
      setLoading(true);
      try {
        let view = "graph";
        if (type === "Brand") view = "brand";
        else if (type === "Category") view = "category";
        else if (type === "Product") view = "product";
        const url = `/api/knowledge-graph?view=${view}&entityType=${type}&entityId=${id}&depth=${d}`;
        const res = await fetch(url);
        const json = await res.json();
        setBundle(json as Bundle);
      } catch (e: any) {
        setBundle({ view: "graph", nodes: [], edges: [], error: e?.message ?? "Server error" });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selected) loadBundle(selected.type, selected.id, depth);
  }, [selected, depth, loadBundle]);

  const pick = (hit: SearchHit) => {
    const type: EntityType =
      hit.kind === "brand" ? "Brand" : hit.kind === "category" ? "Category" : "Product";
    setSelected({ type, id: hit.id });
    setQ(hit.name);
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Network className="h-6 w-6 text-[#F58220]" />
            گراف دانش
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            کاوش گراف موجودیت‌های هویکس — برند، دسته، محصول، مدل، آگهی، شرکت و روابط آن‌ها
          </p>
        </div>
        {selected && (
          <button
            onClick={() => selected && loadBundle(selected.type, selected.id, depth)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
        )}
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی برند / دسته / محصول…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-10 pl-4 py-3 text-sm font-medium text-zinc-800 outline-none transition focus:border-[#F58220] focus:bg-white"
          />
          {searchLoading && (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#F58220]" />
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
            {searchResults.map((hit) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                onClick={() => pick(hit)}
                className="flex w-full items-center gap-3 border-b border-zinc-50 px-4 py-2.5 text-right transition last:border-b-0 hover:bg-[#F58220]/5"
              >
                <span className="rounded-lg bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                  {hit.kind === "brand" ? "برند" : hit.kind === "category" ? "دسته" : "آگهی/محصول"}
                </span>
                <span className="flex-1 truncate text-sm font-bold text-zinc-800">{hit.name}</span>
                {hit.sublabel && (
                  <span className="truncate text-xs text-zinc-400">{hit.sublabel}</span>
                )}
                <ChevronLeft className="h-4 w-4 text-zinc-300" />
              </button>
            ))}
          </div>
        )}

        {/* Depth selector */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500">عمق پیمایش:</span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                depth === d
                  ? "bg-[#F58220] text-white"
                  : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {toFa(d)}
            </button>
          ))}
          <span className="mr-auto text-[11px] text-zinc-400">
            (فقط برای نمای گراف عمومی — برای برند/دسته/محصول بسته کامل بارگذاری می‌شود)
          </span>
        </div>
      </div>

      {/* Bundle */}
      {!selected && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Network className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            یک برند، دسته یا محصول انتخاب کنید تا گراف دانش آن نمایش داده شود.
          </p>
        </div>
      )}

      {selected && loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      )}

      {selected && !loading && bundle && (
        <BundleRenderer bundle={bundle} />
      )}
    </div>
  );
}

/* ─────────── Bundle renderer ─────────── */

function BundleRenderer({ bundle }: { bundle: Bundle }) {
  if (bundle.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
        خطا: {bundle.error}
      </div>
    );
  }
  if (bundle.view === "brand") return <BrandBundleView bundle={bundle} />;
  if (bundle.view === "category") return <CategoryBundleView bundle={bundle} />;
  if (bundle.view === "product") return <ProductBundleView bundle={bundle} />;
  return <GraphBundleView bundle={bundle as GraphView} />;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: any;
  tone?: "default" | "emerald" | "amber" | "violet";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>
      <p className={`mt-2 text-2xl font-black ${tones[tone]}`}>
        {typeof value === "number" ? toFa(value) : value}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  count,
  href,
}: {
  title: string;
  icon: any;
  count?: number;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#F58220]" />
        <h3 className="text-sm font-black text-zinc-800">{title}</h3>
        {count != null && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
            {toFa(count)}
          </span>
        )}
        {href && (
          <Link
            href={href}
            target="_blank"
            className="mr-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#F58220] hover:underline"
          >
            مشاهده <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function NestedList({
  items,
  emptyText = "موردی یافت نشد",
}: {
  items: { id: string; label: string; sublabel?: string | null; href?: string | null }[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-zinc-400">{emptyText}</p>;
  }
  return (
    <div className="max-h-72 space-y-1 overflow-y-auto pl-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F58220]" />
          <span className="flex-1 truncate text-xs font-bold text-zinc-700">{it.label}</span>
          {it.sublabel && (
            <span className="truncate text-[11px] text-zinc-400">{it.sublabel}</span>
          )}
          {it.href && (
            <Link
              href={it.href}
              target="_blank"
              className="text-[10px] font-bold text-[#F58220] hover:underline"
            >
              ↗
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────── Brand bundle ─────────── */

function BrandBundleView({ bundle }: { bundle: BrandBundle }) {
  const b = bundle.brand;
  if (!b) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
        برند یافت نشد.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Brand header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-gradient-to-l from-[#F58220]/10 via-white to-white p-5">
        {b.logoUrl ? (
          <img src={b.logoUrl} alt={b.name} className="h-14 w-14 rounded-xl bg-white object-contain p-1" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F58220]/10">
            <Tag className="h-6 w-6 text-[#F58220]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-zinc-900">{b.name}</h2>
          <p className="text-xs text-zinc-500">
            {[b.nameEn, b.country, b.verification].filter(Boolean).join(" • ")}
          </p>
        </div>
        <Link
          href={`/brands/${b.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> صفحه برند
        </Link>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="مدل‌ها" value={bundle.counts.models} icon={Cpu} />
        <StatCard label="محصولات" value={bundle.counts.products} icon={Boxes} tone="emerald" />
        <StatCard label="آگهی‌ها" value={bundle.counts.listings} icon={Megaphone} tone="amber" />
        <StatCard label="دسته‌ها" value={bundle.counts.categories} icon={FolderTree} tone="violet" />
        <StatCard label="صنایع" value={bundle.counts.industries} icon={Sparkles} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="مدل‌ها" icon={Cpu} count={bundle.models.length}>
          <NestedList
            items={bundle.models.map((m) => ({
              id: m.id,
              label: m.name,
              sublabel: m.nameEn,
              href: `/models/${m.slug}`,
            }))}
          />
        </SectionCard>
        <SectionCard title="محصولات" icon={Boxes} count={bundle.products.length}>
          <NestedList
            items={bundle.products.map((p) => ({
              id: p.id,
              label: p.canonicalName,
              sublabel: p.slug,
            }))}
          />
        </SectionCard>
        <SectionCard title="دسته‌های فعال" icon={FolderTree} count={bundle.categories.length}>
          <NestedList
            items={bundle.categories.map((c) => ({
              id: c.id,
              label: c.name,
              sublabel: c.nameEn,
              href: `/categories/${c.slug}`,
            }))}
          />
        </SectionCard>
        <SectionCard title="خانواده‌های مرتبط" icon={Tag} count={bundle.families.length}>
          <NestedList
            items={bundle.families.map((f) => ({
              id: f.id,
              label: f.name,
              href: `/brand-families/${f.slug}`,
            }))}
            emptyText="خانواده برند ثبت نشده"
          />
        </SectionCard>
      </div>

      {/* Listings table */}
      <SectionCard title="آگهی‌های منتشرشده" icon={Megaphone} count={bundle.listings.length}>
        {bundle.listings.length === 0 ? (
          <p className="text-xs text-zinc-400">آگهی‌ای موجود نیست</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">عنوان</th>
                  <th className="px-3 py-2 text-center font-bold">سال</th>
                  <th className="px-3 py-2 text-center font-bold">قیمت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bundle.listings.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-right font-bold text-zinc-800">
                      <Link
                        href={`/listings/${l.slug}`}
                        target="_blank"
                        className="hover:text-[#F58220]"
                      >
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-500">
                      {l.year ? toFa(l.year) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-[#F58220]">
                      {l.price ? formatCompactPrice(BigInt(l.price)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {bundle.industries.length > 0 && (
        <SectionCard title="صنایع کاربرد" icon={Sparkles} count={bundle.industries.length}>
          <div className="flex flex-wrap gap-2">
            {bundle.industries.map((ind) => (
              <span
                key={ind}
                className="rounded-full bg-[#F58220]/10 px-3 py-1 text-xs font-bold text-[#F58220]"
              >
                {ind}
              </span>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─────────── Category bundle ─────────── */

function CategoryBundleView({ bundle }: { bundle: CategoryBundle }) {
  const c = bundle.category;
  if (!c) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
        دسته یافت نشد.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-gradient-to-l from-[#F58220]/10 via-white to-white p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F58220]/10">
          <FolderTree className="h-6 w-6 text-[#F58220]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-zinc-900">{c.name}</h2>
          <p className="text-xs text-zinc-500">
            {[c.nameEn, c.layer, `سطح ${toFa(c.level)}`].filter(Boolean).join(" • ")}
          </p>
        </div>
        <Link
          href={`/categories/${c.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> صفحه دسته
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="زیردسته‌ها" value={bundle.counts.children} icon={FolderTree} />
        <StatCard label="برندها" value={bundle.counts.brands} icon={Tag} tone="emerald" />
        <StatCard label="محصولات" value={bundle.counts.products} icon={Boxes} tone="violet" />
        <StatCard label="آگهی‌ها" value={bundle.counts.listings} icon={Megaphone} tone="amber" />
        <StatCard label="ویژگی‌ها" value={bundle.counts.attributes} icon={Cpu} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="زیردسته‌ها" icon={FolderTree} count={bundle.children.length}>
          <NestedList
            items={bundle.children.map((ch) => ({
              id: ch.id,
              label: ch.name,
              sublabel: ch.nameEn,
              href: `/categories/${ch.slug}`,
            }))}
          />
        </SectionCard>
        <SectionCard title="برندهای فعال" icon={Tag} count={bundle.brands.length}>
          <NestedList
            items={bundle.brands.map((b) => ({
              id: b.id,
              label: b.name,
              sublabel: b.country,
              href: `/brands/${b.slug}`,
            }))}
          />
        </SectionCard>
        <SectionCard title="محصولات" icon={Boxes} count={bundle.products.length}>
          <NestedList
            items={bundle.products.map((p) => ({
              id: p.id,
              label: p.canonicalName,
              sublabel: p.slug,
            }))}
          />
        </SectionCard>
        <SectionCard title="ویژگی‌های دسته" icon={Cpu} count={bundle.attributes.length}>
          {bundle.attributes.length === 0 ? (
            <p className="text-xs text-zinc-400">ویژگی‌ای تعریف نشده</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {bundle.attributes.map((a) => (
                <span
                  key={a.id}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                    a.required
                      ? "bg-red-50 text-red-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {a.labelFa ?? a.key ?? a.id.slice(-6)}
                  <span className="mr-1 text-[9px] opacity-60">({a.type})</span>
                </span>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="آگهی‌های منتشرشده" icon={Megaphone} count={bundle.listings.length}>
        {bundle.listings.length === 0 ? (
          <p className="text-xs text-zinc-400">آگهی‌ای موجود نیست</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-right font-bold">عنوان</th>
                  <th className="px-3 py-2 text-center font-bold">سال</th>
                  <th className="px-3 py-2 text-center font-bold">قیمت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bundle.listings.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-right font-bold text-zinc-800">
                      <Link
                        href={`/listings/${l.slug}`}
                        target="_blank"
                        className="hover:text-[#F58220]"
                      >
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-500">
                      {l.year ? toFa(l.year) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-[#F58220]">
                      {l.price ? formatCompactPrice(BigInt(l.price)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ─────────── Product bundle ─────────── */

function ProductBundleView({ bundle }: { bundle: ProductBundle }) {
  const p = bundle.product;
  if (!p) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-800">
        محصول یافت نشد.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-gradient-to-l from-[#F58220]/10 via-white to-white p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F58220]/10">
          <Boxes className="h-6 w-6 text-[#F58220]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-zinc-900">{p.canonicalName}</h2>
          <p className="text-xs text-zinc-500">
            {[p.slug, p.status].filter(Boolean).join(" • ")}
          </p>
        </div>
      </div>

      {/* Context chips */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ContextChip label="برند" value={bundle.brand?.name ?? "—"} href={bundle.brand ? `/brands/${bundle.brand.slug}` : null} icon={Tag} />
        <ContextChip label="مدل" value={bundle.model?.name ?? "—"} href={bundle.model ? `/models/${bundle.model.slug}` : null} icon={Cpu} />
        <ContextChip label="دسته" value={bundle.category?.name ?? "—"} href={bundle.category ? `/categories/${bundle.category.slug}` : null} icon={FolderTree} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="آگهی‌ها" value={bundle.counts.listings} icon={Megaphone} tone="amber" />
        <StatCard label="ماشین‌ها" value={bundle.counts.machines} icon={Cpu} />
        <StatCard label="قطعات سازگار" value={bundle.counts.compatibleParts} icon={Cpu} tone="emerald" />
        <StatCard label="متعلقات سازگار" value={bundle.counts.compatibleAttachments} icon={Cpu} tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="قطعات سازگار" icon={Cpu} count={bundle.compatibleParts.length}>
          <NestedList
            items={bundle.compatibleParts.map((x) => ({
              id: x.id,
              label: x.partNumber ? `P/N ${x.partNumber}` : x.id.slice(-6),
              sublabel: [x.condition, x.relation].filter(Boolean).join(" • "),
            }))}
            emptyText="قطعه سازگاری ثبت نشده"
          />
        </SectionCard>
        <SectionCard title="متعلقات سازگار" icon={Cpu} count={bundle.compatibleAttachments.length}>
          <NestedList
            items={bundle.compatibleAttachments.map((x) => ({
              id: x.id,
              label: x.attachmentType ?? x.id.slice(-6),
              sublabel: [x.capacity, x.relation].filter(Boolean).join(" • "),
            }))}
            emptyText="متعلقات سازگاری ثبت نشده"
          />
        </SectionCard>
        <SectionCard title="ماشین‌های ثبت‌شده" icon={Cpu} count={bundle.machines.length}>
          <NestedList
            items={bundle.machines.map((m) => ({
              id: m.id,
              label: m.serialNumber ? `S/N ${m.serialNumber}` : m.id.slice(-6),
              sublabel: m.manufactureYear ? `سال ${toFa(m.manufactureYear)}` : null,
            }))}
            emptyText="ماشین فیزیکی ثبت نشده"
          />
        </SectionCard>
        <SectionCard title="آگهی‌های منتشرشده" icon={Megaphone} count={bundle.listings.length}>
          {bundle.listings.length === 0 ? (
            <p className="text-xs text-zinc-400">آگهی‌ای موجود نیست</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {bundle.listings.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5"
                >
                  <Link
                    href={`/listings/${l.slug}`}
                    target="_blank"
                    className="flex-1 truncate text-xs font-bold text-zinc-700 hover:text-[#F58220]"
                  >
                    {l.title}
                  </Link>
                  <span className="text-[11px] text-zinc-400">
                    {l.year ? toFa(l.year) : "—"}
                  </span>
                  <span className="text-[11px] font-bold text-[#F58220]">
                    {l.price ? formatCompactPrice(BigInt(l.price)) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ContextChip({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  href: string | null;
  icon: any;
}) {
  const body = (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <Icon className="h-5 w-5 text-[#F58220]" />
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className="truncate text-sm font-bold text-zinc-800">{value}</p>
      </div>
      {href && <ExternalLink className="mr-auto h-3.5 w-3.5 text-zinc-300" />}
    </div>
  );
  if (href) {
    return (
      <Link href={href} target="_blank" className="block transition hover:border-[#F58220]">
        {body}
      </Link>
    );
  }
  return body;
}

/* ─────────── Generic graph view ─────────── */

function GraphBundleView({ bundle }: { bundle: GraphView }) {
  const { nodes, edges } = bundle;
  const byType = useMemo(() => {
    const map = new Map<EntityType, GraphNode[]>();
    for (const n of nodes) {
      const arr = map.get(n.type) ?? [];
      arr.push(n);
      map.set(n.type, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [nodes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="گره‌ها" value={nodes.length} icon={Network} />
        <StatCard label="یال‌ها" value={edges.length} icon={Network} tone="emerald" />
        <StatCard label="انواع موجودیت" value={byType.length} icon={Boxes} tone="violet" />
        <StatCard
          label="پراکندگی"
          value={byType.map(([t, arr]) => `${t}:${arr.length}`).join("، ")}
          icon={Sparkles}
          tone="amber"
        />
      </div>

      <SectionCard title="گره‌ها بر اساس نوع" icon={Network} count={nodes.length}>
        <div className="space-y-3">
          {byType.map(([type, arr]) => {
            const Icon = ENTITY_ICONS[type] ?? Network;
            return (
              <div key={type}>
                <div className="mb-1 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-[#F58220]" />
                  <span className="text-xs font-bold text-zinc-700">{type}</span>
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">
                    {toFa(arr.length)}
                  </span>
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-3">
                  {arr.map((n) => (
                    <div
                      key={`${n.type}-${n.id}`}
                      className="flex items-center gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1"
                    >
                      <span className="flex-1 truncate text-[11px] font-bold text-zinc-700">
                        {n.label}
                      </span>
                      {n.sublabel && (
                        <span className="truncate text-[10px] text-zinc-400">{n.sublabel}</span>
                      )}
                      {n.href && (
                        <Link
                          href={n.href}
                          target="_blank"
                          className="text-[10px] font-bold text-[#F58220] hover:underline"
                        >
                          ↗
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="یال‌ها" icon={Network} count={edges.length}>
        {edges.length === 0 ? (
          <p className="text-xs text-zinc-400">یالی موجود نیست</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-2 py-2 text-right font-bold">از</th>
                  <th className="px-2 py-2 text-right font-bold">نوع</th>
                  <th className="px-2 py-2 text-right font-bold">به</th>
                  <th className="px-2 py-2 text-right font-bold">نوع</th>
                  <th className="px-2 py-2 text-center font-bold">رابطه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {edges.slice(0, 200).map((e, i) => {
                  const s = nodes.find((n) => n.id === e.source && n.type === e.sourceType);
                  const t = nodes.find((n) => n.id === e.target && n.type === e.targetType);
                  return (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="px-2 py-1.5 text-right font-bold text-zinc-700">
                        {s?.label ?? e.source.slice(-6)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-500">{e.sourceType}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-zinc-700">
                        {t?.label ?? e.target.slice(-6)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-zinc-500">{e.targetType}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                          {e.relation}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
