"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderTree, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toFa } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   /admin/home/categories — admin config for which category
   generation the homepage MachineCategoriesSection renders.
   FIX-SERVICES-KNOWLEDGE-CATS-BRANDS (Part 5).
   ============================================================ */

type L1Child = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
};

type PreviewCat = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  listingCount: number;
};

export default function AdminHomeCategoriesPage() {
  const [generation, setGeneration] = useState<1 | 2>(1);
  const [parentId, setParentId] = useState<string | null>(null);
  const [l1Children, setL1Children] = useState<L1Child[]>([]);
  const [preview, setPreview] = useState<PreviewCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/home/categories", { cache: "no-store" });
      const json = await res.json();
      if (json?.config) {
        setGeneration(json.config.generation === 2 ? 2 : 1);
        setParentId(json.config.parentId ?? null);
      }
      if (Array.isArray(json?.l1Children)) setL1Children(json.l1Children);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch preview whenever generation or parentId changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL("/api/taxonomy", window.location.origin);
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        // Find machinery root
        const machinery = (json?.catalogRoots ?? []).find(
          (r: any) => r.slug === "machinery",
        );
        if (!machinery) {
          setPreview([]);
          return;
        }
        if (generation === 1) {
          // Show L1 children of machinery root
          const l1 = (machinery.children ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            nameEn: c.nameEn ?? null,
            slug: c.slug,
            icon: c.icon ?? null,
            imageUrl: null,
            listingCount: 0,
          }));
          setPreview(l1);
        } else if (generation === 2 && parentId) {
          // Show L2 children of the selected L1 parent
          const l1Node = (machinery.children ?? []).find(
            (c: any) => c.id === parentId,
          );
          const l2 = (l1Node?.children ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            nameEn: c.nameEn ?? null,
            slug: c.slug,
            icon: c.icon ?? null,
            imageUrl: null,
            listingCount: 0,
          }));
          setPreview(l2);
        } else {
          setPreview([]);
        }
      } catch {
        if (!cancelled) setPreview([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [generation, parentId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/home/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generation,
          parentId: generation === 2 ? parentId : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "ذخیره ناموفق بود.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "تنظیمات ذخیره شد" });
    } catch (e: any) {
      toast({
        title: "خطا",
        description: e?.message ?? "ذخیره ناموفق بود.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <FolderTree className="h-6 w-6 text-[#F58220]" />
          دسته‌بندی صفحه اصلی
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          تنظیم نسل دسته‌هایی که در صفحه اصلی نمایش داده می‌شوند — نسل ۱
          (فرزندان مستقیم ریشه ماشین‌آلات) یا نسل ۲ (نوه‌های یک دسته والد).
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">پیکربندی</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">
              نسل دسته‌ها
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setGeneration(1)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  generation === 1
                    ? "border-[#F58220] bg-[#F58220]/5 text-[#F58220]"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                نسل ۱ — فرزندان مستقیم ماشین‌آلات
                <span className="mt-1 block text-[10px] font-normal text-zinc-400">
                  لودر، بیل مکانیکی، گریدر، ...
                </span>
              </button>
              <button
                onClick={() => setGeneration(2)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  generation === 2
                    ? "border-[#F58220] bg-[#F58220]/5 text-[#F58220]"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                نسل ۲ — نوه‌های یک دسته والد
                <span className="mt-1 block text-[10px] font-normal text-zinc-400">
                  زیرخانواده‌های یک دسته L1 خاص
                </span>
              </button>
            </div>
          </div>

          {generation === 2 && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-500">
                دسته والد (L1) — زیرمجموعه‌های این دسته نمایش داده می‌شوند
              </label>
              <select
                value={parentId ?? ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
              >
                <option value="">— انتخاب کنید —</option>
                {l1Children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.nameEn ? ` (${c.nameEn})` : ""}
                  </option>
                ))}
              </select>
              {l1Children.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  هیچ دسته L1ی زیر ریشه ماشین‌آلات یافت نشد.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={save}
              disabled={saving || (generation === 2 && !parentId)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "در حال ذخیره..." : saved ? "ذخیره شد!" : "ذخیره"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-black text-zinc-900">پیش‌نمایش</h2>
        <p className="mb-4 text-xs text-zinc-500">
          {toFa(preview.length)} دسته نمایش داده می‌شود — همین لیست در صفحه
          اصلی ظاهر می‌شود (با انیمیشن ورود کارت‌ها).
        </p>
        {preview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
            {generation === 2 && !parentId
              ? "یک دسته والد انتخاب کنید."
              : "دسته‌ای برای نمایش یافت نشد."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {preview.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg">
                  {c.icon ?? "📁"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-700">
                    {c.name}
                  </p>
                  {c.nameEn && (
                    <p className="truncate text-[10px] text-zinc-400" dir="ltr">
                      {c.nameEn}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-800">
        ℹ برای افزودن/ویرایش تصاویر دسته‌ها به{" "}
        <a
          href="/admin/categories"
          className="font-bold underline hover:text-blue-900"
        >
          مدیریت دسته‌ها
        </a>{" "}
        بروید. دکمه «تولید تصاویر با AI برای همه دسته‌های بدون تصویر» در همان
        صفحه موجود است.
      </div>
    </div>
  );
}
