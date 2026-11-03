"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Upload,
  Trash2,
  Copy,
  Search,
  Image as ImageIcon,
  Check,
  ExternalLink,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/media — Media Library Browser (FIX-MEDIA)

   Repurposed from the previous useless central manager.
   Now scans /public/uploads/ recursively and shows every
   image with copy-URL + open-in-new-tab actions. Also still
   allows uploads to the shared /api/admin/upload endpoint.
============================================================ */

type MediaFile = {
  url: string;
  filename: string;
  size: number;
  mtime: string;
  dir: string;
};

export default function MediaManagerClient() {
  const [items, setItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/media-library", { cache: "no-store" });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "بارگذاری رسانه‌ها ناموفق بود.");
      }
      const data = await res.json();
      setItems(Array.isArray(data.files) ? data.files : []);
    } catch (err: any) {
      setError(err?.message ?? "خطا در بارگذاری.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "آپلود ناموفق بود.");
        }
      }
      await load();
    } catch (err: any) {
      setError(err?.message ?? "خطا در آپلود.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  const filtered = items.filter(
    (i) =>
      !search ||
      i.filename.includes(search) ||
      i.url.includes(search) ||
      i.dir.includes(search),
  );

  const totalBytes = items.reduce((s, i) => s + i.size, 0);
  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">کتابخانه رسانه</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {toFa(items.length)} فایل · {fmtSize(totalBytes)} · همه تصاویر
            آپلودشده در `/public/uploads/`
          </p>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          آپلود فایل
          <input
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
            accept="image/*"
          />
        </label>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
        هر بخش از سایت رسانه مستقل خودش را دارد (هیرو، هدر، فوتر، برند،
        دسته، آگهی، مقاله). این صفحه فقط مرورگر کتابخانه است — برای
        تغییر تصاویر هر بخش به ویرایشگر همان بخش بروید.
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-zinc-200 bg-white px-4">
        <Search className="h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی فایل یا مسیر..."
          className="mr-2 h-full flex-1 bg-transparent text-sm text-zinc-900 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-500">
            {search ? "رسانه‌ای با این فیلتر یافت نشد." : "هنوز فایلی آپلود نشده است."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m) => (
            <div
              key={m.url}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white"
            >
              <div className="aspect-square overflow-hidden bg-zinc-100">
                <img
                  src={m.url}
                  alt={m.filename}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-2.5">
                <p className="truncate text-[11px] font-bold text-zinc-700" title={m.filename}>
                  {m.filename}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-400" dir="ltr">
                  {m.dir} · {fmtSize(m.size)}
                </p>
                <p className="truncate text-[9px] text-zinc-400" dir="ltr" title={m.url}>
                  {m.url}
                </p>
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => copyUrl(m.url)}
                    className="flex-1 rounded-lg bg-zinc-100 py-1.5 text-[10px] font-bold text-zinc-600 transition hover:bg-zinc-200"
                    title="کپی URL"
                  >
                    {copied === m.url ? (
                      <Check className="mx-auto h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="mx-auto h-3 w-3" />
                    )}
                  </button>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg bg-zinc-100 py-1.5 text-center text-[10px] font-bold text-zinc-600 transition hover:bg-zinc-200"
                    title="باز کردن"
                  >
                    <ExternalLink className="mx-auto h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
