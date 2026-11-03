import { toFa } from "@/lib/format";
import { BadgeCheck, Sparkles, FileText, Database, ShieldCheck } from "lucide-react";

/* ============================================================
   AttributeValueDisplay — renders a single ListingAttributeValue
   with proper formatting + provenance badge.

   Used by:
     - the listing detail page (مشخصات فنی section)
     - the compare page (TBD)

   The `value` prop shape (matches what GET /api/listings/[id]/attributes
   returns, plus the server-side detail-page query):
   {
     id, listingId, attributeId,
     textValue, numberValue, booleanValue, dateValue, optionId,
     unit, sourceType, confidence, sourceReference,
     verifiedAt, verifiedBy,
     attribute: { id, key, name, nameEn, labelFa, labelEn, type, unit, visibleOnDetail, ... },
     option: { id, value, label } | null
   }
   ============================================================ */

export type AttributeValueDisplayValue = {
  id?: string;
  textValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  dateValue?: string | Date | null;
  optionId?: string | null;
  unit?: string | null;
  sourceType?: string | null;
  confidence?: number | null;
  sourceReference?: string | null;
  verifiedAt?: string | Date | null;
  verifiedBy?: string | null;
  attribute: {
    id: string;
    key?: string | null;
    name: string;
    nameEn?: string | null;
    labelFa?: string | null;
    labelEn?: string | null;
    type: string;
    unit?: string | null;
    visibleOnDetail?: boolean;
    visibleOnCard?: boolean;
    options?: Array<{ id: string; value: string; label: string | null }> | null;
  };
  option?: {
    id: string;
    value: string;
    label: string | null;
  } | null;
};

/* ── value formatter ── */
export function formatAttributeValue(v: AttributeValueDisplayValue): string {
  const a = v.attribute;
  const unit = v.unit ?? a.unit ?? null;

  // SELECT — prefer option label, fall back to raw optionId
  if (a.type === "SELECT") {
    if (v.option?.label) return v.option.label;
    if (v.option?.value) return v.option.value;
    if (v.optionId) {
      // Resolve from attribute.options if joined
      const opt = a.options?.find((o) => o.id === v.optionId);
      if (opt) return opt.label ?? opt.value;
      return v.optionId;
    }
    if (v.textValue) return v.textValue;
    return "—";
  }

  // MULTI_SELECT — textValue is comma-joined option IDs (V1) or labels
  if (a.type === "MULTI_SELECT") {
    if (!v.textValue) return "—";
    const ids = v.textValue.split(",").map((s) => s.trim()).filter(Boolean);
    const labels = ids.map((id) => {
      const opt = a.options?.find((o) => o.id === id || o.value === id);
      return opt?.label ?? opt?.value ?? id;
    });
    return labels.join("، ") || "—";
  }

  // BOOLEAN
  if (a.type === "BOOLEAN") {
    if (v.booleanValue === true) return "بله";
    if (v.booleanValue === false) return "خیر";
    return "—";
  }

  // RANGE — textValue is "min|max"
  if (a.type === "RANGE") {
    if (!v.textValue) return "—";
    const [min, max] = v.textValue.split("|");
    const fmt = (x: string | undefined) => (x && x !== "" ? toFa(x) : "—");
    const base = `${fmt(min)} تا ${fmt(max)}`;
    return unit ? `${base} ${unit}` : base;
  }

  // Numeric types
  const numericTypes = [
    "INTEGER", "DECIMAL", "NUMBER", "CURRENCY", "UNIT", "SIZE", "WEIGHT", "YEAR",
  ];
  if (numericTypes.includes(a.type)) {
    if (v.numberValue === null || v.numberValue === undefined) {
      // fall back to textValue if it's numeric
      if (v.textValue && !isNaN(Number(v.textValue))) {
        const n = Number(v.textValue);
        const base = a.type === "YEAR" ? toFa(n) : toFa(n);
        return unit ? `${base} ${unit}` : base;
      }
      return "—";
    }
    const n = v.numberValue;
    const base = a.type === "YEAR" ? toFa(n) : toFa(n);
    if (a.type === "CURRENCY") {
      return `${base} ${unit ?? "تومان"}`;
    }
    return unit ? `${base} ${unit}` : base;
  }

  // DATE / DATETIME
  if (a.type === "DATE" || a.type === "DATETIME") {
    const d = v.dateValue ? new Date(v.dateValue) : null;
    if (!d || isNaN(d.getTime())) {
      if (v.textValue) return v.textValue;
      return "—";
    }
    try {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...(a.type === "DATETIME" ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(d);
    } catch {
      return d.toISOString().split("T")[0];
    }
  }

  // COLOR — show swatch via the value text
  if (a.type === "COLOR") {
    return v.textValue ?? "—";
  }

  // TEXT / LONG_TEXT / URL / PHONE / REFERENCE / LOCATION / FILE / IMAGE / default
  if (v.textValue && v.textValue.trim()) return v.textValue;
  return "—";
}

/* ── provenance badge ── */
function ProvenanceBadge({ v }: { v: AttributeValueDisplayValue }) {
  if (!v.sourceType || v.sourceType === "SELLER_INPUT") return null;

  let icon: React.ReactNode = null;
  let label = "";
  let cls = "";

  switch (v.sourceType) {
    case "ADMIN_VERIFIED":
      icon = <ShieldCheck className="h-3 w-3" />;
      label = "تأیید کارشناس";
      cls = "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300";
      break;
    case "AI_EXTRACTION":
      icon = <Sparkles className="h-3 w-3" />;
      label =
        v.confidence != null
          ? `استخراج AI ${toFa(Math.round(v.confidence * 100))}٪`
          : "استخراج AI";
      cls = "border-violet-400/30 bg-violet-400/[0.08] text-violet-300";
      break;
    case "AI_INFERENCE":
      icon = <Sparkles className="h-3 w-3" />;
      label =
        v.confidence != null
          ? `استنباط AI ${toFa(Math.round(v.confidence * 100))}٪`
          : "استنباط AI";
      cls = "border-violet-400/30 bg-violet-400/[0.08] text-violet-300";
      break;
    case "MANUFACTURER_DOCUMENT":
      icon = <FileText className="h-3 w-3" />;
      label = "کاتالوگ سازنده";
      cls = "border-sky-400/30 bg-sky-400/[0.08] text-sky-300";
      break;
    case "IMPORTED":
      icon = <Database className="h-3 w-3" />;
      label = "دادهٔ وارداتی";
      cls = "border-amber-400/30 bg-amber-400/[0.08] text-amber-300";
      break;
    default:
      return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${cls}`}
    >
      {icon}
      {label}
    </span>
  );
}

export default function AttributeValueDisplay({
  v,
  showProvenance = true,
  className = "",
}: {
  v: AttributeValueDisplayValue;
  showProvenance?: boolean;
  className?: string;
}) {
  const a = v.attribute;
  const label = a.labelFa ?? a.name ?? a.labelEn ?? a.nameEn ?? a.key ?? a.id;
  const value = formatAttributeValue(v);
  const isLink = a.type === "URL" || a.type === "FILE" || a.type === "IMAGE";
  const href = isLink && v.textValue ? v.textValue : null;
  const isColor = a.type === "COLOR" && v.textValue;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isColor ? (
          <span
            className="h-5 w-5 shrink-0 rounded-md border border-white/20"
            style={{ backgroundColor: v.textValue ?? "#000" }}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-white/40">{label}</div>
          <div className="truncate text-sm font-bold text-white">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F58220] underline-offset-2 hover:underline"
              >
                {value}
              </a>
            ) : (
              value
            )}
          </div>
        </div>
      </div>
      {showProvenance && v.sourceType && v.sourceType !== "SELLER_INPUT" && (
        <ProvenanceBadge v={v} />
      )}
    </div>
  );
}

/* ── compact label/value row variant (for tight tables) ── */
export function AttributeValueRow({ v }: { v: AttributeValueDisplayValue }) {
  const a = v.attribute;
  const label = a.labelFa ?? a.name ?? a.labelEn ?? a.nameEn ?? a.key ?? a.id;
  const value = formatAttributeValue(v);
  const isLink = a.type === "URL" || a.type === "FILE" || a.type === "IMAGE";
  const href = isLink && v.textValue ? v.textValue : null;
  const isColor = a.type === "COLOR" && v.textValue;

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="py-3 pl-4 align-top text-xs text-white/45">{label}</td>
      <td className="py-3 pl-4 align-top">
        <div className="flex items-center gap-2">
          {isColor ? (
            <span
              className="h-4 w-4 shrink-0 rounded border border-white/20"
              style={{ backgroundColor: v.textValue ?? "#000" }}
              aria-hidden
            />
          ) : null}
          <span className="text-sm font-bold text-white">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F58220] underline-offset-2 hover:underline"
              >
                {value}
              </a>
            ) : (
              value
            )}
          </span>
          {v.sourceType && v.sourceType !== "SELLER_INPUT" && (
            <ProvenanceBadge v={v} />
          )}
        </div>
      </td>
    </tr>
  );
}

/* Re-export for callers that want to show a generic "verified" pill. */
export function VerifiedPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2 py-0.5 text-[9px] font-bold text-emerald-300">
      <BadgeCheck className="h-3 w-3" />
      {children}
    </span>
  );
}
