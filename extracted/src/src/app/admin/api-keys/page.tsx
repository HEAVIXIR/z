"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  Copy,
  CheckCircle2,
  Power,
} from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/api-keys — Manage public API keys.
   ============================================================ */

type ApiKey = {
  id: string;
  key: string;
  name: string;
  scopes: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("listings:read");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      const json = await res.json();
      setKeys(json.keys || []);
      setStats(json.stats);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("نام کلید الزامی است");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });
      const json = await res.json();
      if (json.ok) {
        setNewKey(json.apiKey.key);
        showToast("کلید جدید ساخته شد ✓");
        setName("");
        setScopes("listings:read");
        setShowForm(false);
        await load();
      } else {
        showToast(json.error ?? "خطا");
      }
    } catch {
      showToast("خطا در ارتباط با سرور");
    }
    setSaving(false);
  };

  const revoke = async (id: string) => {
    if (!confirm("آیا از ابطال این کلید مطمئن هستید؟")) return;
    try {
      await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
      showToast("کلید ابطال شد");
      await load();
    } catch {
      showToast("خطا در حذف");
    }
  };

  const toggle = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      await load();
    } catch {
      showToast("خطا");
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Key className="h-6 w-6 text-[#F58220]" />
            پلتفرم API عمومی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مدیریت کلیدهای API عمومی برای دسترسی توسعه‌دهندگان به داده‌های هویکس
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            به‌روزرسانی
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            کلید جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="کل کلیدها" value={stats.total} />
          <StatCard label="فعال" value={stats.active} tone="emerald" />
          <StatCard label="غیرفعال" value={stats.inactive} tone="red" />
        </div>
      )}

      {/* New key banner */}
      {newKey && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            کلید جدید ساخته شد — این کلید را کپی کنید (فقط یک‌بار نمایش داده می‌شود)
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 truncate rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800"
            >
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-black text-zinc-900">
            ساخت کلید API جدید
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">
                نام کلید *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: اپلیکیشن موبایل"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">
                حوزه‌ها (با کاما جدا کنید)
              </label>
              <input
                type="text"
                dir="ltr"
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                placeholder="listings:read, reviews:write"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              "listings:read",
              "listings:write",
              "reviews:read",
              "reviews:write",
              "categories:read",
              "brands:read",
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScopes((p) => (p ? `${p},${s}` : s))}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[10px] text-zinc-600 hover:border-[#F58220]/40"
              >
                + {s}
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              ساخت کلید
            </button>
          </div>
        </form>
      )}

      {/* Keys table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Key className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز کلیدی ساخته نشده.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">نام</th>
                <th className="px-4 py-3 font-bold">کلید</th>
                <th className="px-4 py-3 font-bold">حوزه‌ها</th>
                <th className="px-4 py-3 font-bold">وضعیت</th>
                <th className="px-4 py-3 font-bold">آخرین استفاده</th>
                <th className="px-4 py-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-bold text-zinc-800">{k.name}</td>
                  <td className="px-4 py-3">
                    <code dir="ltr" className="font-mono text-[11px] text-zinc-500">
                      {k.key}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.split(",").map((s, i) => (
                        <span
                          key={i}
                          className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700"
                        >
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        k.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {k.active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">
                    {k.lastUsedAt ? timeAgo(k.lastUsedAt) : "هرگز"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggle(k.id, k.active)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#F58220]"
                        title={k.active ? "غیرفعال کردن" : "فعال‌سازی"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => revoke(k.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Docs link */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-xs leading-6 text-blue-700">
          📖 برای مشاهدهٔ مستندات API عمومی و فهرست اندپوینت‌ها به صفحهٔ{" "}
          <a href="/api-docs" className="font-bold underline">
            مستندات API
          </a>{" "}
          مراجعه کنید.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
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
  tone?: "default" | "emerald" | "red";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
      <p className={`text-xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
