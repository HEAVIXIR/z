import Link from "next/link";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ListingCard, { type ListingCardData } from "@/components/listings/ListingCard";
import SavedSearchButton from "@/components/listings/SavedSearchButton";
import { ArrowRight, Search, X, ShieldCheck, Sliders } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  category?: string;
  brand?: string;
  yearFrom?: string;
  yearTo?: string;
  minPrice?: string;
  maxPrice?: string;
  featured?: string;
  type?: string;
  // HBR Taxonomy V1.1 dimensions
  transaction?: string;
  province?: string;
  city?: string;
  industry?: string;
  // Dynamic attribute filters (attr.KEY_min, attr.KEY_max, attr.KEY)
  [key: string]: string | undefined;
};

// HBR Taxonomy V1.1 transaction-type chip labels
const TRANSACTION_CHIPS: { key: string; label: string }[] = [
  { key: "SALE", label: "فروش" },
  { key: "RENT", label: "اجاره" },
  { key: "AUCTION", label: "مزایده" },
  { key: "WANTED", label: "درخواست" },
  { key: "QUOTE", label: "پیشنهاد قیمت" },
  { key: "SERVICE_REQUEST", label: "درخواست خدمت" },
];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Build the search URL string for the SavedSearchButton
  const searchUrl = (() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item) params.append(k, String(item));
        }
      } else {
        params.set(k, String(v));
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  })();

  // HBR Taxonomy V1.1 — only CATALOG categories in the filter sidebar.
  // Resolve Iran for the province cascade.
  const [allBrands, catalogCategories, headerCats, iran, allIndustries] = await Promise.all([
    db.brand.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    db.category.findMany({
      where: { active: true, layer: "CATALOG" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        icon: true,
        level: true,
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    db.country.findFirst({
      where: { OR: [{ code: "IR" }, { name: "ایران" }] },
      include: {
        provinces: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
    db.applicationIndustry.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: { id: true, key: true, nameFa: true },
    }),
  ]);

  // Resolve cities for the currently selected province (cascading).
  let cities: { id: string; name: string }[] = [];
  if (sp.province) {
    const province = await db.province.findUnique({
      where: { id: sp.province },
      include: {
        cities: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    });
    cities = province?.cities ?? [];
  }

  /* ── Dynamic attribute filters ──
     When a category is selected, fetch its filterable attributes and
     render matching controls (range for numbers, checkbox list for
     SELECT/MULTI_SELECT, text for TEXT). Values are submitted via the
     form's native GET serialization as `attr.KEY_min`, `attr.KEY_max`,
     `attr.KEY` (the latter can repeat for multi-select). */
  type FilterableAttr = {
    id: string;
    key: string | null;
    name: string;
    nameEn: string | null;
    labelFa: string | null;
    type: string;
    unit: string | null;
    options: { id: string; value: string; label: string | null }[];
  };
  let filterableAttrs: FilterableAttr[] = [];
  if (sp.category) {
    const cat = catalogCategories.find(
      (c) => c.slug === sp.category || c.id === sp.category,
    );
    if (cat) {
      const links = await db.categoryAttribute.findMany({
        where: {
          categoryId: cat.id,
          OR: [{ filterable: true }, { attribute: { filterable: true } }],
        },
        orderBy: [
          { displayOrder: "asc" },
          { attribute: { sortOrder: "asc" } },
          { attribute: { name: "asc" } },
        ],
        include: {
          attribute: {
            include: {
              options: {
                orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
                select: { id: true, value: true, label: true },
              },
            },
          },
        },
      });
      filterableAttrs = links.map((l) => ({
        id: l.attribute.id,
        key: l.attribute.key,
        name: l.attribute.name,
        nameEn: l.attribute.nameEn,
        labelFa: l.attribute.labelFa,
        type: l.attribute.type,
        unit: l.attribute.unit,
        options: l.attribute.options.map((o) => ({
          id: o.id,
          value: o.value,
          label: o.label,
        })),
      }));
    }
  }

  /* Helper: read attr.* values from searchParams (handles both string and
     string[] values from Next.js's URLSearchParams parse). */
  const getAttrParam = (key: string): string[] => {
    const v = (sp as unknown as Record<string, string | string[] | undefined>)[`attr.${key}`];
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v.filter((x) => x !== "");
    return v === "" ? [] : [v];
  };
  const getAttrFirst = (key: string): string => getAttrParam(key)[0] ?? "";

  const catalogRoots = catalogCategories.filter((c) => !c.parentId);
  const catalogChildrenOf = (id: string) =>
    catalogCategories.filter((c) => c.parentId === id);

  /* Build where clause */
  const where: Record<string, unknown> = { status: "PUBLISHED" };

  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q } },
      { shortDesc: { contains: sp.q } },
      { description: { contains: sp.q } },
    ];
  }
  if (sp.category) {
    const cat = catalogCategories.find(
      (c) => c.slug === sp.category || c.id === sp.category,
    );
    if (cat) where.categoryId = cat.id;
  }
  if (sp.brand) {
    const brand = allBrands.find((b) => b.slug === sp.brand || b.id === sp.brand);
    if (brand) where.brandId = brand.id;
  }
  if (sp.yearFrom) where.year = { gte: Number(sp.yearFrom) };
  if (sp.yearTo) {
    where.year = { ...(where.year as object), lte: Number(sp.yearTo) };
  }
  if (sp.minPrice || sp.maxPrice) {
    const priceFilter: Record<string, number> = {};
    if (sp.minPrice) priceFilter.gte = Number(sp.minPrice);
    if (sp.maxPrice) priceFilter.lte = Number(sp.maxPrice);
    where.price = priceFilter;
  }
  if (sp.featured === "true") where.featured = true;

  // HBR V1.1 transaction filter — supports both legacy `type` and new `transaction`.
  const txKey = sp.transaction ?? sp.type;
  if (txKey) where.listingType = txKey;

  // HBR V1.1 location filter (Listing.province/city are String? — store IDs).
  if (sp.province) where.province = sp.province;
  if (sp.city) where.city = sp.city;

  /* ── Dynamic attribute filters ──
     Parse `attr.KEY_min`, `attr.KEY_max`, `attr.KEY` from search params
     and add a `attributeValues: { some: ... }` clause per attribute.
     Resolves the attribute by key OR id (so admin can use either). */
  const attrFilters: {
    key: string;
    min?: number;
    max?: number;
    equals?: string[];
  }[] = [];

  // Collect unique attribute keys from `attr.*` params.
  const attrKeys = new Set<string>();
  for (const k of Object.keys(sp)) {
    if (!k.startsWith("attr.")) continue;
    const stripped = k.slice(5); // remove "attr."
    const base = stripped.replace(/_(min|max)$/, "");
    if (base) attrKeys.add(base);
  }
  for (const key of attrKeys) {
    const minRaw = (sp as unknown as Record<string, string | string[] | undefined>)[`attr.${key}_min`];
    const maxRaw = (sp as unknown as Record<string, string | string[] | undefined>)[`attr.${key}_max`];
    const eqRaw = (sp as unknown as Record<string, string | string[] | undefined>)[`attr.${key}`];
    const min = minRaw ? Number(Array.isArray(minRaw) ? minRaw[0] : minRaw) : NaN;
    const max = maxRaw ? Number(Array.isArray(maxRaw) ? maxRaw[0] : maxRaw) : NaN;
    const equals = eqRaw
      ? (Array.isArray(eqRaw) ? eqRaw : [eqRaw]).filter((x) => x !== "")
      : [];
    if (!isNaN(min) || !isNaN(max) || equals.length > 0) {
      attrFilters.push({
        key,
        min: isNaN(min) ? undefined : min,
        max: isNaN(max) ? undefined : max,
        equals: equals.length > 0 ? equals : undefined,
      });
    }
  }

  if (attrFilters.length > 0) {
    // Resolve attributeIds by key (or id).
    const keys = attrFilters.map((f) => f.key);
    const defs = await db.attributeDefinition.findMany({
      where: { OR: [{ key: { in: keys } }, { id: { in: keys } }] },
      select: { id: true, key: true },
    });
    const idByKey = new Map<string, string>();
    for (const d of defs) {
      if (d.key) idByKey.set(d.key, d.id);
      idByKey.set(d.id, d.id);
    }
    // Build the `some` clauses.
    const someClauses: any[] = [];
    for (const f of attrFilters) {
      const attrId = idByKey.get(f.key);
      if (!attrId) continue;
      const clause: any = { attributeId: attrId };
      if (f.min !== undefined || f.max !== undefined) {
        const nv: any = {};
        if (f.min !== undefined) nv.gte = f.min;
        if (f.max !== undefined) nv.lte = f.max;
        clause.numberValue = nv;
      }
      if (f.equals && f.equals.length > 0) {
        // Match either by optionId or by textValue (covers both SELECT and TEXT filters).
        clause.OR = f.equals.map((val) => [
          { optionId: val },
          { textValue: val },
        ]).flat();
      }
      someClauses.push(clause);
    }
    if (someClauses.length > 0) {
      // Each attribute filter is a separate `attributeValues: { some: ... }`
      // clause joined by AND at the top level — so all must match (each on
      // a different attributeId).
      where.AND = (where.AND as any[] | undefined) ?? [];
      for (const c of someClauses) {
        (where.AND as any[]).push({ attributeValues: { some: c } });
      }
    }
  }

  const rows = await db.listing.findMany({
    where,
    orderBy: [{ featured: "desc" }, { publishedAt: { sort: "desc", nulls: "last" } }],
    take: 60,
    include: {
      brand: { select: { name: true } },
      category: { select: { icon: true, name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
  });

  const listings: ListingCardData[] = rows.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    brandName: l.brand?.name ?? null,
    price: l.price,
    priceType: l.priceType,
    image: l.images[0]?.url ?? null,
    icon: l.category?.icon ?? null,
    year: l.year,
    city: l.city,
    workingHours: l.workingHours,
    featured: l.featured,
    viewCount: l.viewCount,
    favoriteCount: l.favoriteCount,
  }));

  /* Active filter chips */
  const activeFilters: { label: string; key: string }[] = [];
  if (sp.q) activeFilters.push({ label: `جستجو: ${sp.q}`, key: "q" });
  if (sp.category) {
    const c = catalogCategories.find((x) => x.slug === sp.category || x.id === sp.category);
    if (c) activeFilters.push({ label: c.name, key: "category" });
  }
  if (sp.brand) {
    const b = allBrands.find((x) => x.slug === sp.brand || x.id === sp.brand);
    if (b) activeFilters.push({ label: b.name, key: "brand" });
  }
  if (sp.featured === "true") activeFilters.push({ label: "ویژه", key: "featured" });
  if (txKey) {
    const chip = TRANSACTION_CHIPS.find((t) => t.key === txKey);
    if (chip) activeFilters.push({ label: chip.label, key: sp.transaction ? "transaction" : "type" });
  }
  if (sp.province) {
    const p = iran?.provinces.find((x) => x.id === sp.province);
    if (p) activeFilters.push({ label: p.name, key: "province" });
  }
  if (sp.city) {
    const c = cities.find((x) => x.id === sp.city);
    if (c) activeFilters.push({ label: c.name, key: "city" });
  }
  if (sp.industry) {
    const i = allIndustries.find((x) => x.id === sp.industry || x.key === sp.industry);
    if (i) activeFilters.push({ label: i.nameFa, key: "industry" });
  }

  const provinces = iran?.provinces ?? [];

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          {/* Breadcrumb + title */}
          <div className="mb-8">
            <nav className="mb-3 flex items-center gap-2 text-xs text-white/40">
              <Link href="/" className="hover:text-[#F58220]">
                خانه
              </Link>
              <ArrowRight className="h-3 w-3" />
              <span className="text-white/70">آگهی‌های ماشین‌آلات</span>
            </nav>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white lg:text-4xl">
                  بازار ماشین‌آلات سنگین
                </h1>
                <p className="mt-2 text-sm text-white/45">
                  {toFa(listings.length)} آگهی{listings.length !== 1 ? " فعال" : ""} یافت شد
                  <span className="mr-2 inline-flex items-center gap-1 text-emerald-400/80">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    همه دستگاه‌ها دارای کارشناسی هویکس
                  </span>
                </p>
              </div>
              <SavedSearchButton
                searchUrl={searchUrl}
                label={`جستجو: ${sp.q || sp.category || sp.brand || txKey || "همه"}`}
              />
            </div>
          </div>

          {/* Transaction-type quick chips (V1.1) */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-white/45">نوع معامله:</span>
            {TRANSACTION_CHIPS.map((chip) => {
              const active = txKey === chip.key;
              const params = new URLSearchParams();
              for (const [k, v] of Object.entries(sp)) {
                if (k !== "transaction" && k !== "type" && v !== undefined && v !== null && v !== "") {
                  if (Array.isArray(v)) {
                    for (const item of v) {
                      if (item) params.append(k, String(item));
                    }
                  } else {
                    params.set(k, String(v));
                  }
                }
              }
              if (!active) params.set("transaction", chip.key);
              const href = `/listings?${params.toString()}`;
              return (
                <a
                  key={chip.key}
                  href={href}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                      : "border-white/10 text-white/60 hover:border-[#F58220]/40 hover:text-white"
                  }`}
                >
                  {chip.label}
                </a>
              );
            })}
          </div>

          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Filter sidebar */}
            <aside className="lg:sticky lg:top-32 lg:h-fit">
              <form className="rounded-3xl border border-white/10 bg-[#111] p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Search className="h-4 w-4 text-[#F58220]" />
                  <h2 className="text-sm font-black text-white">فیلترها</h2>
                </div>

                {/* Free text */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    جستجوی آزاد
                  </label>
                  <input
                    name="q"
                    defaultValue={sp.q ?? ""}
                    placeholder="مدل، برند..."
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                  />
                </div>

                {/* Transaction type (hidden field — chips above control it,
                    but we also expose a select for completeness) */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    نوع معامله
                  </label>
                  <select
                    name="transaction"
                    defaultValue={sp.transaction ?? sp.type ?? ""}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220]"
                  >
                    <option value="">همه</option>
                    {TRANSACTION_CHIPS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category tree (CATALOG only) */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    دسته‌بندی (کاتالوگ)
                  </label>
                  <select
                    name="category"
                    defaultValue={sp.category ?? ""}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220]"
                  >
                    <option value="">همه</option>
                    {catalogRoots.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                    {catalogRoots.flatMap((root) =>
                      catalogChildrenOf(root.id).map((child) => (
                        <option key={child.id} value={child.slug}>
                          {"\u00A0\u00A0"}↳ {child.name}
                        </option>
                      )),
                    )}
                  </select>
                </div>

                {/* Brand */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">برند</label>
                  <select
                    name="brand"
                    defaultValue={sp.brand ?? ""}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220]"
                  >
                    <option value="">همه</option>
                    {allBrands.map((b) => (
                      <option key={b.id} value={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Province (cascading from Iran) */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    استان
                  </label>
                  <select
                    name="province"
                    defaultValue={sp.province ?? ""}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220]"
                  >
                    <option value="">همه</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City (cascading from selected province) */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    شهر
                  </label>
                  <select
                    name="city"
                    defaultValue={sp.city ?? ""}
                    disabled={cities.length === 0}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220] disabled:opacity-50"
                  >
                    <option value="">
                      {cities.length === 0 ? "ابتدا استان را انتخاب کنید" : "همه"}
                    </option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Application industry (optional V1.1 filter) */}
                {allIndustries.length > 0 && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                      صنعت کاربرد
                    </label>
                    <select
                      name="industry"
                      defaultValue={sp.industry ?? ""}
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220]"
                    >
                      <option value="">همه</option>
                      {allIndustries.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nameFa}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic attribute filters (per-category, filterable attributes only) */}
                {filterableAttrs.length > 0 && (
                  <div className="mb-5 rounded-2xl border border-[#F58220]/20 bg-[#F58220]/[0.03] p-4">
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-[#F58220]">
                      <Sliders className="h-3.5 w-3.5" />
                      فیلترهای اختصاصی دسته
                    </div>
                    <div className="space-y-4">
                      {filterableAttrs.map((a) => {
                        const k = a.key ?? a.id;
                        const label = a.labelFa ?? a.name;
                        const numericTypes = [
                          "INTEGER", "DECIMAL", "NUMBER", "CURRENCY", "UNIT",
                          "SIZE", "WEIGHT", "YEAR", "RANGE",
                        ];
                        const isNumeric = numericTypes.includes(a.type);
                        const isSelect =
                          a.type === "SELECT" || a.type === "MULTI_SELECT";
                        const isBool = a.type === "BOOLEAN";

                        if (isNumeric) {
                          const min = getAttrFirst(`${k}_min`);
                          const max = getAttrFirst(`${k}_max`);
                          return (
                            <div key={a.id}>
                              <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                                {label}
                                {a.unit ? ` (${a.unit})` : ""}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  name={`attr.${k}_min`}
                                  defaultValue={min}
                                  placeholder="از"
                                  dir="ltr"
                                  className="h-9 w-full rounded-lg border border-white/10 bg-black/50 px-2 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                                />
                                <input
                                  type="number"
                                  step="any"
                                  name={`attr.${k}_max`}
                                  defaultValue={max}
                                  placeholder="تا"
                                  dir="ltr"
                                  className="h-9 w-full rounded-lg border border-white/10 bg-black/50 px-2 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                                />
                              </div>
                            </div>
                          );
                        }

                        if (isSelect) {
                          const selected = getAttrParam(k);
                          return (
                            <div key={a.id}>
                              <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                                {label}
                              </label>
                              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                                {a.options.length === 0 ? (
                                  <span className="text-[10px] text-white/40">
                                    گزینه‌ای ثبت نشده
                                  </span>
                                ) : (
                                  a.options.map((o) => {
                                    const checked = selected.includes(o.id);
                                    return (
                                      <label
                                        key={o.id}
                                        className="flex cursor-pointer items-center gap-2 text-[11px] text-white/70"
                                      >
                                        <input
                                          type="checkbox"
                                          name={`attr.${k}`}
                                          value={o.id}
                                          defaultChecked={checked}
                                          className="h-3.5 w-3.5 accent-[#F58220]"
                                        />
                                        <span>{o.label ?? o.value}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        }

                        if (isBool) {
                          const checked = getAttrFirst(k) === "true";
                          return (
                            <div key={a.id}>
                              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/70">
                                <input
                                  type="checkbox"
                                  name={`attr.${k}`}
                                  value="true"
                                  defaultChecked={checked}
                                  className="h-3.5 w-3.5 accent-[#F58220]"
                                />
                                {label}
                              </label>
                            </div>
                          );
                        }

                        // TEXT / URL / PHONE / etc. → single text input (substring match)
                        const val = getAttrFirst(k);
                        return (
                          <div key={a.id}>
                            <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                              {label}
                            </label>
                            <input
                              type="text"
                              name={`attr.${k}`}
                              defaultValue={val}
                              placeholder="جستجو…"
                              className="h-9 w-full rounded-lg border border-white/10 bg-black/50 px-2 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Year range */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    سال ساخت
                  </label>
                  <div className="flex gap-2">
                    <input
                      name="yearFrom"
                      defaultValue={sp.yearFrom ?? ""}
                      placeholder="از"
                      dir="ltr"
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                    />
                    <input
                      name="yearTo"
                      defaultValue={sp.yearTo ?? ""}
                      placeholder="تا"
                      dir="ltr"
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                    />
                  </div>
                </div>

                {/* Price range */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] font-bold text-white/60">
                    قیمت (تومان)
                  </label>
                  <div className="flex gap-2">
                    <input
                      name="minPrice"
                      defaultValue={sp.minPrice ?? ""}
                      placeholder="از"
                      dir="ltr"
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                    />
                    <input
                      name="maxPrice"
                      defaultValue={sp.maxPrice ?? ""}
                      placeholder="تا"
                      dir="ltr"
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-[#F58220] placeholder:text-white/25"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="mb-6 flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      name="featured"
                      value="true"
                      defaultChecked={sp.featured === "true"}
                      className="h-4 w-4 accent-[#F58220]"
                    />
                    فقط آگهی‌های ویژه
                  </label>
                </div>

                <button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#F58220] text-sm font-bold text-white transition hover:bg-[#ff8c38]"
                >
                  اعمال فیلترها
                </button>
                <Link
                  href="/listings"
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-white/10 text-xs font-medium text-white/60 transition hover:text-white"
                >
                  پاک کردن فیلترها
                </Link>
              </form>
            </aside>

            {/* Results */}
            <div>
              {/* Active filter chips */}
              {activeFilters.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  {activeFilters.map((f) => (
                    <a
                      key={f.key}
                      href={`/listings?${buildChipUrl(sp, f.key)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-3 py-1.5 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/20"
                    >
                      {f.label}
                      <X className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}

              {listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
                  <span className="mb-4 text-6xl">🔍</span>
                  <h3 className="text-xl font-bold text-white">آگهی‌ای یافت نشد</h3>
                  <p className="mt-2 max-w-sm text-sm text-white/45">
                    با فیلترهای انتخاب‌شده آگهی‌ای پیدا نشد. لطفاً فیلترها را تغییر دهید یا همهٔ
                    آگهی‌ها را مشاهده کنید.
                  </p>
                  <Link
                    href="/listings"
                    className="mt-6 rounded-xl bg-[#F58220] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
                  >
                    مشاهده همهٔ آگهی‌ها
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((l) => (
                    <ListingCard key={l.id} l={l} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* Build a URL with one filter removed (for chip removal links).
   Handles both string and string[] values (the latter from multi-select
   attr.* checkbox params). */
function buildChipUrl(sp: SearchParams, removeKey: string): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k !== removeKey && v !== undefined && v !== null && v !== "") {
      // Removing `transaction` should also clear legacy `type`.
      if (removeKey === "transaction" && k === "type") continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item) params.append(k, String(item));
        }
      } else {
        params.set(k, String(v));
      }
    }
  }
  const qs = params.toString();
  return qs ? `/listings?${qs}` : "/listings";
}
