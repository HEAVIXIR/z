"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  X,
  Sparkles,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/dictionary — Industrial Persian Dictionary
   List terms + aliases, create new term via modal.
   ============================================================ */

type Alias = {
  id: string;
  alias: string;
  aliasType: string;
  aliasLabel: string;
};

type Term = {
  id: string;
  canonical: string;
  entityType: string | null;
  entityLabel: string | null;
  entityId: string | null;
  description: string | null;
  active: boolean;
  aliases: Alias[];
};

const ENTITY_LABELS: Record<string, string> = {
  MACHINE: "ماشین‌آلات",
  BRAND: "برند",
  MODEL: "مدل",
  PART: "قطعه",
  CATEGORY: "دسته‌بندی",
};

const ALIAS_TYPES = [
  { value: "SYNONYM", label: "مترادف" },
  { value: "COMMON_NAME", label: "نام رایج" },
  { value: "ENGLISH", label: "انگلیسی" },
  { value: "ABBREVIATION", label: "اختصار" },
  { value: "MISSPELLING", label: "املای غلط" },
];

const INPUT_CLS =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#F58220]";

export default function DictionaryPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dictionary");
      const json = await res.json();
      if (json.success) {
        setTerms(json.data || []);
        setStats(json.stats);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <BookMarked className="h-6 w-6 text-[#F58220]" />
            دیکشنری صنعتی فارسی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مدیریت ترجمه، مترادف و نام‌های رایج ماشین‌آلات برای بهبود جستجو
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-3.5 w-3.5" />
            اصطلاح جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="کل اصطلاحات" value={stats.totalTerms} />
          <StatCard label="کل مترادف‌ها" value={stats.totalAliases} tone="emerald" />
          <StatCard label="اصطلاحات فعال" value={stats.activeTerms} tone="blue" />
          <StatCard
            label="میانگین مترادف/اصطلاح"
            value={
              stats.totalTerms > 0
                ? Math.round((stats.totalAliases / stats.totalTerms) * 10) / 10
                : 0
            }
            tone="amber"
          />
        </div>
      )}

      {/* Terms list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : terms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز اصطلاحی ثبت نشده. روی «اصطلاح جدید» کلیک کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-zinc-900">
                      {t.canonical}
                    </h3>
                    {t.entityLabel && (
                      <span className="rounded-full bg-[#F58220]/10 px-2 py-0.5 text-[10px] font-bold text-[#F58220]">
                        {t.entityLabel}
                      </span>
                    )}
                    {!t.active && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                        غیرفعال
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="mt-1 text-xs text-zinc-500">{t.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-zinc-400">
                  {toFa(t.aliases.length)} مترادف
                </span>
              </div>

              {t.aliases.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                  {t.aliases.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600"
                    >
                      <Tag className="h-3 w-3 text-[#F58220]" />
                      {a.alias}
                      <span className="text-[9px] text-zinc-400">
                        ({a.aliasLabel})
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <CreateTermModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "red" | "amber" | "blue";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function CreateTermModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [canonical, setCanonical] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [description, setDescription] = useState("");
  const [aliases, setAliases] = useState<Array<{ alias: string; aliasType: string }>>([
    { alias: "", aliasType: "SYNONYM" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canonical.trim()) {
      setError("عنوان اصلی الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical: canonical.trim(),
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          description: description || undefined,
          aliases: aliases.filter((a) => a.alias.trim()),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "خطا در ثبت");
      }
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? "خطای سرور");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-zinc-900">ایجاد اصطلاح جدید</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              عنوان اصلی (Canonical) <span className="text-red-500">*</span>
            </label>
            <input
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              placeholder="مثال: بیل مکانیکی"
              className={INPUT_CLS}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                نوع موجودیت
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">—</option>
                {Object.entries(ENTITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-600">
                شناسه موجودیت (اختیاری)
              </label>
              <input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="ID در دیتابیس"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-600">
              توضیحات
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          {/* Aliases */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-600">مترادف‌ها</label>
              <button
                type="button"
                onClick={() =>
                  setAliases((a) => [...a, { alias: "", aliasType: "SYNONYM" }])
                }
                className="inline-flex items-center gap-1 rounded-lg bg-[#F58220]/10 px-2 py-1 text-[11px] font-bold text-[#F58220] hover:bg-[#F58220]/20"
              >
                <Plus className="h-3 w-3" />
                افزودن مترادف
              </button>
            </div>
            <div className="space-y-2">
              {aliases.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={a.alias}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAliases((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, alias: v } : x)),
                      );
                    }}
                    placeholder="مثال: اکسکاواتور"
                    className={INPUT_CLS}
                  />
                  <select
                    value={a.aliasType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAliases((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, aliasType: v } : x)),
                      );
                    }}
                    className="h-11 shrink-0 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-[#F58220]"
                  >
                    {ALIAS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setAliases((arr) => arr.filter((_, j) => j !== i))
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              ثبت اصطلاح
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
