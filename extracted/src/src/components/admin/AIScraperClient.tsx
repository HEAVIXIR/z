"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Plus,
  CheckCircle2,
  Phone,
  Image as ImageIcon,
  Sparkles,
  Upload,
} from "lucide-react";
import { toFa, formatCompactPrice } from "@/lib/format";

type Suggestion = {
  title: string;
  price?: string | null;
  phone?: string | null;
  images?: string[];
  url?: string;
  source?: string;
  brandName?: string | null;
  categoryName?: string | null;
  selected?: boolean;
};

export default function AIScraperClient() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [imported, setImported] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setSuggestions([]);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "search", query }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setMessage(`${toFa(data.suggestions.length)} نتیجه از هوش مصنوعی یافت شد.`);
      } else {
        setMessage("نتیجه‌ای یافت نشد.");
      }
    } catch (e: any) {
      setError(e?.message ?? "خطا در جستجو.");
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (idx: number) => {
    const s = suggestions[idx];
    setImporting(`${idx}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", suggestion: s }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImported([...imported, `${idx}`]);
      setMessage(`آگهی "${s.title}" با موفقیت وارد شد.`);
    } catch (e: any) {
      setError(e?.message ?? "خطا در واردسازی.");
    } finally {
      setImporting(null);
    }
  };

  const handleBulkImport = async () => {
    setBulkImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk-import", suggestions }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(`${toFa(data.imported?.length ?? 0)} آگهی وارد شد.`);
      setImported(suggestions.map((_, i) => `${i}`));
    } catch (e: any) {
      setError(e?.message ?? "خطا در واردسازی گروهی.");
    } finally {
      setBulkImporting(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSuggestions((arr) =>
      arr.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s)),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">اسکرپر هوش مصنوعی</h1>
        <p className="mt-1 text-sm text-zinc-500">
          با هوش مصنوعی دستگاه‌ها را از وب (Divar، Sheypoor و سایر منابع) پیدا و
          به‌صورت خودکار به‌عنوان آگهی وارد کنید.
        </p>
      </div>

      {/* Search box */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <label className="mb-2 block text-xs font-bold text-zinc-700">
          عبارت جستجو
        </label>
        <div className="flex gap-2">
          <div className="flex h-12 flex-1 items-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 px-4">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="مثلاً بیل مکانیکی کاترپیلار ۳۲۰"
              className="mr-2 h-full flex-1 bg-transparent text-sm text-zinc-900 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            جستجوی هوشمند
          </button>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          هوش مصنوعی وب را می‌گردد، نتایج مرتبط را پیدا می‌کند و آن‌ها را به‌صورت ساختاریافته درمی‌آورد.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* Bulk import action */}
      {suggestions.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm text-zinc-700">
            {toFa(suggestions.filter((s) => s.selected).length)} انتخاب‌شده از{" "}
            {toFa(suggestions.length)} نتیجه
          </p>
          <button
            type="button"
            onClick={handleBulkImport}
            disabled={bulkImporting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {bulkImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            واردسازی گروهی
          </button>
        </div>
      )}

      {/* Suggestion cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {suggestions.map((s, idx) => {
          const isImported = imported.includes(`${idx}`);
          return (
            <div
              key={idx}
              className={`overflow-hidden rounded-2xl border bg-white transition ${
                s.selected
                  ? "border-[#F58220] ring-2 ring-[#F58220]/20"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex gap-4 p-4">
                {/* Image */}
                <button
                  type="button"
                  onClick={() => toggleSelect(idx)}
                  className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100"
                >
                  {s.images && s.images[0] ? (
                     
                    <img
                      src={s.images[0]}
                      alt={s.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-zinc-300" />
                    </div>
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-bold text-zinc-900">
                      {s.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleSelect(idx)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                        s.selected
                          ? "border-[#F58220] bg-[#F58220] text-white"
                          : "border-zinc-300 bg-white text-transparent hover:border-[#F58220]"
                      }`}
                    >
                      {s.selected && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    {s.brandName && (
                      <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 font-bold text-[#F58220]">
                        {s.brandName}
                      </span>
                    )}
                    {s.categoryName && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                        {s.categoryName}
                      </span>
                    )}
                    {s.source && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                        {s.source}
                      </span>
                    )}
                  </div>

                  {s.price && (
                    <p className="mt-2 text-sm font-black text-[#F58220]">
                      {formatCompactPrice(Number(s.price))}
                    </p>
                  )}

                  {s.phone && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-700">
                      <Phone className="h-3.5 w-3.5 text-[#F58220]" />
                      <span dir="ltr">{s.phone}</span>
                    </p>
                  )}

                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-[10px] text-blue-600 hover:underline"
                      dir="ltr"
                    >
                      {s.url}
                    </a>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleImport(idx)}
                      disabled={importing === `${idx}` || isImported}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#F58220] px-3 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
                    >
                      {isImported ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          وارد شد
                        </>
                      ) : importing === `${idx}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          واردسازی
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
