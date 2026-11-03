"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import {
  Search,
  X,
  Truck,
  Loader2,
  AlertTriangle,
  Phone,
  Package,
} from "lucide-react";

interface TransportRequest {
  id: string;
  status: string;
  origin: string;
  destination: string;
  cargoType: string | null;
  cargoWeight: number | null;
  cargoLength: number | null;
  cargoWidth: number | null;
  cargoHeight: number | null;
  vehicleType: string | null;
  loadingDate: string | null;
  deliveryDate: string | null;
  quotedPrice: string | null;
  carrierName: string | null;
  carrierPhone: string | null;
  trackingCode: string | null;
  notes: string | null;
  requestedBy: string;
  listingId: string | null;
  dealRoomId: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    price: string | null;
    image: string | null;
  } | null;
}

const FILTERS = ["ALL", "REQUESTED", "QUOTING", "ACCEPTED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

const VEHICLE_OPTIONS = [
  { value: "FLATBED", label: "کفی" },
  { value: "LOWBOY", label: "لووبوی (کم‌چرخ)" },
  { value: "CONTAINER", label: "کانتینربر" },
  { value: "SPECIAL", label: "ویژه / ابعاد خاص" },
];

export default function AdminTransportClient({
  requests,
  statusColors,
  statusLabels,
  vehicleLabels,
}: {
  requests: TransportRequest[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  vehicleLabels: Record<string, string>;
}) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TransportRequest | null>(null);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter !== "ALL" && (r.status || "REQUESTED").toUpperCase() !== filter) return false;
      if (query) {
        const q = query.trim();
        if (
          !(
            r.origin.includes(q) ||
            r.destination.includes(q) ||
            (r.carrierName ?? "").includes(q) ||
            (r.trackingCode ?? "").includes(q) ||
            (r.cargoType ?? "").includes(q) ||
            (r.listing?.title ?? "").includes(q)
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [requests, filter, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس مبدا/مقصد/باربر/کد رهگیری…"
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
                <th className="px-3 py-3 font-bold">مسیر</th>
                <th className="px-3 py-3 font-bold">بار</th>
                <th className="px-3 py-3 font-bold">وسیله نقلیه</th>
                <th className="px-3 py-3 font-bold">تاریخ بارگیری</th>
                <th className="px-3 py-3 font-bold">قیمت استعلام</th>
                <th className="px-3 py-3 font-bold">باربر</th>
                <th className="px-3 py-3 font-bold">وضعیت</th>
                <th className="px-3 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-zinc-400">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = (r.status || "REQUESTED").toUpperCase();
                  const statusColor = statusColors[status] ?? statusColors.REQUESTED;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-3">
                        <div className="text-[11px] font-bold text-zinc-800">{r.origin}</div>
                        <div className="text-[10px] text-zinc-400">↓ به</div>
                        <div className="text-[11px] font-bold text-zinc-800">{r.destination}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-[11px] text-zinc-700">{r.cargoType ?? "—"}</div>
                        <div className="text-[10px] text-zinc-400">
                          {r.cargoWeight != null ? `${toFa(r.cargoWeight)} کیلوگرم` : ""}
                          {(r.cargoLength || r.cargoWidth || r.cargoHeight) ? (
                            <span>
                              {" "}· ابعاد: {r.cargoLength ? toFa(r.cargoLength) : "—"}×
                              {r.cargoWidth ? toFa(r.cargoWidth) : "—"}×
                              {r.cargoHeight ? toFa(r.cargoHeight) : "—"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-700">
                        {r.vehicleType ? (vehicleLabels[r.vehicleType] ?? r.vehicleType) : "—"}
                      </td>
                      <td className="px-3 py-3 text-[10px] text-zinc-500">
                        {r.loadingDate ? faDate(r.loadingDate) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {r.quotedPrice ? (
                          <span className="text-[11px] font-bold text-emerald-700">
                            {formatCompactPrice(r.quotedPrice)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.carrierName ? (
                          <div>
                            <div className="text-[11px] font-bold text-zinc-800">{r.carrierName}</div>
                            {r.carrierPhone && (
                              <a href={`tel:${r.carrierPhone}`} className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <Phone className="h-3 w-3" />
                                {toFa(r.carrierPhone)}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                          {statusLabels[status] ?? status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-left">
                        <button
                          onClick={() => setSelected(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
                        >
                          <Truck className="h-3 w-3" />
                          مدیریت
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <ManagePanel
            request={selected}
            onClose={() => setSelected(null)}
            onUpdated={() => {
              setSelected(null);
              if (typeof window !== "undefined") window.location.reload();
            }}
            statusLabels={statusLabels}
            vehicleLabels={vehicleLabels}
          />
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
        className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ManagePanel({
  request,
  onClose,
  onUpdated,
  statusLabels,
  vehicleLabels,
}: {
  request: TransportRequest;
  onClose: () => void;
  onUpdated: () => void;
  statusLabels: Record<string, string>;
  vehicleLabels: Record<string, string>;
}) {
  const [status, setStatus] = useState(request.status);
  const [quotedPrice, setQuotedPrice] = useState(request.quotedPrice ?? "");
  const [carrierName, setCarrierName] = useState(request.carrierName ?? "");
  const [carrierPhone, setCarrierPhone] = useState(request.carrierPhone ?? "");
  const [trackingCode, setTrackingCode] = useState(request.trackingCode ?? "");
  const [notes, setNotes] = useState(request.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, unknown> = {
        status,
        quotedPrice: quotedPrice || null,
        carrierName: carrierName || null,
        carrierPhone: carrierPhone || null,
        trackingCode: trackingCode || null,
        notes: notes || null,
      };
      const res = await fetch(`/api/transport/${request.id}`, {
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
          <Truck className="h-5 w-5 text-[#F58220]" />
          مدیریت درخواست حمل
        </h3>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100">
          <X className="h-5 w-5 text-zinc-500" />
        </button>
      </div>

      {/* Summary */}
      <div className="mb-4 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
        <Field label="مبدا" value={request.origin} />
        <Field label="مقصد" value={request.destination} />
        <Field label="نوع بار" value={request.cargoType ?? "—"} />
        <Field label="وزن" value={request.cargoWeight != null ? `${toFa(request.cargoWeight)} کیلوگرم` : "—"} />
        <Field
          label="نوع وسیله نقلیه"
          value={request.vehicleType ? (vehicleLabels[request.vehicleType] ?? request.vehicleType) : "—"}
        />
        <Field label="تاریخ بارگیری" value={request.loadingDate ? faDate(request.loadingDate) : "—"} />
        {request.listing && (
          <div className="sm:col-span-2">
            <Field
              label="آگهی مرتبط"
              value={
                <Link href={`/listings/${request.listing.slug}`} target="_blank" className="text-[#F58220] hover:underline">
                  {request.listing.title}
                </Link> as unknown as string
              }
            />
          </div>
        )}
      </div>

      {/* Form */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">وضعیت</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          >
            {["REQUESTED", "QUOTING", "ACCEPTED", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {statusLabels[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">قیمت استعلام (تومان)</label>
          <input
            value={quotedPrice}
            onChange={(e) => setQuotedPrice(e.target.value)}
            inputMode="numeric"
            placeholder="مثلاً ۱۵۰۰۰۰۰۰۰"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">نام باربر / شرکت حمل</label>
          <input
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-zinc-600">تلفن باربر</label>
          <input
            value={carrierPhone}
            onChange={(e) => setCarrierPhone(e.target.value)}
            inputMode="tel"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-zinc-600">
            <Package className="h-3.5 w-3.5" />
            کد رهگیری
          </label>
          <input
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
          />
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
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
          ذخیره
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="mt-0.5 text-xs font-bold text-zinc-800">{value}</div>
    </div>
  );
}
