"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Plus,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toFa } from "@/lib/format";

type Edge = {
  id: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationType: string;
  confidence: number | null;
  source: string | null;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type Product = { id: string; canonicalName: string; slug: string };

const ENTITY_TYPES = [
  { value: "Product", label: "محصول" },
  { value: "Machine", label: "ماشین" },
  { value: "Part", label: "قطعه" },
  { value: "Attachment", label: "متعلقه" },
  { value: "Model", label: "مدل" },
];

const RELATION_TYPES = [
  { value: "COMPATIBLE_WITH", label: "سازگار با" },
  { value: "FITS", label: "جا می‌شود در" },
  { value: "REPLACES", label: "جایگزین می‌کند" },
  { value: "UPGRADES", label: "ارتقا می‌دهد به" },
  { value: "REQUIRES", label: "نیاز دارد به" },
];

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "دستی",
  AI_SUGGESTED: "پیشنهاد هوش مصنوعی",
  OEM_DOCUMENT: "سند OEM",
};

const EMPTY_FORM = {
  sourceEntityType: "Product",
  sourceEntityId: "",
  targetEntityType: "Part",
  targetEntityId: "",
  relationType: "COMPATIBLE_WITH",
  confidence: "",
  source: "MANUAL",
  verified: false,
  verifiedBy: "",
};

export default function CompatibilityManager() {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/compatibility-edges?limit=500", { cache: "no-store" });
      const data = await res.json();
      setEdges(data.edges ?? []);
    } catch {
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=500&status=", { cache: "no-store" });
      // Note: the public /api/products filters status=ACTIVE by default.
      // We fall back to the admin endpoint which has no default status filter.
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const res = await fetch("/api/admin/products?limit=500", { cache: "no-store" });
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadProducts();
  }, [load, loadProducts]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    if (!form.sourceEntityId.trim() || !form.targetEntityId.trim()) {
      setErr("شناسه هر دو موجودیت الزامی است.");
      return;
    }
    if (
      form.sourceEntityType === form.targetEntityType &&
      form.sourceEntityId.trim() === form.targetEntityId.trim()
    ) {
      setErr("نمی‌توان یک موجودیت را به خودش متصل کرد.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/compatibility-edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityType: form.sourceEntityType,
          sourceEntityId: form.sourceEntityId.trim(),
          targetEntityType: form.targetEntityType,
          targetEntityId: form.targetEntityId.trim(),
          relationType: form.relationType,
          confidence: form.confidence === "" ? null : Number(form.confidence),
          source: form.source,
          verified: form.verified,
          verifiedBy: form.verifiedBy || null,
        }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error ?? "ذخیره ناموفق بود.");
      setForm({ ...EMPTY_FORM });
      setSuccess("یال سازگاری با موفقیت ثبت شد.");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "خطا در ذخیره.");
    }
    setSubmitting(false);
  }

  async function toggleVerify(edge: Edge) {
    setBusyId(edge.id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/compatibility-edges/${edge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !edge.verified }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error ?? "خطا");
      setEdges((prev) =>
        prev.map((x) =>
          x.id === edge.id
            ? { ...x, verified: d.edge.verified, verifiedAt: d.edge.verifiedAt }
            : x,
        ),
      );
    } catch (e: any) {
      setErr(e?.message ?? "خطا");
    }
    setBusyId(null);
  }

  async function remove(edge: Edge) {
    if (!confirm("حذف این یال سازگاری؟")) return;
    setBusyId(edge.id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/compatibility-edges/${edge.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => null);
      if (!d?.ok) throw new Error(d?.error ?? "حذف ناموفق بود.");
      setEdges((prev) => prev.filter((x) => x.id !== edge.id));
    } catch (e: any) {
      setErr(e?.message ?? "خطا");
    }
    setBusyId(null);
  }

  function pickProduct(which: "source" | "target", id: string) {
    if (which === "source") {
      setForm((f) => ({ ...f, sourceEntityType: "Product", sourceEntityId: id }));
    } else {
      setForm((f) => ({ ...f, targetEntityType: "Product", targetEntityId: id }));
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-600";

  return (
    <div className="space-y-6">
      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Create form */}
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#F58220]" />
            <h2 className="text-lg font-black text-zinc-900">یال سازگاری جدید</h2>
          </div>
          <p className="text-xs text-zinc-500">
            یک یال جهت‌دار از <span className="font-bold">مبدأ</span> به{" "}
            <span className="font-bold">مقصد</span> می‌سازد.
          </p>

          {/* Source */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">مبدأ (Source)</p>
            <div className="space-y-2">
              <select
                value={form.sourceEntityType}
                onChange={(e) =>
                  setForm({ ...form, sourceEntityType: e.target.value, sourceEntityId: "" })
                }
                className={inputCls}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.value})
                  </option>
                ))}
              </select>
              <input
                value={form.sourceEntityId}
                onChange={(e) => setForm({ ...form, sourceEntityId: e.target.value })}
                className={inputCls}
                placeholder="شناسه موجودیت مبدأ"
                dir="ltr"
              />
              {form.sourceEntityType === "Product" && products.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && pickProduct("source", e.target.value)}
                  className={inputCls}
                >
                  <option value="">— انتخاب از لیست محصولات —</option>
                  {products.slice(0, 100).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.canonicalName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Relation */}
          <div>
            <label className={labelCls}>نوع رابطه</label>
            <select
              value={form.relationType}
              onChange={(e) => setForm({ ...form, relationType: e.target.value })}
              className={inputCls}
            >
              {RELATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.value})
                </option>
              ))}
            </select>
          </div>

          {/* Target */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">مقصد (Target)</p>
            <div className="space-y-2">
              <select
                value={form.targetEntityType}
                onChange={(e) =>
                  setForm({ ...form, targetEntityType: e.target.value, targetEntityId: "" })
                }
                className={inputCls}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.value})
                  </option>
                ))}
              </select>
              <input
                value={form.targetEntityId}
                onChange={(e) => setForm({ ...form, targetEntityId: e.target.value })}
                className={inputCls}
                placeholder="شناسه موجودیت مقصد"
                dir="ltr"
              />
              {form.targetEntityType === "Product" && products.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && pickProduct("target", e.target.value)}
                  className={inputCls}
                >
                  <option value="">— انتخاب از لیست محصولات —</option>
                  {products.slice(0, 100).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.canonicalName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>اطمینان (۰..۱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: e.target.value })}
                className={inputCls}
                dir="ltr"
                placeholder="۰.۹۲"
              />
            </div>
            <div>
              <label className={labelCls}>منبع</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inputCls}
              >
                <option value="MANUAL">دستی (MANUAL)</option>
                <option value="AI_SUGGESTED">پیشنهاد هوش مصنوعی</option>
                <option value="OEM_DOCUMENT">سند OEM</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>تأیید توسط</label>
            <input
              value={form.verifiedBy}
              onChange={(e) => setForm({ ...form, verifiedBy: e.target.value })}
              className={inputCls}
              placeholder="نام تأییدکننده"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm({ ...form, verified: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-[#F58220] focus:ring-[#F58220]"
            />
            تأییدشده (Verified)
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            ثبت یال
          </button>
        </form>

        {/* List */}
        <div className="space-y-4">
          <p className="text-sm font-bold text-zinc-700">
            {loading ? "در حال بارگذاری..." : `${toFa(edges.length)} یال سازگاری`}
          </p>
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-[#F58220]" />
            </div>
          ) : edges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
              هنوز یال سازگاری ثبت نشده.
            </div>
          ) : (
            <div className="max-h-[700px] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-3 py-3 text-right font-bold">مبدأ</th>
                    <th className="px-3 py-3 text-right font-bold">رابطه</th>
                    <th className="px-3 py-3 text-right font-bold">مقصد</th>
                    <th className="px-3 py-3 text-center font-bold">اطمینان</th>
                    <th className="px-3 py-3 text-center font-bold">منبع</th>
                    <th className="px-3 py-3 text-center font-bold">تأیید</th>
                    <th className="px-3 py-3 text-center font-bold">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {edges.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-3 text-xs">
                        <div className="font-bold text-zinc-800">{e.sourceEntityType}</div>
                        <div className="text-[10px] text-zinc-400" dir="ltr">
                          {e.sourceEntityId.slice(0, 12)}…
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          dir="ltr"
                          className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-700"
                        >
                          {e.relationType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="font-bold text-zinc-800">{e.targetEntityType}</div>
                        <div className="text-[10px] text-zinc-400" dir="ltr">
                          {e.targetEntityId.slice(0, 12)}…
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-zinc-600">
                        {e.confidence !== null ? toFa(e.confidence.toFixed(2)) : "—"}
                      </td>
                      <td className="px-3 py-3 text-center text-[10px] text-zinc-600">
                        {e.source ? SOURCE_LABELS[e.source] ?? e.source : "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleVerify(e)}
                          disabled={busyId === e.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition disabled:opacity-60"
                          style={{
                            background: e.verified ? "#dcfce7" : "#f4f4f5",
                            color: e.verified ? "#047857" : "#71717a",
                          }}
                          title={e.verifiedAt ? `تأیید در ${new Date(e.verifiedAt).toLocaleDateString("fa-IR")}` : "تأیید نشده"}
                        >
                          {busyId === e.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : e.verified ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5" />
                          )}
                          {e.verified ? "تأیید" : "خاموش"}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => remove(e)}
                          disabled={busyId === e.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
