"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GitCompare,
  Loader2,
  Save,
  CheckCircle2,
  Trash2,
  Search,
  Sparkles,
  Eye,
  ExternalLink,
  AlertCircle,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toFa, faDate } from "@/lib/format";

/* ============================================================
   /admin/compare — admin overview for the HEAVIX Machine
   Comparison Engine (V1.0).
   • Lists saved comparison sessions with item counts + AI summaries
   • Configure which attributes are shown in the public compare table
   • Drill into a session to view its full comparison + AI summary
   ============================================================ */

type Session = {
  id: string;
  name: string | null;
  status: string;
  userId: string | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  aiSummary: string | null;
  aiSummaryAt: string | null;
  itemCount: number;
};

type Attribute = {
  id: string;
  key: string | null;
  name: string;
  nameEn: string | null;
  labelFa: string | null;
  labelEn: string | null;
  type: string;
  unit: string | null;
  sortOrder: number;
};

type SessionDetail = {
  id: string;
  name: string | null;
  status: string;
  userId: string | null;
  shareToken: string | null;
  shareExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  aiSummary: string | null;
  aiSummaryAt: string | null;
  items: {
    id: string;
    listingId: string | null;
    productId: string | null;
    brandId: string | null;
    modelId: string | null;
    sortOrder: number;
  }[];
};

type Cell = {
  itemId: string;
  display: string;
  raw: string | null;
  unit?: string | null;
  normalized: string;
  provenance?: {
    source?: string | null;
    confidence?: number | null;
    verifiedAt?: string | null;
  };
};

type Row = {
  key: string;
  label: string;
  category: "fixed" | "attribute";
  unit?: string | null;
  cells: Cell[];
  isDifferent: boolean;
  isPrice?: boolean;
};

type ItemData = {
  id: string;
  title: string;
  slug?: string | null;
  image?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
};

type ComparisonData = {
  items: ItemData[];
  rows: Row[];
  attributes: string[];
  differences: string[];
  crossCategoryWarning: boolean;
  categories: { id: string; name: string }[];
};

export default function AdminComparePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [savingAttrs, setSavingAttrs] = useState(false);
  const [savedAttrs, setSavedAttrs] = useState(false);
  const [attrFilter, setAttrFilter] = useState("");

  // Session detail drawer
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [detailData, setDetailData] = useState<ComparisonData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Renaming state
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/compare", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      setSessions(json.sessions ?? []);
      setAttributes(json.attributes ?? []);
      setVisibleIds(Array.isArray(json.visibleAttributeIds) ? json.visibleAttributeIds : []);
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در بارگذاری",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAttr = (id: string) => {
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const saveAttrs = async () => {
    setSavingAttrs(true);
    try {
      const res = await fetch("/api/admin/compare", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleAttributeIds: visibleIds }),
      });
      if (!res.ok) throw new Error("ذخیره ناموفق بود");
      setSavedAttrs(true);
      setTimeout(() => setSavedAttrs(false), 2500);
      toast({ title: "ذخیره شد", description: "فهرست ویژگی‌های قابل نمایش به‌روزرسانی شد." });
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "ذخیره ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setSavingAttrs(false);
    }
  };

  const archiveSession = async (id: string) => {
    if (!confirm("این مقایسه آرشیو شود؟")) return;
    try {
      const res = await fetch(`/api/admin/compare/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("خطا در آرشیو");
      toast({ title: "آرشیو شد" });
      load();
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در آرشیو",
        variant: "destructive",
      });
    }
  };

  const renameSession = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/compare/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      if (!res.ok) throw new Error("خطا در تغییر نام");
      toast({ title: "نام تغییر کرد" });
      setRenameId(null);
      load();
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در تغییر نام",
        variant: "destructive",
      });
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailSession(null);
    setDetailData(null);
    try {
      const res = await fetch(`/api/admin/compare/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const json = await res.json();
      setDetailSession(json.session);
      setDetailData(json.data);
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در بارگذاری",
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredAttributes = useMemo(() => {
    if (!attrFilter.trim()) return attributes;
    const q = attrFilter.trim().toLowerCase();
    return attributes.filter(
      (a) =>
        (a.name ?? "").toLowerCase().includes(q) ||
        (a.nameEn ?? "").toLowerCase().includes(q) ||
        (a.key ?? "").toLowerCase().includes(q),
    );
  }, [attributes, attrFilter]);

  const visibleCount = visibleIds.length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <GitCompare className="h-6 w-6 text-[#F58220]" />
          موتور مقایسه ماشین‌آلات
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت جلسه‌های مقایسهٔ ذخیره‌شده، پیکربندی ویژگی‌های قابل نمایش و مشاهدهٔ
          خلاصه‌های هوش مصنوعی.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="جلسه‌های فعال" value={sessions.filter((s) => s.status === "ACTIVE").length} />
        <StatCard label="جلسه‌های آرشیو‌شده" value={sessions.filter((s) => s.status === "ARCHIVED").length} />
        <StatCard label="خلاصه‌های AI تولیدشده" value={sessions.filter((s) => s.aiSummary).length} />
        <StatCard label="ویژگی‌های قابل نمایش" value={visibleCount === 0 ? "همه" : visibleCount} />
      </div>

      {/* Sessions table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">جلسه‌های مقایسه</h2>
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">هنوز جلسه‌ای ذخیره نشده است.</p>
            <p className="mt-1 text-xs text-zinc-400">
              کاربران با مراجعه به <Link href="/compare" className="text-[#F58220] hover:underline">/compare</Link> و
              ذخیرهٔ مقایسه، جلسه‌ها را اینجا ایجاد می‌کنند.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-200 text-right text-xs font-bold text-zinc-500">
                  <th className="px-3 py-3">نام</th>
                  <th className="px-3 py-3">وضعیت</th>
                  <th className="px-3 py-3">تعداد موارد</th>
                  <th className="px-3 py-3">خلاصه AI</th>
                  <th className="px-3 py-3">تاریخ ایجاد</th>
                  <th className="px-3 py-3">آخرین به‌روزرسانی</th>
                  <th className="px-3 py-3 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100 text-sm hover:bg-zinc-50">
                    <td className="px-3 py-3">
                      {renameId === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 w-40 rounded-lg border border-zinc-200 px-2 text-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => renameSession(s.id)}
                            className="rounded bg-[#F58220] px-2 py-1 text-[10px] text-white"
                          >
                            ذخیره
                          </button>
                          <button
                            onClick={() => setRenameId(null)}
                            className="rounded px-1 text-zinc-400 hover:text-zinc-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRenameId(s.id);
                            setRenameValue(s.name ?? "");
                          }}
                          className="font-bold text-zinc-800 hover:text-[#F58220]"
                          title="کلیک برای ویرایش نام"
                        >
                          {s.name ?? <span className="text-zinc-400">بدون نام</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {s.status === "ACTIVE" ? "فعال" : "آرشیو"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{toFa(s.itemCount)}</td>
                    <td className="px-3 py-3">
                      {s.aiSummary ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                          <Sparkles className="h-3 w-3" />
                          {s.aiSummaryAt ? faDate(s.aiSummaryAt) : "دارد"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{faDate(s.createdAt)}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{faDate(s.updatedAt)}</td>
                    <td className="px-3 py-3 text-left">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openDetail(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-700 hover:border-[#F58220] hover:text-[#F58220]"
                        >
                          <Eye className="h-3 w-3" /> مشاهده
                        </button>
                        {s.shareToken && (
                          <Link
                            href={`/compare?share=${s.shareToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-700 hover:border-[#F58220] hover:text-[#F58220]"
                          >
                            <ExternalLink className="h-3 w-3" /> لینک
                          </Link>
                        )}
                        <button
                          onClick={() => archiveSession(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-bold text-red-600 hover:border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" /> آرشیو
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attribute visibility config */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-zinc-900">ویژگی‌های قابل نمایش در جدول مقایسه</h2>
            <p className="mt-1 text-xs text-zinc-500">
              وقتی هیچ ویژگی‌ای انتخاب نشود، <span className="font-bold">همه</span> ویژگی‌ها نمایش داده می‌شوند.
              وقتی حداقل یک ویژگی انتخاب شود، فقط ویژگی‌های انتخاب‌شده در جدول عمومی مقایسه ظاهر می‌شوند.
            </p>
          </div>
          <button
            onClick={saveAttrs}
            disabled={savingAttrs}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {savingAttrs ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedAttrs ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingAttrs ? "در حال ذخیره..." : savedAttrs ? "ذخیره شد!" : "ذخیره"}
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={attrFilter}
            onChange={(e) => setAttrFilter(e.target.value)}
            placeholder="جستجوی ویژگی — نام، کلید یا نام انگلیسی..."
            className="h-10 flex-1 bg-transparent text-sm outline-none"
          />
          {attrFilter && (
            <button onClick={() => setAttrFilter("")} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {attributes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
            هیچ ویژگی‌ای تعریف نشده است.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-100">
            <table className="w-full">
              <thead className="sticky top-0 bg-zinc-50">
                <tr className="border-b border-zinc-100 text-right text-xs font-bold text-zinc-500">
                  <th className="w-12 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={
                        visibleIds.length === 0
                          ? false
                          : filteredAttributes.every((a) => visibleIds.includes(a.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleIds((prev) =>
                            Array.from(new Set([...prev, ...filteredAttributes.map((a) => a.id)])),
                          );
                        } else {
                          setVisibleIds((prev) =>
                            prev.filter((id) => !filteredAttributes.some((a) => a.id === id)),
                          );
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2">نام</th>
                  <th className="px-3 py-2">کلید</th>
                  <th className="px-3 py-2">نوع</th>
                  <th className="px-3 py-2">واحد</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttributes.map((a) => {
                  const checked = visibleIds.includes(a.id);
                  return (
                    <tr key={a.id} className="border-b border-zinc-50 text-sm hover:bg-zinc-50">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAttr(a.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-bold text-zinc-800">
                        {a.labelFa ?? a.name}
                        {a.nameEn && (
                          <span className="mr-2 text-[10px] text-zinc-400">{a.nameEn}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-zinc-500">{a.key ?? "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-zinc-500">{a.type}</td>
                      <td className="px-3 py-2 text-[11px] text-zinc-500">{a.unit ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] text-zinc-400">
          {visibleIds.length === 0
            ? `در حال حاضر همهٔ ${toFa(attributes.length)} ویژگی نمایش داده می‌شوند.`
            : `${toFa(visibleIds.length)} ویژگی از ${toFa(attributes.length)} ویژگی انتخاب شده است.`}
        </p>
      </div>

      {/* Detail drawer */}
      {(detailLoading || detailSession) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/40"
          onClick={() => {
            setDetailSession(null);
            setDetailData(null);
          }}
        >
          <div
            className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-zinc-900">
                  {detailSession?.name ?? "جزئیات مقایسه"}
                </h3>
                <p className="text-xs text-zinc-500">
                  {detailSession && faDate(detailSession.createdAt)} ·{" "}
                  {detailSession && toFa(detailSession.items.length)} مورد
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailSession(null);
                  setDetailData(null);
                }}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
                </div>
              ) : detailSession && detailData ? (
                <div className="space-y-6">
                  {/* AI summary */}
                  {detailSession.aiSummary && (
                    <div className="rounded-xl border border-[#F58220]/30 bg-[#F58220]/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#F58220]" />
                        <h4 className="text-sm font-black text-zinc-800">خلاصه هوش مصنوعی</h4>
                        {detailSession.aiSummaryAt && (
                          <span className="text-[10px] text-zinc-500">
                            ({faDate(detailSession.aiSummaryAt)})
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-line text-xs leading-6 text-zinc-700">
                        {detailSession.aiSummary}
                      </div>
                    </div>
                  )}

                  {/* Cross-category warning */}
                  {detailData.crossCategoryWarning && detailData.categories.length > 1 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <AlertCircle className="ml-1 inline h-3 w-3" />
                      موارد از دسته‌های متفاوت هستند:{" "}
                      {detailData.categories.map((c) => c.name).join("، ")}
                    </div>
                  )}

                  {/* Comparison table */}
                  {detailData.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                      این جلسه هیچ مورد معتبری ندارد (ممکن است آگهی‌ها حذف شده باشند).
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-100">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-zinc-50">
                          <tr className="border-b border-zinc-100">
                            <th className="w-32 px-3 py-2 text-right text-[10px] font-bold text-zinc-500">
                              مشخصه
                            </th>
                            {detailData.items.map((it) => (
                              <th key={it.id} className="px-3 py-2 text-center text-[11px] font-bold text-zinc-700">
                                <Link
                                  href={it.slug ? `/listings/${it.slug}` : "#"}
                                  target="_blank"
                                  className="hover:text-[#F58220]"
                                >
                                  {it.title}
                                </Link>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.rows.map((row, idx) => (
                            <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                              <td className="px-3 py-2 text-[11px] font-bold text-zinc-600">
                                <span className="flex items-center gap-1">
                                  {row.label}
                                  {row.isDifferent && (
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F58220]" />
                                  )}
                                </span>
                              </td>
                              {row.cells.map((cell) => (
                                <td
                                  key={cell.itemId}
                                  className={`px-3 py-2 text-center text-[11px] ${
                                    row.isPrice ? "font-bold text-[#F58220]" : "text-zinc-700"
                                  }`}
                                >
                                  {cell.display || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-zinc-500">خطا در بارگذاری جزئیات</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-black text-[#F58220]">{value}</div>
      <div className="mt-1 text-[11px] font-bold text-zinc-500">{label}</div>
    </div>
  );
}
