"use client";

import { useState } from "react";
import { Sparkles, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   BatchLogoSearchButton — FIX-SERVICES-KNOWLEDGE-CATS-BRANDS
   (Part 6).

   Client component. Renders a "جستجوی لوگو با AI برای همه
   برندهای بدون لوگو" button. On click:
     1. Fetches the list of brands without logoUrl
        (/api/admin/brands/without-logos).
     2. For each brand, calls /api/admin/brands/[id]/search-logo
        (AI image search). If at least one candidate is returned,
        auto-selects the first by PUTting it to
        /api/admin/brands/[id]/logo.
     3. Shows live progress in a modal.

   The batch runs sequentially because each AI search takes
   3-10s; parallelizing would overwhelm the AI gateway and the
   browser's connection limit.
   ============================================================ */

type Status = "idle" | "loading" | "running" | "done";

type RowState = {
  id: string;
  name: string;
  status: "pending" | "searching" | "saved" | "no-result" | "error";
  error?: string;
};

export default function BatchLogoSearchButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [rows, setRows] = useState<RowState[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const run = async () => {
    if (status === "running" || status === "loading") return;
    if (
      !confirm(
        "جستجوی لوگو با AI برای همه برندهای بدون لوگو؟ هر برند ۳-۱۰ ثانیه طول می‌کشد. ممکن است چند دقیقه طول بکشد.",
      )
    ) {
      return;
    }
    setStatus("loading");
    setRows([]);
    try {
      const res = await fetch("/api/admin/brands/without-logos?limit=50", {
        cache: "no-store",
      });
      const json = await res.json();
      const brands: Array<{ id: string; name: string }> = Array.isArray(json?.brands)
        ? json.brands
        : [];
      if (brands.length === 0) {
        toast({ title: "همه برندها لوگو دارند." });
        setStatus("idle");
        return;
      }
      setTotalCount(brands.length);
      setRows(brands.map((b) => ({ id: b.id, name: b.name, status: "pending" })));
      setStatus("running");

      let saved = 0;
      let noResult = 0;
      let errors = 0;

      for (let i = 0; i < brands.length; i++) {
        const b = brands[i];
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "searching" } : r)),
        );
        try {
          const searchRes = await fetch(
            `/api/admin/brands/${b.id}/search-logo`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            },
          );
          const searchData = await searchRes.json().catch(() => null);
          if (!searchRes.ok || !searchData?.ok) {
            throw new Error(searchData?.error ?? "search failed");
          }
          const results: any[] = Array.isArray(searchData?.results)
            ? searchData.results
            : [];
          if (results.length === 0) {
            noResult++;
            setRows((prev) =>
              prev.map((r, idx) =>
                idx === i ? { ...r, status: "no-result" } : r,
              ),
            );
            continue;
          }
          // Auto-select the first result
          const firstUrl = String(results[0]?.url ?? "");
          if (!firstUrl) {
            noResult++;
            setRows((prev) =>
              prev.map((r, idx) =>
                idx === i ? { ...r, status: "no-result" } : r,
              ),
            );
            continue;
          }
          const putRes = await fetch(`/api/admin/brands/${b.id}/logo`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoUrl: firstUrl }),
          });
          const putData = await putRes.json().catch(() => null);
          if (!putRes.ok || !putData?.ok) {
            throw new Error(putData?.error ?? "save failed");
          }
          saved++;
          setRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: "saved" } : r)),
          );
        } catch (e: any) {
          errors++;
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "error", error: e?.message ?? "error" }
                : r,
            ),
          );
        }
      }

      setStatus("done");
      toast({
        title: "پایان جستجوی لوگو",
        description: `${saved} ذخیره شد، ${noResult} نتیجه‌ای نداشت، ${errors} خطا.`,
      });
    } catch (e: any) {
      setStatus("idle");
      toast({
        title: "خطا",
        description: e?.message ?? "خطای شبکه",
        variant: "destructive",
      });
    }
  };

  const savedCount = rows.filter((r) => r.status === "saved").length;
  const noResultCount = rows.filter((r) => r.status === "no-result").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const doneCount = savedCount + noResultCount + errorCount;

  return (
    <>
      <button
        onClick={run}
        disabled={status === "running" || status === "loading"}
        className="inline-flex items-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
      >
        {status === "running" || status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {status === "running"
          ? `در حال پردازش… (${doneCount}/${totalCount})`
          : "جستجوی لوگو با AI برای همه برندهای بدون لوگو"}
      </button>

      {(status === "running" || status === "done") && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={status === "done" ? () => setStatus("idle") : undefined}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-zinc-900">
                <Sparkles className="h-5 w-5 text-purple-600" />
                جستجوی لوگو با AI
              </h2>
              {status === "done" && (
                <button
                  onClick={() => {
                    setStatus("idle");
                    window.location.reload();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3 text-xs font-bold text-zinc-600">
              پیشرفت: {doneCount} از {totalCount} ·{" "}
              <span className="text-emerald-600">{savedCount} ذخیره</span> ·{" "}
              <span className="text-amber-600">{noResultCount} بدون نتیجه</span> ·{" "}
              <span className="text-red-600">{errorCount} خطا</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-3">
              <ul className="space-y-1">
                {rows.map((r, idx) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
                  >
                    <span className="w-6 text-zinc-400">{idx + 1}.</span>
                    <span className="flex-1 truncate text-zinc-700">{r.name}</span>
                    {r.status === "pending" && (
                      <span className="text-zinc-400">در انتظار</span>
                    )}
                    {r.status === "searching" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                    )}
                    {r.status === "saved" && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ذخیره
                      </span>
                    )}
                    {r.status === "no-result" && (
                      <span className="text-amber-600">بدون نتیجه</span>
                    )}
                    {r.status === "error" && (
                      <span
                        className="inline-flex items-center gap-1 text-red-600"
                        title={r.error}
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> خطا
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {status === "done" && (
              <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4">
                <button
                  onClick={() => {
                    setStatus("idle");
                    window.location.reload();
                  }}
                  className="rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
                >
                  بستن و بازخوانی
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
