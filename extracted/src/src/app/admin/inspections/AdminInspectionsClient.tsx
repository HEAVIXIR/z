"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import {
  getChecklistForCategory,
  emptyChecklistPayload,
  scoreChecklist,
  INSPECTION_STATUS_LABELS,
} from "@/lib/inspection-checklists";
import {
  Search,
  X,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileText,
  Camera,
  Wrench,
} from "lucide-react";

interface Listing {
  id: string;
  slug: string;
  title: string;
  price: string | null;
  province: string | null;
  city: string | null;
  categoryName: string | null;
  image: string | null;
}

interface Inspection {
  id: string;
  status: string;
  requestedBy: string;
  inspectorId: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  score: number | null;
  reportUrl: string | null;
  photos: string[] | null;
  notes: string | null;
  price: string | null;
  checklist: { item: string; label: string; passed: boolean | null; notes?: string }[] | null;
  createdAt: string;
  updatedAt: string;
  listing: Listing | null;
}

const FILTERS = ["ALL", "REQUESTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function AdminInspectionsClient({
  inspections,
  inspectors,
  statusColors,
  statusLabels,
}: {
  inspections: Inspection[];
  inspectors: { id: string; name: string; mobile: string }[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Inspection | null>(null);
  const [mode, setMode] = useState<"schedule" | "complete" | "view" | null>(null);

  const filtered = useMemo(() => {
    return inspections.filter((i) => {
      if (filter !== "ALL" && (i.status || "REQUESTED").toUpperCase() !== filter) return false;
      if (query) {
        const q = query.trim();
        if (!i.listing?.title?.includes(q)) return false;
      }
      return true;
    });
  }, [inspections, filter, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس عنوان آگهی…"
            className="flex-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                filter === f
                  ? "bg-[#F58220] text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-[#F58220]/40 hover:text-[#F58220]"
              }`}
            >
              {f === "ALL" ? "همه" : statusLabels[f] ?? f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">
              <tr>
                <th className="px-3 py-3 font-bold">آگهی</th>
                <th className="px-3 py-3 font-bold">دسته</th>
                <th className="px-3 py-3 font-bold">تاریخ درخواست</th>
                <th className="px-3 py-3 font-bold">تاریخ بازدید</th>
                <th className="px-3 py-3 font-bold">نمره</th>
                <th className="px-3 py-3 font-bold">وضعیت</th>
                <th className="px-3 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-zinc-400">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => {
                  const status = (i.status || "REQUESTED").toUpperCase();
                  const statusColor = statusColors[status] ?? statusColors.REQUESTED;
                  return (
                    <tr key={i.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                            {i.listing?.image ? (
                              <img src={i.listing.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">🚜</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            {i.listing ? (
                              <Link
                                href={`/listings/${i.listing.slug}`}
                                target="_blank"
                                className="block truncate text-xs font-bold text-zinc-800 hover:text-[#F58220]"
                              >
                                {i.listing.title}
                              </Link>
                            ) : (
                              <span className="text-xs text-zinc-400">آگهی حذف شده</span>
                            )}
                            <div className="text-[10px] text-zinc-400">
                              {i.listing?.province ?? "—"}، {i.listing?.city ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-600">
                        {i.listing?.categoryName ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-zinc-500">
                        {faDate(i.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-zinc-500">
                        {i.scheduledDate ? faDate(i.scheduledDate) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {i.score !== null ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            i.score >= 80
                              ? "bg-emerald-100 text-emerald-700"
                              : i.score >= 60
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}>
                            {toFa(i.score)} از ۱۰۰
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                          {statusLabels[status] ?? status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(status === "REQUESTED" || status === "SCHEDULED") && (
                            <button
                              onClick={() => {
                                setSelected(i);
                                setMode("schedule");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 transition hover:bg-sky-100"
                            >
                              <Calendar className="h-3 w-3" />
                              زمان‌بندی
                            </button>
                          )}
                          {(status === "SCHEDULED" || status === "IN_PROGRESS") && (
                            <button
                              onClick={() => {
                                setSelected(i);
                                setMode("complete");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              ثبت گزارش
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelected(i);
                              setMode("view");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
                          >
                            <FileText className="h-3 w-3" />
                            جزئیات
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && mode && (
        <Modal onClose={() => setSelected(null)}>
          {mode === "schedule" && (
            <ScheduleForm
              inspection={selected}
              inspectors={inspectors}
              onClose={() => setSelected(null)}
              onUpdated={() => {
                setSelected(null);
                if (typeof window !== "undefined") window.location.reload();
              }}
            />
          )}
          {mode === "complete" && (
            <CompleteForm
              inspection={selected}
              onClose={() => setSelected(null)}
              onUpdated={() => {
                setSelected(null);
                if (typeof window !== "undefined") window.location.reload();
              }}
            />
          )}
          {mode === "view" && <ViewPanel inspection={selected} statusLabels={statusLabels} />}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ScheduleForm({
  inspection,
  inspectors,
  onClose,
  onUpdated,
}: {
  inspection: Inspection;
  inspectors: { id: string; name: string; mobile: string }[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [date, setDate] = useState(
    inspection.scheduledDate ? inspection.scheduledDate.slice(0, 16) : "",
  );
  const [inspectorId, setInspectorId] = useState(inspection.inspectorId ?? "");
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (start: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, unknown> = {
        notes: notes || null,
      };
      if (date) patch.scheduledDate = date;
      if (inspectorId) patch.inspectorId = inspectorId;
      if (start) patch.status = "IN_PROGRESS";
      else patch.status = "SCHEDULED";
      const res = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا");
      }
      onUpdated();
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-zinc-900">
          <Calendar className="h-5 w-5 text-sky-600" />
          زمان‌بندی کارشناسی
        </h3>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100">
          <X className="h-5 w-5 text-zinc-500" />
        </button>
      </div>
      <div className="mb-2 text-xs text-zinc-500">
        {inspection.listing?.title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">تاریخ و ساعت بازدید</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">کارشناس</label>
          <select
            value={inspectorId}
            onChange={(e) => setInspectorId(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          >
            <option value="">انتخاب کارشناس…</option>
            {inspectors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — {toFa(i.mobile)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">یادداشت</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>
      </div>
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
        >
          انصراف
        </button>
        <button
          onClick={() => submit(false)}
          disabled={saving || !date}
          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
          ثبت زمان‌بندی
        </button>
        <button
          onClick={() => submit(true)}
          disabled={saving || !date}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
          شروع کارشناسی
        </button>
      </div>
    </div>
  );
}

function CompleteForm({
  inspection,
  onClose,
  onUpdated,
}: {
  inspection: Inspection;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const checklistTemplate = useMemo(
    () => getChecklistForCategory(inspection.listing?.categoryName ?? null),
    [inspection.listing?.categoryName],
  );
  const [items, setItems] = useState(() => {
    const initial = inspection.checklist && Array.isArray(inspection.checklist) && inspection.checklist.length > 0
      ? inspection.checklist
      : emptyChecklistPayload(checklistTemplate);
    return initial.map((it: any) => ({
      item: it.item ?? it.itemKey,
      label: it.label ?? it.itemLabel,
      passed: it.passed === true || it.passed === false ? it.passed : null,
      notes: it.notes ?? "",
    }));
  });
  const [reportUrl, setReportUrl] = useState(inspection.reportUrl ?? "");
  const [photos, setPhotos] = useState<string>((inspection.photos ?? []).join("\n"));
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [price, setPrice] = useState(inspection.price ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedScore = useMemo(() => scoreChecklist(items), [items]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const photoList = photos
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          checklist: items,
          reportUrl: reportUrl || null,
          photos: photoList,
          notes: notes || null,
          price: price || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا");
      }
      onUpdated();
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-black text-zinc-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ثبت گزارش کارشناسی
        </h3>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100">
          <X className="h-5 w-5 text-zinc-500" />
        </button>
      </div>
      <div className="mb-3 text-xs text-zinc-500">{inspection.listing?.title}</div>

      <div className="max-h-[28rem] space-y-4 overflow-y-auto pl-1">
        {/* Checklist */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-bold text-zinc-700">چک‌لیست بازرسی</div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              computedScore >= 80 ? "bg-emerald-100 text-emerald-700"
                : computedScore >= 60 ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}>
              نمره فعلی: {toFa(computedScore)} از ۱۰۰
            </span>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={`${it.item}-${idx}`} className="rounded-lg border border-zinc-200 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 text-[11px] font-bold text-zinc-700">
                    {it.label}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, passed: true } : x))}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        it.passed === true
                          ? "bg-emerald-500 text-white"
                          : "border border-zinc-200 text-zinc-500 hover:bg-emerald-50"
                      }`}
                    >
                      ✓ سالم
                    </button>
                    <button
                      onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, passed: false } : x))}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        it.passed === false
                          ? "bg-rose-500 text-white"
                          : "border border-zinc-200 text-zinc-500 hover:bg-rose-50"
                      }`}
                    >
                      ✗ معیوب
                    </button>
                    <button
                      onClick={() => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, passed: null } : x))}
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-100"
                    >
                      —
                    </button>
                  </div>
                </div>
                <input
                  value={it.notes}
                  onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))}
                  placeholder="یادداشت (اختیاری)…"
                  className="mt-1 w-full rounded border border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-700 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Report URL */}
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">URL گزارش کارشناسی (PDF)</label>
          <input
            value={reportUrl}
            onChange={(e) => setReportUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-zinc-600">
            <Camera className="h-3.5 w-3.5" />
            URL عکس‌ها (هر خط یک URL)
          </label>
          <textarea
            value={photos}
            onChange={(e) => setPhotos(e.target.value)}
            rows={3}
            placeholder={"https://…\nhttps://…"}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">یادداشت کلی کارشناس</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">قیمت پیشنهادی کارشناس (تومان)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="مثلاً ۸۵۰۰۰۰۰۰۰۰"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
        >
          انصراف
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          تکمیل کارشناسی
        </button>
      </div>
    </div>
  );
}

function ViewPanel({
  inspection,
  statusLabels,
}: {
  inspection: Inspection;
  statusLabels: Record<string, string>;
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-black text-zinc-900">جزئیات کارشناسی</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="آگهی" value={inspection.listing?.title ?? "—"} />
        <Field label="وضعیت" value={statusLabels[inspection.status] ?? inspection.status} />
        <Field label="تاریخ درخواست" value={faDate(inspection.createdAt)} />
        <Field
          label="تاریخ بازدید"
          value={inspection.scheduledDate ? faDate(inspection.scheduledDate) : "—"}
        />
        <Field
          label="تاریخ تکمیل"
          value={inspection.completedAt ? faDate(inspection.completedAt) : "—"}
        />
        <Field
          label="نمره"
          value={inspection.score !== null ? `${toFa(inspection.score)} از ۱۰۰` : "—"}
        />
        <Field
          label="قیمت کارشناس"
          value={inspection.price ? formatCompactPrice(inspection.price) : "—"}
        />
        <Field label="گزارش" value={inspection.reportUrl ? "دارای فایل" : "—"} />
      </div>
      {inspection.notes && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          <div className="mb-1 font-bold text-zinc-800">یادداشت کارشناس</div>
          {inspection.notes}
        </div>
      )}
      {Array.isArray(inspection.photos) && inspection.photos.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold text-zinc-700">عکس‌ها</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {inspection.photos.map((p, idx) => (
              <a key={idx} href={p} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-zinc-200">
                <img src={p} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(inspection.checklist) && inspection.checklist.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold text-zinc-700">چک‌لیست</div>
          <div className="space-y-1">
            {inspection.checklist.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between rounded border border-zinc-200 bg-white px-2 py-1 text-[11px]">
                <span className="text-zinc-700">{it.label}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  it.passed === true
                    ? "bg-emerald-100 text-emerald-700"
                    : it.passed === false
                      ? "bg-rose-100 text-rose-700"
                      : "bg-zinc-100 text-zinc-500"
                }`}>
                  {it.passed === true ? "سالم" : it.passed === false ? "معیوب" : "بدون پاسخ"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="mt-0.5 text-xs font-bold text-zinc-800">{value}</div>
    </div>
  );
}
