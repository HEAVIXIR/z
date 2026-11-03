"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/policies — Policy / permission engine.
   Light theme admin page.
   ============================================================ */

type Policy = {
  id: string;
  key: string;
  description: string | null;
  allowedRoles: string | null;
  enabled: boolean;
  createdAt: string;
};

const ROLE_PRESETS = ["ADMIN", "SELLER", "BUYER", "COMPANY", "INDIVIDUAL"];

const DEFAULT_POLICIES = [
  { key: "LISTING_CREATE", description: "اجازه ایجاد آگهی", allowedRoles: ["ADMIN", "SELLER", "COMPANY"] },
  { key: "LISTING_DELETE", description: "حذف آگهی", allowedRoles: ["ADMIN"] },
  { key: "AI_GATEWAY_USE", description: "استفاده از دروازه هوش مصنوعی", allowedRoles: ["ADMIN", "SELLER", "BUYER"] },
  { key: "RFQ_CREATE", description: "ایجاد درخواست خرید B2B", allowedRoles: ["ADMIN", "SELLER", "BUYER", "COMPANY"] },
  { key: "AUCTION_BID", description: "شرکت در مزایده", allowedRoles: ["ADMIN", "SELLER", "BUYER"] },
  { key: "EXPORT_DATA", description: "خروجی گرفتن از داده‌ها", allowedRoles: ["ADMIN"] },
  { key: "MANAGE_USERS", description: "مدیریت کاربران", allowedRoles: ["ADMIN"] },
];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    key: "",
    description: "",
    allowedRoles: [] as string[],
    enabled: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/policies");
      const json = await res.json();
      setPolicies(json.policies || []);
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

  const toggle = async (p: Policy) => {
    setSaving(p.id);
    try {
      await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, action: "toggle" }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      allowedRoles: f.allowedRoles.includes(role)
        ? f.allowedRoles.filter((r) => r !== role)
        : [...f.allowedRoles, role],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key.trim()) {
      showToast("کلید سیاست الزامی است");
      return;
    }
    setSaving("form");
    try {
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("سیاست ذخیره شد ✓");
        setForm({ key: "", description: "", allowedRoles: [], enabled: true });
        setShowForm(false);
        await load();
      } else {
        showToast(json.error ?? "خطا در ذخیره");
      }
    } finally {
      setSaving(null);
    }
  };

  const del = async (id: string) => {
    if (!confirm("حذف این سیاست؟")) return;
    try {
      await fetch(`/api/admin/policies?id=${id}`, { method: "DELETE" });
      showToast("سیاست حذف شد");
      await load();
    } catch {
      showToast("خطا در حذف");
    }
  };

  const seedDefaults = async () => {
    setSaving("seed");
    try {
      for (const p of DEFAULT_POLICIES) {
        await fetch("/api/admin/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: p.key,
            description: p.description,
            allowedRoles: p.allowedRoles,
            enabled: true,
          }),
        });
      }
      showToast("سیاست‌های پیش‌فرض اضافه شدند ✓");
      await load();
    } finally {
      setSaving(null);
    }
  };

  const parseRoles = (s: string | null): string[] => {
    if (!s) return [];
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Shield className="h-6 w-6 text-[#F58220]" />
            موتور سیاست‌ها
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مدیریت کلیدها و نقش‌های مجاز برای اعمال دسترسی
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
            onClick={seedDefaults}
            disabled={saving === "seed"}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
          >
            {saving === "seed" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            سیاست‌های پیش‌فرض
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            سیاست جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="کل سیاست‌ها" value={stats.total} />
          <StatCard label="فعال" value={stats.enabled} tone="emerald" />
          <StatCard label="غیرفعال" value={stats.disabled} tone="red" />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-black text-zinc-900">سیاست جدید</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">کلید *</label>
              <input
                type="text"
                value={form.key}
                onChange={(e) =>
                  setForm({ ...form, key: e.target.value.toUpperCase().replace(/\s+/g, "_") })
                }
                placeholder="مثال: LISTING_CREATE"
                dir="ltr"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-mono text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">توضیحات</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-xs font-bold text-zinc-500">
              نقش‌های مجاز
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((r) => {
                const on = form.allowedRoles.includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      on
                        ? "bg-[#F58220] text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
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
              disabled={saving === "form"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving === "form" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              ذخیره
            </button>
          </div>
        </form>
      )}

      {/* Policies list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            هنوز سیاستی تعریف نشده. روی «سیاست‌های پیش‌فرض» بزنید تا مجموعه‌ای
            آماده اضافه شود.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((p) => {
            const roles = parseRoles(p.allowedRoles);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-[#F58220]">
                        {p.key}
                      </code>
                      {p.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                          <XCircle className="h-3 w-3" />
                          غیرفعال
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-2 text-xs text-zinc-600">{p.description}</p>
                    )}
                    {roles.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {roles.map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggle(p)}
                      disabled={saving === p.id}
                      className="flex shrink-0 items-center"
                    >
                      {p.enabled ? (
                        <ToggleRight className="h-9 w-9 text-[#F58220]" />
                      ) : (
                        <ToggleLeft className="h-9 w-9 text-zinc-300" />
                      )}
                    </button>
                    <button
                      onClick={() => del(p.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
