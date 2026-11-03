"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toFa } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Save,
  Link2,
  AlertCircle,
} from "lucide-react";

/* ============================================================
   Attribute Manager — Persian RTL light-theme admin UI.

   - Filter bar (search + type + filterable-only + aiRelevant-only)
   - Table of attributes with flags as badges
   - Create/Edit modal with options editor + link manager
   ============================================================ */

const ATTRIBUTE_TYPES: { value: string; labelFa: string }[] = [
  { value: "TEXT", labelFa: "متن کوتاه" },
  { value: "LONG_TEXT", labelFa: "متن طولانی" },
  { value: "INTEGER", labelFa: "عدد صحیح" },
  { value: "DECIMAL", labelFa: "عدد اعشاری" },
  { value: "BOOLEAN", labelFa: "بله/خیر" },
  { value: "SELECT", labelFa: "انتخاب تکی" },
  { value: "MULTI_SELECT", labelFa: "انتخاب چندگانه" },
  { value: "RANGE", labelFa: "بازه" },
  { value: "YEAR", labelFa: "سال" },
  { value: "DATE", labelFa: "تاریخ" },
  { value: "DATETIME", labelFa: "تاریخ و زمان" },
  { value: "CURRENCY", labelFa: "مبلغ" },
  { value: "UNIT", labelFa: "اندازه‌گیری با واحد" },
  { value: "REFERENCE", labelFa: "ارجاع" },
  { value: "LOCATION", labelFa: "موقعیت" },
  { value: "FILE", labelFa: "فایل" },
  { value: "IMAGE", labelFa: "تصویر" },
  { value: "COLOR", labelFa: "رنگ" },
  { value: "SIZE", labelFa: "اندازه" },
  { value: "WEIGHT", labelFa: "وزن" },
  { value: "URL", labelFa: "نشانی وب" },
  { value: "PHONE", labelFa: "تلفن" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ATTRIBUTE_TYPES.map((t) => [t.value, t.labelFa]),
);

export interface OptionRow {
  id?: string;
  value: string;
  label: string | null;
  sortOrder: number;
}

export interface CategoryLink {
  id: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  sortable: boolean;
  displayOrder: number;
}

export interface AttributeRow {
  id: string;
  key: string | null;
  name: string;
  nameEn: string | null;
  labelFa: string;
  labelEn: string | null;
  type: string;
  unit: string | null;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  sortable: boolean;
  visibleOnCard: boolean;
  visibleOnDetail: boolean;
  seoRelevant: boolean;
  aiRelevant: boolean;
  sortOrder: number;
  options: OptionRow[];
  categories: CategoryLink[];
}

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface Props {
  initial: AttributeRow[];
  categoryOptions: CategoryOption[];
}

const EMPTY_FORM = {
  key: "",
  labelFa: "",
  labelEn: "",
  type: "TEXT",
  unit: "",
  required: false,
  filterable: false,
  searchable: false,
  sortable: false,
  visibleOnCard: false,
  visibleOnDetail: true,
  seoRelevant: false,
  aiRelevant: false,
  sortOrder: 0,
};

export default function AttributesManager({
  initial,
  categoryOptions,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<AttributeRow[]>(initial);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [filterableOnly, setFilterableOnly] = useState(false);
  const [aiRelevantOnly, setAiRelevantOnly] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [links, setLinks] = useState<CategoryLink[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Link-add form state
  const [linkCategoryId, setLinkCategoryId] = useState<string>("");
  const [linkRequired, setLinkRequired] = useState(false);
  const [linkFilterable, setLinkFilterable] = useState(false);
  const [linkSearchable, setLinkSearchable] = useState(false);
  const [linkSortable, setLinkSortable] = useState(false);
  const [linkDisplayOrder, setLinkDisplayOrder] = useState(0);
  const [linkBusy, setLinkBusy] = useState(false);

  // Delete busy
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Filtering ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (
        q &&
        !(
          (a.key ?? "").toLowerCase().includes(q) ||
          a.labelFa.toLowerCase().includes(q) ||
          (a.labelEn ?? "").toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (filterableOnly && !a.filterable) return false;
      if (aiRelevantOnly && !a.aiRelevant) return false;
      return true;
    });
  }, [items, search, typeFilter, filterableOnly, aiRelevantOnly]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setOptions([]);
    setLinks([]);
    setErr(null);
    setModalOpen(true);
  }

  function openEdit(a: AttributeRow) {
    setEditingId(a.id);
    setForm({
      key: a.key ?? "",
      labelFa: a.labelFa,
      labelEn: a.labelEn ?? "",
      type: a.type,
      unit: a.unit ?? "",
      required: a.required,
      filterable: a.filterable,
      searchable: a.searchable,
      sortable: a.sortable,
      visibleOnCard: a.visibleOnCard,
      visibleOnDetail: a.visibleOnDetail,
      seoRelevant: a.seoRelevant,
      aiRelevant: a.aiRelevant,
      sortOrder: a.sortOrder,
    });
    setOptions(
      a.options.map((o) => ({
        id: o.id,
        value: o.value,
        label: o.label,
        sortOrder: o.sortOrder,
      })),
    );
    setLinks(a.categories.map((l) => ({ ...l })));
    setErr(null);
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.labelFa || !form.type) {
      setErr("labelFa و type الزامی است.");
      return;
    }
    setErr(null);
    setSubmitting(true);

    const payload = {
      ...form,
      unit: form.unit.trim() === "" ? null : form.unit.trim(),
      key: form.key.trim() === "" ? null : form.key.trim(),
      labelEn: form.labelEn.trim() === "" ? null : form.labelEn.trim(),
      options: options
        .filter((o) => o.value.trim() !== "")
        .map((o, idx) => ({
          value: o.value.trim(),
          label: o.label && o.label.trim() !== "" ? o.label.trim() : null,
          sortOrder: Number(o.sortOrder) || idx,
        })),
    };

    try {
      const url = editingId
        ? `/api/attributes/${editingId}`
        : "/api/attributes";
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "خطا در ذخیره");

      const saved: AttributeRow = {
        id: j.attribute.id,
        key: j.attribute.key,
        name: j.attribute.name,
        nameEn: j.attribute.nameEn,
        labelFa: j.attribute.labelFa ?? j.attribute.name,
        labelEn: j.attribute.labelEn ?? j.attribute.nameEn ?? null,
        type: j.attribute.type,
        unit: j.attribute.unit,
        required: j.attribute.required,
        filterable: j.attribute.filterable,
        searchable: j.attribute.searchable,
        sortable: j.attribute.sortable,
        visibleOnCard: j.attribute.visibleOnCard,
        visibleOnDetail: j.attribute.visibleOnDetail,
        seoRelevant: j.attribute.seoRelevant,
        aiRelevant: j.attribute.aiRelevant,
        sortOrder: j.attribute.sortOrder,
        options: (j.attribute.options ?? []).map((o: any) => ({
          id: o.id,
          value: o.value,
          label: o.label,
          sortOrder: o.sortOrder,
        })),
        categories: (j.attribute.categories ?? []).map((l: any) => ({
          id: l.id,
          categoryId: l.categoryId,
          category: l.category,
          required: l.required,
          filterable: l.filterable,
          searchable: l.searchable,
          sortable: l.sortable,
          displayOrder: l.displayOrder,
        })),
      };

      setItems((prev) => {
        const without = prev.filter((x) => x.id !== saved.id);
        return [...without, saved].sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.labelFa.localeCompare(b.labelFa),
        );
      });

      setModalOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(a: AttributeRow) {
    const hasValues = a.categories.length > 0;
    const msg = hasValues
      ? `ویژگی «${a.labelFa}» به ${a.categories.length} دسته متصل است و مقادیر آگهی‌ها ممکن است به آن وابسته باشند. حذف شود؟`
      : `حذف «${a.labelFa}»؟`;
    if (!confirm(msg)) return;
    setBusyId(a.id);
    try {
      const r = await fetch(`/api/attributes/${a.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در حذف");
      }
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  // ── Options editor helpers ──
  function addOption() {
    setOptions((prev) => [
      ...prev,
      { value: "", label: "", sortOrder: prev.length },
    ]);
  }
  function updateOption(idx: number, patch: Partial<OptionRow>) {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );
  }
  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Link manager helpers ──
  const availableCategories = useMemo(
    () =>
      categoryOptions.filter(
        (c) => !links.some((l) => l.categoryId === c.id),
      ),
    [categoryOptions, links],
  );

  async function addLink() {
    if (!editingId) return;
    if (!linkCategoryId) {
      setErr("یک دسته انتخاب کنید.");
      return;
    }
    setLinkBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/attributes/${editingId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: linkCategoryId,
          required: linkRequired,
          filterable: linkFilterable,
          searchable: linkSearchable,
          sortable: linkSortable,
          displayOrder: linkDisplayOrder,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "خطا در افزودن اتصال");
      const cat = categoryOptions.find((c) => c.id === linkCategoryId);
      setLinks((prev) => [
        ...prev,
        {
          id: j.link.id,
          categoryId: linkCategoryId,
          category: cat
            ? { id: cat.id, name: cat.name, slug: cat.slug }
            : j.link.category,
          required: j.link.required,
          filterable: j.link.filterable,
          searchable: j.link.searchable,
          sortable: j.link.sortable,
          displayOrder: j.link.displayOrder,
        },
      ]);
      // reset link form
      setLinkCategoryId("");
      setLinkRequired(false);
      setLinkFilterable(false);
      setLinkSearchable(false);
      setLinkSortable(false);
      setLinkDisplayOrder(0);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLinkBusy(false);
    }
  }

  async function removeLink(link: CategoryLink) {
    if (!editingId) return;
    if (!confirm(`حذف اتصال به «${link.category.name}»؟`)) return;
    try {
      const r = await fetch(
        `/api/attributes/${editingId}/categories?categoryId=${encodeURIComponent(
          link.categoryId,
        )}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در حذف اتصال");
      }
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
          <button
            onClick={() => setErr(null)}
            className="mr-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header + filter bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-base font-bold text-zinc-900">
              کاتالوگ ویژگی‌ها
            </h2>
            <Badge
              variant="secondary"
              className="bg-zinc-100 text-zinc-700"
            >
              {toFa(filtered.length)} از {toFa(items.length)}
            </Badge>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#F58220] text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            تعریف ویژگی جدید
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="جستجو بر اساس کلید / برچسب…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="همه انواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>نوع ویژگی</SelectLabel>
                <SelectItem value="ALL">همه انواع</SelectItem>
                {ATTRIBUTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.labelFa} ({t.value})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <label className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            <Checkbox
              checked={filterableOnly}
              onCheckedChange={(v) => setFilterableOnly(v === true)}
            />
            فقط قابل فیلتر
          </label>
          <label className="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            <Checkbox
              checked={aiRelevantOnly}
              onCheckedChange={(v) => setAiRelevantOnly(v === true)}
            />
            فقط مرتبط با هوش مصنوعی
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow className="border-zinc-200 hover:bg-zinc-50">
              <TableHead className="px-3 text-right text-xs font-bold text-zinc-500">
                کلید
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-bold text-zinc-500">
                برچسب فارسی
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-bold text-zinc-500">
                برچسب انگلیسی
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-bold text-zinc-500">
                نوع
              </TableHead>
              <TableHead className="px-3 text-right text-xs font-bold text-zinc-500">
                واحد
              </TableHead>
              <TableHead className="px-3 text-center text-xs font-bold text-zinc-500">
                پرچم‌ها
              </TableHead>
              <TableHead className="px-3 text-center text-xs font-bold text-zinc-500">
                گزینه‌ها
              </TableHead>
              <TableHead className="px-3 text-center text-xs font-bold text-zinc-500">
                دسته‌ها
              </TableHead>
              <TableHead className="px-3 text-center text-xs font-bold text-zinc-500">
                ویرایش / حذف
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">
            {filtered.map((a) => (
              <TableRow key={a.id} className="hover:bg-zinc-50">
                <TableCell className="px-3 py-3">
                  {a.key ? (
                    <span
                      dir="ltr"
                      className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700"
                    >
                      {a.key}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-3 font-bold text-zinc-900">
                  {a.labelFa}
                </TableCell>
                <TableCell
                  className="px-3 py-3 text-zinc-500"
                  dir="ltr"
                >
                  {a.labelEn ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Badge
                    variant="outline"
                    className="border-zinc-200 bg-white text-[11px] text-zinc-700"
                  >
                    {TYPE_LABEL[a.type] ?? a.type}
                  </Badge>
                  <div
                    dir="ltr"
                    className="mt-0.5 font-mono text-[10px] text-zinc-400"
                  >
                    {a.type}
                  </div>
                </TableCell>
                <TableCell
                  className="px-3 py-3 text-zinc-600"
                  dir="ltr"
                >
                  {a.unit ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="flex flex-wrap justify-center gap-1">
                    {a.filterable && (
                      <Badge className="bg-orange-100 text-[10px] text-orange-700 hover:bg-orange-100">
                        فیلتر
                      </Badge>
                    )}
                    {a.searchable && (
                      <Badge className="bg-sky-100 text-[10px] text-sky-700 hover:bg-sky-100">
                        جستجو
                      </Badge>
                    )}
                    {a.sortable && (
                      <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                        مرتب‌سازی
                      </Badge>
                    )}
                    {a.visibleOnCard && (
                      <Badge className="bg-zinc-100 text-[10px] text-zinc-700 hover:bg-zinc-100">
                        کارت
                      </Badge>
                    )}
                    {a.aiRelevant && (
                      <Badge className="bg-violet-100 text-[10px] text-violet-700 hover:bg-violet-100">
                        AI
                      </Badge>
                    )}
                    {!a.filterable &&
                      !a.searchable &&
                      !a.sortable &&
                      !a.visibleOnCard &&
                      !a.aiRelevant && (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3 text-center">
                  <span
                    className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      a.options.length > 0
                        ? "bg-orange-100 text-orange-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {toFa(a.options.length)}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-3 text-center">
                  <span
                    className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      a.categories.length > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {toFa(a.categories.length)}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      title="ویرایش"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(a)}
                      disabled={busyId === a.id}
                      title="حذف"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {busyId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-zinc-400"
                >
                  ویژگی‌ای یافت نشد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "ویرایش ویژگی" : "تعریف ویژگی جدید"}
            </DialogTitle>
            <DialogDescription>
              ویژگی‌ها در سطح کاتالوگ تعریف می‌شوند و سپس به دسته‌ها
              متصل می‌گردند. پرچم‌ها در سطح اتصال قابل بازنویسی هستند.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-5">
            {/* Basic fields */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                پایه
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">
                    کلید (Key)
                  </label>
                  <Input
                    dir="ltr"
                    value={form.key}
                    onChange={(e) =>
                      setForm({ ...form, key: e.target.value })
                    }
                    placeholder="operating_weight"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">
                    نوع (Type) <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="نوع را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>نوع ویژگی</SelectLabel>
                        {ATTRIBUTE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.labelFa} ({t.value})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">
                    برچسب فارسی <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.labelFa}
                    onChange={(e) =>
                      setForm({ ...form, labelFa: e.target.value })
                    }
                    placeholder="وزن عملیاتی"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">
                    برچسب انگلیسی
                  </label>
                  <Input
                    dir="ltr"
                    value={form.labelEn}
                    onChange={(e) =>
                      setForm({ ...form, labelEn: e.target.value })
                    }
                    placeholder="Operating Weight"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">
                    واحد (Unit)
                  </label>
                  <Input
                    dir="ltr"
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value })
                    }
                    placeholder="kg / ton / hour / …"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600">
                    ترتیب (SortOrder)
                  </label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sortOrder: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </section>

            {/* Flags */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                پرچم‌ها (Attribute-level defaults)
              </h3>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-4">
                {[
                  {
                    key: "required",
                    label: "الزامی",
                  },
                  { key: "filterable", label: "قابل فیلتر" },
                  { key: "searchable", label: "قابل جستجو" },
                  { key: "sortable", label: "قابل مرتب‌سازی" },
                  { key: "visibleOnCard", label: "روی کارت" },
                  { key: "visibleOnDetail", label: "روی جزئیات" },
                  { key: "seoRelevant", label: "مرتبط SEO" },
                  { key: "aiRelevant", label: "مرتبط AI" },
                ].map((f) => (
                  <label
                    key={f.key}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  >
                    <Checkbox
                      checked={(form as any)[f.key] === true}
                      onCheckedChange={(v) =>
                        setForm({ ...form, [f.key]: v === true })
                      }
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </section>

            {/* Options editor */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  گزینه‌ها (برای SELECT / MULTI_SELECT)
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addOption}
                >
                  <Plus className="h-3.5 w-3.5" />
                  افزودن گزینه
                </Button>
              </div>
              {options.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-xs text-zinc-400">
                  گزینه‌ای ثبت نشده — برای انواع انتخابی، حداقل یک گزینه
                  اضافه کنید.
                </p>
              ) : (
                <div className="space-y-2">
                  {options.map((o, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_72px_36px] items-center gap-2"
                    >
                      <Input
                        dir="ltr"
                        value={o.value}
                        placeholder="value"
                        onChange={(e) =>
                          updateOption(idx, { value: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                      <Input
                        value={o.label ?? ""}
                        placeholder="برچسب فارسی"
                        onChange={(e) =>
                          updateOption(idx, { label: e.target.value })
                        }
                        className="text-xs"
                      />
                      <Input
                        type="number"
                        value={o.sortOrder}
                        onChange={(e) =>
                          updateOption(idx, {
                            sortOrder: Number(e.target.value) || 0,
                          })
                        }
                        className="text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-red-500 transition hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Link manager (only in edit mode) */}
            {editingId && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-[#F58220]" />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    اتصال به دسته‌ها
                  </h3>
                </div>

                {links.length > 0 && (
                  <div className="space-y-2">
                    {links.map((l) => (
                      <div
                        key={l.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs"
                      >
                        <Badge
                          variant="outline"
                          className="border-orange-200 bg-orange-50 text-orange-700"
                        >
                          {l.category.name}
                        </Badge>
                        <span
                          dir="ltr"
                          className="font-mono text-[10px] text-zinc-400"
                        >
                          {l.category.slug}
                        </span>
                        <div className="flex items-center gap-1">
                          {l.required && (
                            <Badge className="bg-red-100 text-[10px] text-red-700 hover:bg-red-100">
                              الزامی
                            </Badge>
                          )}
                          {l.filterable && (
                            <Badge className="bg-orange-100 text-[10px] text-orange-700 hover:bg-orange-100">
                              فیلتر
                            </Badge>
                          )}
                          {l.searchable && (
                            <Badge className="bg-sky-100 text-[10px] text-sky-700 hover:bg-sky-100">
                              جستجو
                            </Badge>
                          )}
                          {l.sortable && (
                            <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                              مرتب‌سازی
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="bg-zinc-100 text-[10px] text-zinc-600"
                          >
                            ترتیب: {toFa(l.displayOrder)}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLink(l)}
                          className="mr-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add link form */}
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3">
                  <p className="mb-2 text-xs font-bold text-zinc-600">
                    افزودن اتصال جدید
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Select
                      value={linkCategoryId}
                      onValueChange={(v) => setLinkCategoryId(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب دسته…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>دسته‌ها</SelectLabel>
                          {availableCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                              <span
                                dir="ltr"
                                className="ml-1 font-mono text-[10px] text-zinc-400"
                              >
                                {c.slug}
                              </span>
                            </SelectItem>
                          ))}
                          {availableCategories.length === 0 && (
                            <SelectItem value="__none" disabled>
                              همه دسته‌ها متصل‌اند
                            </SelectItem>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="ترتیب"
                      value={linkDisplayOrder}
                      onChange={(e) =>
                        setLinkDisplayOrder(Number(e.target.value) || 0)
                      }
                    />
                    <Button
                      type="button"
                      onClick={addLink}
                      disabled={linkBusy || !linkCategoryId}
                      className="bg-[#F58220] text-white hover:bg-[#ff8c38]"
                    >
                      {linkBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      افزودن اتصال
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {[
                      {
                        lbl: "الزامی",
                        val: linkRequired,
                        set: setLinkRequired,
                      },
                      {
                        lbl: "قابل فیلتر",
                        val: linkFilterable,
                        set: setLinkFilterable,
                      },
                      {
                        lbl: "قابل جستجو",
                        val: linkSearchable,
                        set: setLinkSearchable,
                      },
                      {
                        lbl: "قابل مرتب‌سازی",
                        val: linkSortable,
                        set: setLinkSortable,
                      },
                    ].map((f) => (
                      <label
                        key={f.lbl}
                        className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-700"
                      >
                        <Checkbox
                          checked={f.val}
                          onCheckedChange={(v) => f.set(v === true)}
                        />
                        {f.lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#F58220] text-white hover:bg-[#ff8c38]"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingId ? "ذخیره تغییرات" : "ایجاد ویژگی"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
