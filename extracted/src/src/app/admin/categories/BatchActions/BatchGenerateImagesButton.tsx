"use client";

import { useState } from "react";
import { Sparkles, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   BatchGenerateImagesButton — FIX-SERVICES-KNOWLEDGE-CATS-BRANDS
   (Part 5).

   Client component. Renders a "تولید تصاویر با AI برای همه
   دسته‌های بدون تصویر" button. On click:
     1. Fetches the list of categories without imageUrl
        (/api/admin/categories/without-images).
     2. For each category, calls
        /api/admin/categories/[id]/generate-image (AI image gen
        + auto-save to DB).
     3. Shows live progress in a modal.

   Sequential execution (each gen takes 20-40s).
   ============================================================ */

type Status = "idle" | "loading" | "running" | "done";

type RowState = {
  id: string;
  name: string;
  status: "pending" | "generating" | "saved" | "error";
  error?: string;
};

export default function BatchGenerateImagesButton({
  layer,
}: {
  layer?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [rows, setRows] = useState<RowState[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const run = async () => {
    if (status === "running" || status === "loading") return;
    if (
      !confirm(
        "تولید تصاویر با AI برای همه دسته‌های بدون تصویر؟ هر دسته ۲۰-۴۰ ثانیه طول می‌کشد. ممکن است چندین دقیقه طول بکشد.",
      )
    ) {
      return;
    }
    setStatus("loading");
    setRows([]);
    try {
      const url = layer
        ? `/api/admin/categories/without-images?limit=50&layer=${encodeURIComponent(layer)}`
        : "/api/admin/categories/without-images?limit=50";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const cats: Array<{ id: string; name: string }> = Array.isArray(json?.categories)
        ? json.categories
        : [];
      if (cats.length === 0) {
        toast({ title: "همه دسته‌ها تصویر دارند." });
        setStatus("idle");
        return;
      }
      setTotalCount(cats.length);
      setRows(cats.map((c) => ({ id: c.id, name: c.name, status: "pending" })));
      setStatus("running");

      let saved = 0;
      let errors = 0;

      for (let i = 0; i < cats.length; i++) {
        const c = cats[i];
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "generating" } : r,
          ),
        );
        try {
          const genRes = await fetch(
            `/api/admin/categories/${c.id}/generate-image`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            },
          );
          const genData = await genRes.json().catch(() => null);
          if (!genRes.ok || !genData?.ok) {
            throw new Error(genData?.error ?? "generate failed");
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
        title: "پایان تولید تصاویر",
        description: `${saved} تصویر ساخته شد، ${errors} خطا.`,
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
  const errorCount = rows.filter((r) => r.status === "error").length;
  const doneCount = savedCount + errorCount;

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
          ? `در حال تولید… (${doneCount}/${totalCount})`
          : "تولید تصاویر با AI برای همه دسته‌های بدون تصویر"}
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
                تولید تصاویر با AI
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
              <span className="text-emerald-600">{savedCount} ساخته شد</span> ·{" "}
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
                    {r.status === "generating" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                    )}
                    {r.status === "saved" && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ساخته شد
                      </span>
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
