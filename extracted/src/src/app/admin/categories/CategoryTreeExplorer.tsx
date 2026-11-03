"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toFa } from "@/lib/format";
import MediaUploader from "@/components/admin/MediaUploader";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronDown,
  Plus,
  Minus,
  Loader2,
  Factory,
  X,
  Edit3,
  Save,
  Folder,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

export interface AppIndustry {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  icon: string | null;
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  description: string | null;
  domain: string | null;
  layer: string;
  taxPath: string | null;
  featured: boolean;
  active: boolean;
  showOnHome: boolean;
  sortOrder: number;
  level: number;
  listingCount: number;
  appIndustries: AppIndustry[];
  children?: CategoryNode[];
}

interface Props {
  roots: CategoryNode[];
  allFlat: CategoryNode[];
  industries: AppIndustry[];
}

const LAYERS = ["CATALOG", "MARKETPLACE", "SERVICE", "FALLBACK"] as const;
type Layer = (typeof LAYERS)[number];

const LAYER_META: Record<Layer, { label: string; bg: string; text: string; ring: string }> = {
  CATALOG: { label: "کاتالوگ", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  MARKETPLACE: { label: "مارکت‌پلیس", bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
  SERVICE: { label: "خدمت", bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200" },
  FALLBACK: { label: "پشتیبان", bg: "bg-zinc-100", text: "text-zinc-600", ring: "ring-zinc-200" },
};

export default function CategoryTreeExplorer({ roots, allFlat, industries }: Props) {
  const router = useRouter();
  const [layerFilter, setLayerFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  /* ── Filter logic: filter the tree by layer (a node is shown if itself OR any descendant matches) ── */
  function nodeMatches(node: CategoryNode, layer: string): boolean {
    if (!layer) return true;
    if (node.layer === layer) return true;
    return (node.children ?? []).some((c) => nodeMatches(c, layer));
  }

  const visibleRoots = useMemo(
    () => roots.filter((r) => nodeMatches(r, layerFilter)),
    [roots, layerFilter],
  );

  /* ── Quick stats ── */
  const stats = useMemo(() => {
    const counts: Record<string, number> = { CATALOG: 0, MARKETPLACE: 0, SERVICE: 0, FALLBACK: 0 };
    allFlat.forEach((c) => {
      counts[c.layer] = (counts[c.layer] ?? 0) + 1;
    });
    return counts;
  }, [allFlat]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="text-xs font-bold text-zinc-500">فیلتر لایه:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setLayerFilter("")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              layerFilter === ""
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            همه ({toFa(allFlat.length)})
          </button>
          {LAYERS.map((l) => (
            <button
              key={l}
              onClick={() => setLayerFilter(layerFilter === l ? "" : l)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                layerFilter === l
                  ? "bg-zinc-900 text-white"
                  : `${LAYER_META[l].bg} ${LAYER_META[l].text} hover:opacity-80`
              }`}
            >
              {LAYER_META[l].label} ({toFa(stats[l] ?? 0)})
            </button>
          ))}
        </div>
        <div className="mr-auto">
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            دسته جدید
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateCategoryForm
          allFlat={allFlat}
          industries={industries}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {/* Tree */}
      <div className="space-y-2">
        {visibleRoots.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-400">
            هیچ دسته‌ای با این فیلتر یافت نشد.
          </div>
        )}
        {visibleRoots.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            layerFilter={layerFilter}
            industries={industries}
            allFlat={allFlat}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Tree node — recursive.
────────────────────────────────────────────────────────── */
function TreeNode({
  node,
  depth,
  layerFilter,
  industries,
  allFlat,
}: {
  node: CategoryNode;
  depth: number;
  layerFilter: string;
  industries: AppIndustry[];
  allFlat: CategoryNode[];
}) {
  const [open, setOpen] = useState(depth < 1);
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const visibleChildren = (node.children ?? []).filter((c) => {
    if (!layerFilter) return true;
    if (c.layer === layerFilter) return true;
    return (c.children ?? []).some((g) => g.layer === layerFilter);
  });

  const hasChildren = visibleChildren.length > 0;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      style={{ marginRight: `${depth * 16}px` }}
    >
      <div className="flex items-center gap-2 p-4">
        {/* Expand / collapse */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 ${
            hasChildren ? "" : "invisible"
          }`}
        >
          {open ? <Minus className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Icon */}
        <span className="text-xl">{node.icon ?? "📁"}</span>

        {/* Name + taxPath breadcrumb */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-zinc-900">{node.name}</h3>
            {node.nameEn && (
              <span className="text-xs text-zinc-400" dir="ltr">
                {node.nameEn}
              </span>
            )}
            <LayerBadge layer={node.layer} />
            {node.featured && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                ویژه
              </span>
            )}
            {!node.active && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                غیرفعال
              </span>
            )}
          </div>
          {/* taxPath breadcrumb */}
          {node.taxPath && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400" dir="ltr">
              <Folder className="h-3 w-3" />
              <code className="rounded bg-zinc-50 px-1.5 py-0.5 font-mono text-zinc-500">
                {node.taxPath}
              </code>
            </div>
          )}
          {/* AppIndustries chips */}
          {node.appIndustries.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Factory className="h-3 w-3 text-zinc-400" />
              {node.appIndustries.map((ai) => (
                <span
                  key={ai.id}
                  className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700"
                >
                  <span>{ai.icon ?? "🏭"}</span>
                  {ai.nameFa}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: counts + edit button */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
            {toFa(node.listingCount)} آگهی
          </span>
          <button
            onClick={() => setEditing((e) => !e)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
            title="ویرایش لایه / taxPath / صنایع"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inline editor */}
      {editing && (
        <InlineEditor
          node={node}
          industries={industries}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}

      {/* Children */}
      {open && hasChildren && (
        <div className="space-y-2 border-t border-zinc-100 bg-zinc-50/50 p-3">
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              layerFilter={layerFilter}
              industries={industries}
              allFlat={allFlat}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LayerBadge({ layer }: { layer: string }) {
  const meta = LAYER_META[layer as Layer] ?? LAYER_META.FALLBACK;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}
    >
      {meta.label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────
   Inline editor — lets admin edit layer, taxPath, and
   connected ApplicationIndustries for an existing category.
────────────────────────────────────────────────────────── */
function InlineEditor({
  node,
  industries,
  onClose,
  onSaved,
}: {
  node: CategoryNode;
  industries: AppIndustry[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [layer, setLayer] = useState<string>(node.layer);
  const [taxPath, setTaxPath] = useState<string>(node.taxPath ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(node.imageUrl ?? null);
  const [selected, setSelected] = useState<string[]>(node.appIndustries.map((a) => a.id));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { toast } = useToast();

  function toggleIndustry(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /* AI image generation — calls /api/admin/categories/[id]/generate-image
     which can take 20-40s. Updates imageUrl state + DB on success. */
  async function handleAiGenerateImage() {
    if (aiGenerating) return;
    const ok = window.confirm(
      "این عملیات ممکن است چند ثانیه طول بکشد (۲۰ تا ۴۰ ثانیه). ادامه می‌دهید؟",
    );
    if (!ok) return;

    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch(
        `/api/admin/categories/${node.id}/generate-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.imageUrl) {
        throw new Error(
          data?.error ??
            "سرویس هوش مصنوعی در دسترس نیست. بعداً تلاش کنید یا تصویر را دستی بارگذاری کنید.",
        );
      }
      setImageUrl(data.imageUrl);
      toast({
        title: "تصویر دسته ساخته شد",
        description: "تصویر تولیدشده توسط هوش مصنوعی ذخیره شد.",
      });
      onSaved();
    } catch (e: any) {
      setAiError(
        e?.message ??
          "سرویس هوش مصنوعی در دسترس نیست. بعداً تلاش کنید یا تصویر را دستی بارگذاری کنید.",
      );
    } finally {
      setAiGenerating(false);
    }
  }

  function save() {
    setSaving(true);
    setErr(null);
    fetch(`/api/taxonomy/categories/${node.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layer,
        taxPath: taxPath.trim() || null,
        imageUrl: imageUrl || null,
        appIndustries: selected,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا در ذخیره");
        }
        onSaved();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="border-t border-zinc-100 bg-zinc-50 p-4">
      {/* Category image */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-bold text-zinc-600">
          تصویر دسته
        </label>
        <MediaUploader
          value={imageUrl}
          onChange={(v) => setImageUrl(v)}
          endpoint="/api/admin/upload"
          hint="تصویر شاخص دسته در کارت‌ها و صفحه دسته نمایش داده می‌شود."
        />

        {/* AI image generation — only for existing categories (needs an id) */}
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#F58220]/30 bg-[#F58220]/5 p-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-[#F58220]" />
          <button
            type="button"
            onClick={handleAiGenerateImage}
            disabled={aiGenerating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {aiGenerating ? "در حال پردازش..." : "AI ساخت تصویر"}
          </button>
          <span className="text-[11px] text-zinc-500">
            با هوش مصنوعی یک تصویر صنعتی برای این دسته می‌سازد (۲۰ تا ۴۰ ثانیه).
          </span>
          {aiError && (
            <span className="basis-full text-[11px] font-bold text-red-600">
              {aiError}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">لایه</label>
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          >
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {l} — {LAYER_META[l].label}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-bold text-zinc-600">
            taxPath (مسیر مادیالایز — 例如 machinery.excavators.chain)
          </label>
          <input
            dir="ltr"
            value={taxPath}
            onChange={(e) => setTaxPath(e.target.value)}
            placeholder="machinery.excavators.chain"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[#F58220]"
          />
        </div>
      </div>

      {/* App industries grid */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-600">
            صنایع کاربرد متصل ({toFa(selected.length)} انتخاب)
          </label>
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="text-[11px] font-bold text-zinc-500 hover:text-red-600"
            >
              پاک‌کردن همه
            </button>
          )}
        </div>
        <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 sm:grid-cols-3 lg:grid-cols-4">
          {industries.map((ai) => {
            const on = selected.includes(ai.id);
            return (
              <button
                key={ai.id}
                onClick={() => toggleIndustry(ai.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                  on
                    ? "border border-orange-300 bg-orange-50 text-orange-700"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <span>{ai.icon ?? "🏭"}</span>
                <span className="truncate">{ai.nameFa}</span>
                {on && <X className="mr-auto h-3 w-3" />}
              </button>
            );
          })}
          {industries.length === 0 && (
            <p className="col-span-full p-4 text-center text-xs text-zinc-400">
              صنعت کاربردی تعریف نشده. به /admin/taxonomy/industries بروید.
            </p>
          )}
        </div>
      </div>

      {/* Currently selected chips */}
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {selected.map((id) => {
            const ai = industries.find((x) => x.id === id);
            if (!ai) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700"
              >
                {ai.icon ?? "🏭"} {ai.nameFa}
                <button onClick={() => toggleIndustry(id)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {err && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{err}</p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100"
        >
          انصراف
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Create category form — inline panel.
────────────────────────────────────────────────────────── */
function CreateCategoryForm({
  allFlat,
  industries,
  onClose,
  onCreated,
}: {
  allFlat: CategoryNode[];
  industries: AppIndustry[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    nameEn: "",
    icon: "",
    imageUrl: "",
    description: "",
    domain: "",
    parentId: "",
    layer: "CATALOG",
    taxPath: "",
    sortOrder: 0,
    active: true,
    featured: false,
    showOnHome: true,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) {
      setErr("نام الزامی است.");
      return;
    }
    setErr(null);
    setSaving(true);
    fetch("/api/taxonomy/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, imageUrl: form.imageUrl || null, appIndustries: selected }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا در ایجاد");
        }
        onCreated();
      })
      .catch((e) => setErr(e.message))
      .finally(() => setSaving(false));
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border-2 border-[#F58220]/30 bg-orange-50/30 p-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-900">دسته جدید</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-500 hover:bg-white hover:text-zinc-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">نام فارسی *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">نام انگلیسی</label>
          <input
            dir="ltr"
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">آیکون (اموجی)</label>
          <input
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="🚜"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-bold text-zinc-600">تصویر دسته</label>
          <MediaUploader
            value={form.imageUrl}
            onChange={(v) => setForm({ ...form, imageUrl: v ?? "" })}
            endpoint="/api/admin/upload"
            hint="اختیاری — تصویر شاخص برای کارت دسته."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">دسته والد</label>
          <select
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          >
            <option value="">— ریشه (level 0) —</option>
            {allFlat
              .slice()
              .sort((a, b) => (a.name.localeCompare(b.name)))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {"—".repeat(c.level)} {c.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">لایه</label>
          <select
            value={form.layer}
            onChange={(e) => setForm({ ...form, layer: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          >
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {l} — {LAYER_META[l].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-zinc-600">دامنه</label>
          <input
            dir="ltr"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder="MACHINE | VEHICLE | PART"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[#F58220]"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-bold text-zinc-600">taxPath</label>
          <input
            dir="ltr"
            value={form.taxPath}
            onChange={(e) => setForm({ ...form, taxPath: e.target.value })}
            placeholder="machinery.excavators.chain"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[#F58220]"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-bold text-zinc-600">توضیحات</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#F58220]"
          />
        </div>
      </div>

      {/* App industries grid */}
      <div>
        <label className="mb-1 block text-xs font-bold text-zinc-600">
          صنایع کاربرد ({toFa(selected.length)} انتخاب)
        </label>
        <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 sm:grid-cols-3 lg:grid-cols-4">
          {industries.map((ai) => {
            const on = selected.includes(ai.id);
            return (
              <button
                key={ai.id}
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(ai.id) ? prev.filter((x) => x !== ai.id) : [...prev, ai.id],
                  )
                }
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                  on
                    ? "border border-orange-300 bg-orange-50 text-orange-700"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <span>{ai.icon ?? "🏭"}</span>
                <span className="truncate">{ai.nameFa}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-[#F58220] focus:ring-[#F58220]"
          />
          فعال
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-[#F58220] focus:ring-[#F58220]"
          />
          ویژه
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.showOnHome}
            onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-[#F58220] focus:ring-[#F58220]"
          />
          نمایش در خانه
        </label>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-zinc-600">ترتیب</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            className="w-20 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#F58220]"
          />
        </div>
      </div>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{err}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-white"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          ایجاد دسته
        </button>
      </div>
    </form>
  );
}
