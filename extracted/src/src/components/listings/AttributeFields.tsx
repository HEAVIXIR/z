"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Settings2, Sliders } from "lucide-react";

/* ============================================================
   AttributeFields — dynamic attribute form engine (V1).

   Renders the right input per attribute.type for the attributes
   attached to a category. Values are keyed by `attribute.key`
   (fallback to `attribute.id`) so the wizard's submit step can
   map the form state back to the API array shape.

   Type → control map (HBR Attribute Engine §60-§61):
     TEXT          → text input
     LONG_TEXT     → textarea
     INTEGER       → number input (step=1)
     DECIMAL       → number input (step=0.01)
     NUMBER        → number input (legacy alias for DECIMAL)
     BOOLEAN       → toggle
     SELECT        → dropdown (optionId)
     MULTI_SELECT  → chip checklist (array of optionIds)
     RANGE         → two number inputs (min/max joined "|")
     YEAR          → number input (min 1960, max current year)
     DATE          → date input
     DATETIME      → datetime-local input
     CURRENCY      → number input + currency suffix
     UNIT          → number input + unit suffix
     URL           → url input
     PHONE         → tel input
     COLOR         → color input + text
     SIZE/WEIGHT   → number input + unit suffix
     REFERENCE     → text input (IDs/refs)
     LOCATION      → text input (location string for V1)
     FILE          → URL input (V1: just URL)
     IMAGE         → URL input (V1: just URL)

   Progressive disclosure (HBR §69): attributes are rendered in
   displayOrder (then sortOrder, then name) inside a single visual
   group for V1. Future revisions may split them into themed groups
   ("مشخصات پایه", "ابعاد و عملکرد", "موتور", "وضعیت").

   Validation: required attributes without a value surface a red
   border + error message via the `errors` prop.

   Module-level cache: the attribute definitions for a categoryId
   are cached for the lifetime of the page so repeated re-mounts
   (e.g. stepper navigation) don't refetch.
   ============================================================ */

export type AttributeValue = Record<string, string | number | boolean | string[] | null>;

export type AttributeOption = {
  id: string;
  value: string;
  label: string | null;
  sortOrder: number;
};

export type AttributeDef = {
  id: string;
  key?: string | null;
  name: string;
  nameEn?: string | null;
  labelFa?: string | null;
  labelEn?: string | null;
  description?: string | null;
  type: string;
  unit?: string | null;
  required?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  visibleOnCard?: boolean;
  visibleOnDetail?: boolean;
  seoRelevant?: boolean;
  aiRelevant?: boolean;
  sortOrder?: number;
  displayOrder?: number;
  options?: AttributeOption[];
};

// Per-categoryId in-memory cache so the wizard's stepper can re-mount
// AttributeFields without refetching on every step change.
const ATTR_CACHE = new Map<string, AttributeDef[]>();

const inputBase =
  "h-11 w-full rounded-xl border bg-black/50 px-3 text-sm text-white outline-none transition placeholder:text-white/25 ";
const inputOk =
  "border-white/10 focus:border-[#F58220] focus:shadow-[0_0_0_3px_rgba(245,130,32,.12)]";
const inputErr =
  "border-red-500/60 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.16)]";
const labelCls = "mb-1.5 block text-xs font-bold text-white/60";

export function attrKey(a: AttributeDef): string {
  return a.key ?? a.id;
}

export function attrLabel(a: AttributeDef): string {
  return a.labelFa ?? a.name ?? a.labelEn ?? a.nameEn ?? a.key ?? a.id;
}

export function attrHelp(a: AttributeDef): string | null {
  if (a.description && a.description.trim()) return a.description.trim();
  if (a.labelEn && a.labelEn.trim()) return a.labelEn.trim();
  if (a.nameEn && a.nameEn.trim()) return a.nameEn.trim();
  return null;
}

/** Module-level cache accessor (also used by the wizard to convert
    form values to the API array shape on submit). */
export function getCachedAttributes(categoryId: string): AttributeDef[] | undefined {
  return ATTR_CACHE.get(categoryId);
}

export default function AttributeFields({
  categoryId,
  values,
  onChange,
  errors,
  onAttributesLoaded,
}: {
  categoryId: string | null;
  values: AttributeValue;
  onChange: (next: AttributeValue) => void;
  errors?: Record<string, string>;
  onAttributesLoaded?: (attrs: AttributeDef[]) => void;
}) {
  const [attributes, setAttributes] = useState<AttributeDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firedLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }
    // Sync from cache first for instant render.
    const cached = ATTR_CACHE.get(categoryId);
    if (cached) {
      setAttributes(cached);
      if (firedLoadedRef.current !== categoryId) {
        firedLoadedRef.current = categoryId;
        onAttributesLoaded?.(cached);
      }
    }

    let alive = true;
    setLoading(!cached);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/categories/${encodeURIComponent(categoryId)}/attributes`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { attributes: AttributeDef[] };
        if (!alive) return;
        const list = data.attributes ?? [];
        ATTR_CACHE.set(categoryId, list);
        setAttributes(list);
        if (firedLoadedRef.current !== categoryId) {
          firedLoadedRef.current = categoryId;
          onAttributesLoaded?.(list);
        }
      } catch (err: any) {
        if (alive) setError(err?.message ?? "خطا در بارگذاری ویژگی‌ها");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [categoryId]);

  if (!categoryId) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/45">
        برای مشاهدهٔ ویژگی‌ها، ابتدا دسته‌بندی را انتخاب کنید.
      </div>
    );
  }

  if (loading && attributes.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />
        در حال بارگذاری ویژگی‌های دسته…
      </div>
    );
  }

  if (error && attributes.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-xs font-bold text-red-400">
        ⚠ {error}
      </div>
    );
  }

  if (attributes.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/45">
        ویژگی اختصاصی برای این دسته ثبت نشده است.
      </div>
    );
  }

  // Sort by displayOrder (fallback sortOrder), then name.
  const sorted = [...attributes].sort(
    (a, b) =>
      (a.displayOrder ?? a.sortOrder ?? 0) - (b.displayOrder ?? b.sortOrder ?? 0) ||
      String(a.name).localeCompare(String(b.name), "fa"),
  );

  /* Helpers — value setters keyed by attribute.key|id */
  const set = (a: AttributeDef, v: string | number | boolean | string[] | null) =>
    onChange({ ...values, [attrKey(a)]: v });

  const toggleMulti = (a: AttributeDef, optionId: string) => {
    const current = Array.isArray(values[attrKey(a)])
      ? (values[attrKey(a)] as string[])
      : [];
    const next = current.includes(optionId)
      ? current.filter((s) => s !== optionId)
      : [...current, optionId];
    set(a, next);
  };

  return (
    <div className="space-y-6">
      {/* Header strip (only when there are filterable attrs) */}
      {sorted.some((a) => a.filterable) && (
        <div className="flex items-center gap-2 rounded-xl border border-[#F58220]/20 bg-[#F58220]/[0.04] px-3 py-2 text-[11px] text-white/55">
          <Sliders className="h-3.5 w-3.5 text-[#F58220]" />
          ویژگی‌های دارای نشان <span className="font-bold text-[#F58220]">«فیلترپذیر»</span> در
          صفحهٔ آگهی‌ها قابل فیلتر کردن خواهند بود.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map((attr) => {
          const k = attrKey(attr);
          const v = values[k] ?? null;
          const err = errors?.[k];
          const help = attrHelp(attr);
          const cls = `${inputBase} ${err ? inputErr : inputOk}`;

          const label = (
            <label className={labelCls} htmlFor={`attr-${k}`}>
              {attrLabel(attr)}
              {attr.required && <span className="text-[#F58220]"> *</span>}
              {attr.filterable && (
                <span className="mr-2 inline-flex items-center gap-0.5 rounded bg-[#F58220]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#F58220]">
                  <Settings2 className="h-2.5 w-2.5" />
                  فیلترپذیر
                </span>
              )}
            </label>
          );

          let control: React.ReactNode = null;
          const unitSuffix = attr.unit ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">
              {attr.unit}
            </span>
          ) : null;

          switch (attr.type) {
            case "TEXT":
            case "REFERENCE":
            case "LOCATION":
            case "FILE":
            case "IMAGE":
              control = (
                <div className="relative">
                  <input
                    id={`attr-${k}`}
                    type={attr.type === "FILE" || attr.type === "IMAGE" ? "url" : "text"}
                    dir={attr.type === "FILE" || attr.type === "IMAGE" || attr.type === "REFERENCE" ? "ltr" : undefined}
                    value={(v as string) ?? ""}
                    onChange={(e) => set(attr, e.target.value)}
                    placeholder={attr.type === "FILE" ? "https://…" : attr.type === "IMAGE" ? "https://…/photo.jpg" : ""}
                    className={cls}
                  />
                </div>
              );
              break;

            case "URL":
              control = (
                <input
                  id={`attr-${k}`}
                  type="url"
                  dir="ltr"
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value)}
                  placeholder="https://"
                  className={cls}
                />
              );
              break;

            case "PHONE":
              control = (
                <input
                  id={`attr-${k}`}
                  type="tel"
                  dir="ltr"
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value)}
                  placeholder="0912…"
                  className={cls}
                />
              );
              break;

            case "LONG_TEXT":
              control = (
                <textarea
                  id={`attr-${k}`}
                  rows={3}
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value)}
                  className={`w-full rounded-xl border bg-black/50 p-3 text-sm text-white outline-none transition placeholder:text-white/25 ${
                    err ? inputErr : inputOk
                  }`}
                />
              );
              break;

            case "INTEGER":
            case "DECIMAL":
            case "NUMBER":
            case "CURRENCY":
            case "UNIT":
            case "SIZE":
            case "WEIGHT": {
              const step =
                attr.type === "INTEGER" ? 1 : attr.type === "DECIMAL" || attr.type === "NUMBER" ? 0.01 : "any";
              control = (
                <div className="relative">
                  <input
                    id={`attr-${k}`}
                    type="number"
                    step={step}
                    dir="ltr"
                    value={v === null || v === undefined ? "" : String(v)}
                    onChange={(e) =>
                      set(attr, e.target.value === "" ? null : Number(e.target.value))
                    }
                    className={`${cls} ${attr.unit ? "pl-14" : ""}`}
                  />
                  {unitSuffix}
                  {attr.type === "CURRENCY" && !attr.unit && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40">
                      تومان
                    </span>
                  )}
                </div>
              );
              break;
            }

            case "YEAR": {
              const curYear = new Date().getFullYear();
              control = (
                <input
                  id={`attr-${k}`}
                  type="number"
                  min={1960}
                  max={curYear}
                  step={1}
                  dir="ltr"
                  value={v === null || v === undefined ? "" : String(v)}
                  onChange={(e) =>
                    set(attr, e.target.value === "" ? null : Number(e.target.value))
                  }
                  placeholder={`${curYear}`}
                  className={cls}
                />
              );
              break;
            }

            case "BOOLEAN":
              control = (
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 transition hover:border-[#F58220]/40">
                  <input
                    id={`attr-${k}`}
                    type="checkbox"
                    checked={v === true}
                    onChange={(e) => set(attr, e.target.checked)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  <span className="text-xs text-white/70">
                    {v === true ? "بله" : "خیر"}
                  </span>
                </label>
              );
              break;

            case "SELECT": {
              const opts = attr.options ?? [];
              control = (
                <select
                  id={`attr-${k}`}
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value || null)}
                  className={cls}
                >
                  <option value="">انتخاب کنید{attr.required ? " *" : ""}</option>
                  {opts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label ?? o.value}
                    </option>
                  ))}
                </select>
              );
              break;
            }

            case "MULTI_SELECT": {
              const opts = attr.options ?? [];
              const selected = Array.isArray(v) ? (v as string[]) : [];
              control = (
                <div className="flex flex-wrap gap-2">
                  {opts.length === 0 ? (
                    <span className="text-xs text-white/40">گزینه‌ای ثبت نشده</span>
                  ) : (
                    opts.map((o) => {
                      const sel = selected.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggleMulti(attr, o.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                            sel
                              ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]"
                              : "border-white/10 text-white/60 hover:text-white"
                          }`}
                        >
                          {o.label ?? o.value}
                        </button>
                      );
                    })
                  )}
                </div>
              );
              break;
            }

            case "RANGE": {
              const str = (v as string) ?? "";
              const [min, max] = str.split("|");
              control = (
                <div className="flex items-center gap-2">
                  <input
                    id={`attr-${k}`}
                    type="number"
                    step="any"
                    dir="ltr"
                    placeholder="از"
                    value={min ?? ""}
                    onChange={(e) =>
                      set(attr, [e.target.value, max ?? ""].join("|"))
                    }
                    className={cls}
                  />
                  <span className="text-white/30">—</span>
                  <input
                    type="number"
                    step="any"
                    dir="ltr"
                    placeholder="تا"
                    value={max ?? ""}
                    onChange={(e) =>
                      set(attr, [min ?? "", e.target.value].join("|"))
                    }
                    className={cls}
                  />
                </div>
              );
              break;
            }

            case "DATE":
              control = (
                <input
                  id={`attr-${k}`}
                  type="date"
                  dir="ltr"
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value || null)}
                  className={cls}
                />
              );
              break;

            case "DATETIME":
              control = (
                <input
                  id={`attr-${k}`}
                  type="datetime-local"
                  dir="ltr"
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value || null)}
                  className={cls}
                />
              );
              break;

            case "COLOR":
              control = (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(v as string) || "#000000"}
                    onChange={(e) => set(attr, e.target.value)}
                    className="h-11 w-12 cursor-pointer rounded-xl border border-white/10 bg-black/50 p-1"
                    aria-label={`رنگ ${attrLabel(attr)}`}
                  />
                  <input
                    id={`attr-${k}`}
                    type="text"
                    dir="ltr"
                    value={(v as string) ?? ""}
                    onChange={(e) => set(attr, e.target.value)}
                    placeholder="#RRGGBB"
                    className={cls}
                  />
                </div>
              );
              break;

            default:
              control = (
                <input
                  id={`attr-${k}`}
                  type="text"
                  value={(v as string) ?? ""}
                  onChange={(e) => set(attr, e.target.value)}
                  className={cls}
                />
              );
          }

          return (
            <div key={attr.id}>
              {label}
              {control}
              {help && (
                <p className="mt-1 text-[10px] text-white/35">{help}</p>
              )}
              {err && (
                <p className="mt-1 text-[10px] font-bold text-red-400">{err}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   buildAttributePayload — converts the form values record into
   the API array shape expected by PUT /api/listings/[id]/attributes.

   Exported so the wizard's submit handler can call it without
   duplicating the type→field mapping logic.
   ============================================================ */
type PayloadEntry = {
  attributeId: string;
  textValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  dateValue?: string | null;
  optionId?: string | null;
  unit?: string | null;
  sourceType: string;
};

export function buildAttributePayload(
  attributes: AttributeDef[],
  values: AttributeValue,
): PayloadEntry[] {
  const out: PayloadEntry[] = [];
  for (const a of attributes) {
    const k = attrKey(a);
    const raw = values[k];
    if (raw === undefined || raw === null || raw === "") continue;
    const entry: PayloadEntry = {
      attributeId: a.id,
      unit: a.unit ?? null,
      sourceType: "SELLER_INPUT",
    };
    switch (a.type) {
      case "BOOLEAN":
        entry.booleanValue = raw === true || raw === "true";
        break;
      case "SELECT":
        entry.optionId = String(raw);
        break;
      case "MULTI_SELECT": {
        const arr = Array.isArray(raw) ? raw : String(raw).split("|");
        entry.textValue = arr.filter(Boolean).join(",");
        break;
      }
      case "RANGE": {
        // "min|max" → textValue
        entry.textValue = String(raw);
        break;
      }
      case "DATE":
      case "DATETIME":
        entry.dateValue = String(raw);
        break;
      case "INTEGER":
      case "DECIMAL":
      case "NUMBER":
      case "CURRENCY":
      case "UNIT":
      case "SIZE":
      case "WEIGHT":
      case "YEAR":
        entry.numberValue = typeof raw === "number" ? raw : Number(raw) || null;
        break;
      default:
        entry.textValue = String(raw);
    }
    out.push(entry);
  }
  return out;
}

/** Validates required attributes — returns an errors record (empty
    when all required fields have a value). */
export function validateAttributeFields(
  attributes: AttributeDef[],
  values: AttributeValue,
): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const a of attributes) {
    if (!a.required) continue;
    const k = attrKey(a);
    const v = values[k];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (empty) errs[k] = "این فیلد الزامی است";
  }
  return errs;
}
