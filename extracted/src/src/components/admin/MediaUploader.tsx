"use client";

import { useCallback, useRef, useState } from "react";
import {
  Loader2,
  Upload,
  Trash2,
  Link2,
  Image as ImageIcon,
  AlertCircle,
  X,
} from "lucide-react";

/* ============================================================
   MediaUploader — reusable per-section media manager widget.

   Lets the admin either (a) upload a new image via the public
   /api/upload endpoint, or (b) paste an external URL directly.
   Calls onChange(url) whenever the resulting URL changes.

   Designed theme-agnostic: works on light (zinc/white) surfaces
   AND dark (zinc-900) admin surfaces. Pass `theme="dark"` to
   force dark palette, or `theme="light"` for light; default
   auto-detects via parent surface classes by using only neutral
   zinc tones with low opacity (works on both).

   Props:
     • value      — current image URL (string | null | "")
     • onChange   — (url: string | null) => void
     • label?     — Persian label above the field
     • accept?    — input accept attr (default "image/*")
     • maxSize?   — bytes, default 5MB
     • endpoint?  — upload endpoint (default "/api/upload")
     • theme?     — "light" | "dark" | "auto" (default "auto")
     • hint?      — small helper text under the field
     • compact?   — render a one-line variant (no big preview)
     • removable? — show the remove (حذف) button (default true)
============================================================ */

export interface MediaUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  accept?: string;
  maxSize?: number;
  endpoint?: string;
  theme?: "light" | "dark" | "auto";
  hint?: string;
  compact?: boolean;
  removable?: boolean;
  className?: string;
}

const DEFAULT_MAX = 5 * 1024 * 1024;

export default function MediaUploader({
  value,
  onChange,
  label,
  accept = "image/*",
  maxSize = DEFAULT_MAX,
  endpoint = "/api/upload",
  theme = "auto",
  hint,
  compact = false,
  removable = true,
  className = "",
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const url = (value || "").trim();
  const hasImage = url.length > 0;

  /* ----- Theme-derived class sets ----- */
  // "auto" uses neutral palette that reads well on both light
  // (zinc-50 surface) and dark (zinc-900 surface) backgrounds.
  const isDark = theme === "dark";
  const isLight = theme === "light";
  const surfaceCls = isDark
    ? "border-zinc-700 bg-zinc-800/60"
    : isLight
      ? "border-zinc-200 bg-zinc-50"
      : "border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-800/40";
  const textCls = isDark
    ? "text-zinc-200"
    : isLight
      ? "text-zinc-700"
      : "text-zinc-700 dark:text-zinc-200";
  const mutedCls = isDark
    ? "text-zinc-400"
    : isLight
      ? "text-zinc-500"
      : "text-zinc-500 dark:text-zinc-400";
  const inputCls = isDark
    ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
    : isLight
      ? "border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400"
      : "border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("تنها فایل تصویری مجاز است.");
        return;
      }
      if (file.size > maxSize) {
        setError(
          `حجم فایل بیش از ${Math.floor(maxSize / (1024 * 1024))} مگابایت است.`,
        );
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(endpoint, { method: "POST", body: fd });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.url) {
          throw new Error(json?.error ?? "آپلود ناموفق بود.");
        }
        onChange(json.url);
      } catch (err: any) {
        setError(err?.message ?? "خطای شبکه هنگام آپلود.");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [endpoint, maxSize, onChange],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const commitUrl = () => {
    const v = urlDraft.trim();
    if (!v) {
      setError("آدرس URL خالی است.");
      return;
    }
    onChange(v);
    setUrlDraft("");
    setShowUrlBox(false);
    setError(null);
  };

  const remove = () => {
    onChange(null);
    setUrlDraft("");
    setShowUrlBox(false);
    setError(null);
  };

  /* ----- Compact one-line variant ----- */
  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <label className={`block text-xs font-bold ${mutedCls}`}>{label}</label>
        )}
        <div className={`flex items-center gap-2 rounded-xl border p-1.5 ${surfaceCls}`}>
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/5 ${mutedCls}`}
          >
            {hasImage ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </div>
          <input
            type="text"
            dir="ltr"
            value={url}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://… یا آپلود کنید"
            className={`h-8 flex-1 rounded-lg border bg-transparent px-2 text-xs outline-none focus:border-[#F58220] ${inputCls}`}
          />
          <label
            className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-[#F58220] px-2.5 text-[11px] font-bold text-white transition hover:bg-[#ff8c38] ${uploading ? "opacity-60" : ""}`}
            title="آپلود فایل"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {removable && hasImage && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-red-500 transition hover:bg-red-500 hover:text-white"
              title="حذف"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1 text-[10px] font-bold text-red-500">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}
        {hint && !error && (
          <p className={`text-[10px] ${mutedCls}`}>{hint}</p>
        )}
      </div>
    );
  }

  /* ----- Default (preview + drop zone) variant ----- */
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block text-xs font-bold ${mutedCls}`}>{label}</label>
      )}

      {hasImage ? (
        <div
          className={`relative overflow-hidden rounded-xl border ${surfaceCls}`}
        >
          <div className="aspect-video w-full bg-black/5">
            <img
              src={url}
              alt={label ?? "uploaded"}
              className="h-full w-full object-contain"
              onError={() => setError("بارگذاری پیش‌نمایش ناموفق بود — آدرس تصویر را بررسی کنید.")}
            />
          </div>
          <div className="flex items-center gap-2 border-t border-black/5 px-2.5 py-1.5">
            <code
              dir="ltr"
              className={`flex-1 truncate rounded bg-black/5 px-2 py-1 text-[10px] ${mutedCls}`}
              title={url}
            >
              {url}
            </code>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#F58220] px-2.5 text-[10px] font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
              title="جایگزینی با فایل جدید"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              جایگزینی
            </button>
            {removable && (
              <button
                type="button"
                onClick={remove}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-50 px-2.5 text-[10px] font-bold text-red-600 transition hover:bg-red-500 hover:text-white dark:bg-red-500/10"
                title="حذف تصویر"
              >
                <Trash2 className="h-3 w-3" /> حذف
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition ${
            dragOver
              ? "border-[#F58220] bg-[#F58220]/5"
              : surfaceCls
          } hover:border-[#F58220]/60`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
          ) : (
            <Upload
              className={`h-6 w-6 transition group-hover:text-[#F58220] ${mutedCls}`}
            />
          )}
          <div className={`text-xs font-bold ${textCls}`}>
            {uploading ? "در حال آپلود…" : "فایل را اینجا رها کنید یا کلیک کنید"}
          </div>
          <div className={`text-[10px] ${mutedCls}`}>
            حداکثر {Math.floor(maxSize / (1024 * 1024))} مگابایت · تصویر
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onFileChange}
            className="hidden"
            disabled={uploading}
          />
        </div>
      )}

      {/* URL fallback toggle */}
      {!hasImage && (
        <div className="space-y-1.5">
          {showUrlBox ? (
            <div className={`flex items-center gap-1.5 rounded-xl border p-1.5 ${surfaceCls}`}>
              <Link2 className={`h-4 w-4 ${mutedCls}`} />
              <input
                type="url"
                dir="ltr"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitUrl();
                  }
                }}
                placeholder="https://example.com/image.png"
                className={`h-8 flex-1 rounded-lg border bg-transparent px-2 text-xs outline-none focus:border-[#F58220] ${inputCls}`}
                autoFocus
              />
              <button
                type="button"
                onClick={commitUrl}
                className="inline-flex h-8 items-center rounded-lg bg-zinc-900 px-2.5 text-[10px] font-bold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
              >
                تأیید
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlBox(false);
                  setUrlDraft("");
                  setError(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-zinc-500 hover:bg-black/10"
                title="بستن"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlBox(true)}
              className={`inline-flex items-center gap-1 text-[11px] font-bold ${mutedCls} hover:text-[#F58220]`}
            >
              <Link2 className="h-3 w-3" />
              یا چسباندن URL تصویر
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[10px] font-bold text-red-500">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
      {hint && !error && (
        <p className={`text-[10px] ${mutedCls}`}>{hint}</p>
      )}
    </div>
  );
}
