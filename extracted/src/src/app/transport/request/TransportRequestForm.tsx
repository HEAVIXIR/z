"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  listingId: string | null;
  dealRoomId: string | null;
  vehicleOptions: { value: string; label: string }[];
  isAuthed: boolean;
}

export default function TransportRequestForm({
  listingId,
  dealRoomId,
  vehicleOptions,
  isAuthed,
}: Props) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [cargoLength, setCargoLength] = useState("");
  const [cargoWidth, setCargoWidth] = useState("");
  const [cargoHeight, setCargoHeight] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [loadingDate, setLoadingDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      setError("مبدا و مقصد الزامی است.");
      return;
    }
    if (!isAuthed) {
      // Force login for unauthenticated users so we can attach requestedBy.
      router.push("/login?next=/transport/request");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        origin: origin.trim(),
        destination: destination.trim(),
        cargoType: cargoType || null,
        cargoWeight: cargoWeight || null,
        cargoLength: cargoLength || null,
        cargoWidth: cargoWidth || null,
        cargoHeight: cargoHeight || null,
        vehicleType: vehicleType || null,
        loadingDate: loadingDate || null,
        deliveryDate: deliveryDate || null,
        notes: notes || null,
      };
      if (listingId) body.listingId = listingId;
      if (dealRoomId) body.dealRoomId = dealRoomId;
      const res = await fetch("/api/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در ثبت درخواست");
      }
      const { request } = await res.json();
      setSuccess(`درخواست حمل با کد ${request.id.slice(-6).toUpperCase()} ثبت شد. کارشناسان ما به‌زودی با شما تماس می‌گیرند.`);
      // Reset form
      setOrigin("");
      setDestination("");
      setCargoType("");
      setCargoWeight("");
      setCargoLength("");
      setCargoWidth("");
      setCargoHeight("");
      setVehicleType("");
      setLoadingDate("");
      setDeliveryDate("");
      setNotes("");
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/70">
            مبدا <span className="text-rose-400">*</span>
          </label>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="مثلاً تهران، شهرک صنعتی شمس‌آباد"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/70">
            مقصد <span className="text-rose-400">*</span>
          </label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="مثلاً بندرعباس، شهرک صنعتی"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/70">نوع بار</label>
          <input
            value={cargoType}
            onChange={(e) => setCargoType(e.target.value)}
            placeholder="مثلاً بیل مکانیکی کاترپیلار ۳۲۰"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/70">وزن بار (کیلوگرم)</label>
          <input
            value={cargoWeight}
            onChange={(e) => setCargoWeight(e.target.value)}
            inputMode="numeric"
            placeholder="مثلاً ۲۰۰۰۰"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-bold text-white/70">ابعاد بار (متر) — طول × عرض × ارتفاع</label>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={cargoLength}
            onChange={(e) => setCargoLength(e.target.value)}
            inputMode="decimal"
            placeholder="طول"
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
          <input
            value={cargoWidth}
            onChange={(e) => setCargoWidth(e.target.value)}
            inputMode="decimal"
            placeholder="عرض"
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
          <input
            value={cargoHeight}
            onChange={(e) => setCargoHeight(e.target.value)}
            inputMode="decimal"
            placeholder="ارتفاع"
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-bold text-white/70">نوع وسیله نقلیه</label>
        <select
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#F58220] focus:outline-none"
        >
          <option value="" className="bg-zinc-900">انتخاب کنید…</option>
          {vehicleOptions.map((v) => (
            <option key={v.value} value={v.value} className="bg-zinc-900">
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/70">تاریخ بارگیری</label>
          <input
            type="date"
            value={loadingDate}
            onChange={(e) => setLoadingDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#F58220] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-white/70">تاریخ تحویل</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#F58220] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-bold text-white/70">یادداشت</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="توضیحات تکمیلی برای باربر…"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Truck className="h-4 w-4" />
        )}
        ثبت درخواست حمل
      </button>
    </form>
  );
}
