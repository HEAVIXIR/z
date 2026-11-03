"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useCallback } from "react";

type Industry = { key: string; nameFa: string; nameEn: string | null };

interface Props {
  typeOptions: string[];
  statusOptions: string[];
  verificationOptions: string[];
  industries: Industry[];
  currentType: string;
  currentStatus: string;
  currentVerification: string;
  currentIndustry: string;
  currentQ: string;
}

/* BrandListFilters — admin filter bar that updates URL search params.
   Pure client component; the parent server page reads searchParams
   and re-renders with the filtered brand list. */
export function BrandListFilters({
  typeOptions,
  statusOptions,
  verificationOptions,
  industries,
  currentType,
  currentStatus,
  currentVerification,
  currentIndustry,
  currentQ,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/admin/taxonomy/brands?${params.toString()}`);
    },
    [router, sp],
  );

  const reset = () => {
    router.push("/admin/taxonomy/brands");
  };

  const selectCls =
    "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none transition focus:border-[#F58220]";
  const hasAny =
    currentType || currentStatus || currentVerification || currentIndustry || currentQ;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex-1 min-w-[180px]">
        <label className="mb-1 block text-[10px] font-bold text-zinc-500">
          جستجو
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={currentQ}
            onChange={(e) => update("q", e.target.value)}
            placeholder="نام، نام انگلیسی یا نام کوتاه..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-9 pl-3 text-xs text-zinc-800 outline-none focus:border-[#F58220]"
          />
        </div>
      </div>

      <div className="min-w-[140px]">
        <label className="mb-1 block text-[10px] font-bold text-zinc-500">
          نوع ({typeOptions.length})
        </label>
        <select
          value={currentType}
          onChange={(e) => update("type", e.target.value)}
          className={selectCls}
        >
          <option value="">همه</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[140px]">
        <label className="mb-1 block text-[10px] font-bold text-zinc-500">
          وضعیت ({statusOptions.length})
        </label>
        <select
          value={currentStatus}
          onChange={(e) => update("status", e.target.value)}
          className={selectCls}
        >
          <option value="">همه</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[140px]">
        <label className="mb-1 block text-[10px] font-bold text-zinc-500">
          تأیید ({verificationOptions.length})
        </label>
        <select
          value={currentVerification}
          onChange={(e) => update("verification", e.target.value)}
          className={selectCls}
        >
          <option value="">همه</option>
          {verificationOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[160px]">
        <label className="mb-1 block text-[10px] font-bold text-zinc-500">
          صنعت ({industries.length})
        </label>
        <select
          value={currentIndustry}
          onChange={(e) => update("industry", e.target.value)}
          className={selectCls}
        >
          <option value="">همه</option>
          {industries.map((i) => (
            <option key={i.key} value={i.key}>
              {i.nameFa}
              {i.nameEn ? ` (${i.nameEn})` : ""}
            </option>
          ))}
        </select>
      </div>

      {hasAny && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100"
        >
          <X className="h-3.5 w-3.5" />
          پاک کردن فیلترها
        </button>
      )}
    </div>
  );
}
