"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";

/* ============================================================
   DynamicAttributeForm — Phase 1.6
   Per HEAVIX Operational Execution Plan V1.0 §1.6.

   Renders form fields dynamically based on the selected category.
   Fetches attributes from /api/taxonomy/category-attributes?categoryId=X
   and renders the appropriate input type for each attribute.

   Usage:
     <DynamicAttributeForm
       categoryId={selectedCategoryId}
       values={currentValues}
       onChange={handleValuesChange}
     />
   ============================================================ */

export type AttributeValue = {
  attributeId: string;
  textValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  dateValue?: string | null;
  optionId?: string | null;
  unit?: string | null;
};

type CategoryAttribute = {
  id: string;
  key: string | null;
  name: string;
  labelFa: string;
  labelEn: string | null;
  type: string;
  unit: string | null;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  sortable: boolean;
  displayOrder: number;
  visibleOnCard: boolean;
  visibleOnDetail: boolean;
  seoRelevant: boolean;
  aiRelevant: boolean;
  options: { id: string; label: string; value: string }[];
  inherited: boolean;
  categoryAttributeId: string;
};

export default function DynamicAttributeForm({
  categoryId,
  values,
  onChange,
  errors,
}: {
  categoryId: string;
  values: Record<string, AttributeValue>;
  onChange: (values: Record<string, AttributeValue>) => void;
  errors?: Record<string, string>;
}) {
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAttributes = useCallback(async () => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/taxonomy/category-attributes?categoryId=${categoryId}`,
      );
      if (!res.ok) throw new Error("Failed to load attributes");
      const data = await res.json();
      setAttributes(data.attributes || []);
    } catch (e: any) {
      setLoadError(e?.message || "خطا در بارگذاری ویژگی‌ها");
      setAttributes([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  const updateValue = (attrId: string, field: keyof AttributeValue, val: any) => {
    const current = values[attrId] || { attributeId: attrId };
    onChange({
      ...values,
      [attrId]: { ...current, [field]: val },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#F58220]" />
        <span className="mr-2 text-sm text-zinc-500">بارگذاری ویژگی‌ها...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        {loadError}
      </div>
    );
  }

  if (attributes.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-400">
        این دسته‌بندی ویژگی مشخص ندارد
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {attributes.map((attr) => {
        const val = values[attr.id] || {};
        const error = errors?.[attr.id];

        return (
          <div key={attr.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`attr-${attr.id}`} className="text-sm font-bold">
                {attr.labelFa}
                {attr.required && <span className="mr-1 text-red-500">*</span>}
                {attr.inherited && (
                  <span className="mr-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                    ارث‌برده
                  </span>
                )}
              </Label>
              {attr.unit && (
                <span className="text-xs text-zinc-400">واحد: {attr.unit}</span>
              )}
            </div>

            {renderField(attr, val, updateValue)}

            {error && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderField(
  attr: CategoryAttribute,
  val: AttributeValue,
  update: (attrId: string, field: keyof AttributeValue, value: any) => void,
) {
  const inputCls =
    "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#F58220]";

  switch (attr.type) {
    case "TEXT":
    case "URL":
    case "PHONE":
      return (
        <Input
          id={`attr-${attr.id}`}
          value={val.textValue || ""}
          onChange={(e) => update(attr.id, "textValue", e.target.value)}
          placeholder={attr.labelEn || attr.labelFa}
          className={inputCls}
          dir="auto"
        />
      );

    case "LONG_TEXT":
      return (
        <Textarea
          id={`attr-${attr.id}`}
          value={val.textValue || ""}
          onChange={(e) => update(attr.id, "textValue", e.target.value)}
          placeholder={attr.labelFa}
          rows={3}
          className={`${inputCls} h-auto resize-none py-2`}
          dir="auto"
        />
      );

    case "INTEGER":
    case "DECIMAL":
    case "YEAR":
      return (
        <Input
          id={`attr-${attr.id}`}
          type="number"
          value={val.numberValue ?? ""}
          onChange={(e) =>
            update(attr.id, "numberValue", e.target.value ? Number(e.target.value) : null)
          }
          placeholder={attr.labelFa}
          className={inputCls}
          dir="ltr"
        />
      );

    case "CURRENCY":
      return (
        <Input
          id={`attr-${attr.id}`}
          type="number"
          value={val.numberValue ?? ""}
          onChange={(e) =>
            update(attr.id, "numberValue", e.target.value ? Number(e.target.value) : null)
          }
          placeholder={`${attr.labelFa} (تومان)`}
          className={inputCls}
          dir="ltr"
        />
      );

    case "BOOLEAN":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Switch
            id={`attr-${attr.id}`}
            checked={val.booleanValue || false}
            onCheckedChange={(checked) => update(attr.id, "booleanValue", checked)}
          />
          <span className="text-sm text-zinc-500">
            {val.booleanValue ? "بله" : "خیر"}
          </span>
        </div>
      );

    case "SELECT":
    case "MULTI_SELECT":
      return (
        <Select
          value={val.optionId || ""}
          onValueChange={(v) => update(attr.id, "optionId", v)}
        >
          <SelectTrigger className={inputCls}>
            <SelectValue placeholder={attr.labelFa} />
          </SelectTrigger>
          <SelectContent>
            {attr.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "DATE":
    case "DATETIME":
      return (
        <Input
          id={`attr-${attr.id}`}
          type="date"
          value={val.dateValue ? val.dateValue.split("T")[0] : ""}
          onChange={(e) =>
            update(attr.id, "dateValue", e.target.value ? new Date(e.target.value).toISOString() : null)
          }
          className={inputCls}
          dir="ltr"
        />
      );

    default:
      return (
        <Input
          id={`attr-${attr.id}`}
          value={val.textValue || ""}
          onChange={(e) => update(attr.id, "textValue", e.target.value)}
          placeholder={`${attr.labelFa} (${attr.type})`}
          className={inputCls}
          dir="auto"
        />
      );
  }
}

/* ── Validation helper ──────────────────────────────────── */

export function validateAttributeValues(
  attributes: CategoryAttribute[],
  values: Record<string, AttributeValue>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const attr of attributes) {
    if (!attr.required) continue;
    const val = values[attr.id];
    const isEmpty =
      !val ||
      (!val.textValue &&
        val.numberValue == null &&
        !val.booleanValue &&
        !val.dateValue &&
        !val.optionId);
    if (isEmpty) {
      errors[attr.id] = `${attr.labelFa} اجباری است`;
    }
  }
  return errors;
}
