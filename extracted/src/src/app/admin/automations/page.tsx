"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cog,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Play,
  Clock,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/automations — Automation Registry management.
   Light theme admin page.
   ============================================================ */

type Automation = {
  id: string;
  name: string;
  trigger: string;
  conditions: string | null;
  actions: string | null;
  status: string;
  lastRunAt: string | null;
  failureCount: number;
  createdAt: string;
};

const TRIGGER_PRESETS = [
  "MANUAL",
  "NEW_LISTING",
  "PRICE_DROP",
  "LOW_STOCK",
  "NEW_USER",
  "NEW_RFQ",
  "DAILY",
  "WEEKLY",
];

const DEFAULT_AUTOMATIONS = [
  {
    name: "اعلان آگهی جدید به دنبال‌کنندگان",
    trigger: "NEW_LISTING",
    conditions: '{"featured":true}',
    actions: '{"type":"NOTIFY_FOLLOWERS"}',
  },
  {
    name: "هشدار کاهش قیمت",
    trigger: "PRICE_DROP",
    conditions: '{"dropPct":10}',
    actions: '{"type":"NOTIFY_WATCHERS"}',
  },
  {
    name: "گزارش روزانه فعالیت",
    trigger: "DAILY",
    conditions: '{"hour":8}',
    actions: '{"type":"EMAIL_ADMIN_SUMMARY"}',
  },
  {
    name: "ردیابی آگهی بدون قیمت",
    trigger: "NEW_LISTING",
    conditions: '{"priceMissing":true}',
    actions: '{"type":"CREATE_REJECTION","reason":"NO_PRICE"}',
  },
];

export default function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    trigger: "MANUAL",
    conditions: "",
    actions: "",
    status: "ACTIVE",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/automations");
      const json = await res.json();
      setItems(json.automations || []);
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

  const reset = () => {
    setForm({ name: "", trigger: "MANUAL", conditions: "", actions: "", status: "ACTIVE" });
    setEditId(null);
    setShowForm(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("نام اتوماسیون الزامی است");
      return;
    }
    setSaving("form");
    try {
      const res = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editId }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(editId ? "اتوماسیون به‌روزرسانی شد ✓" : "اتوماسیون ساخته شد ✓");
        reset();
        await load();
      } else {
        showToast(json.error ?? "خطا در ذخیره");
      }
    } finally {
      setSaving(null);
    }
  };

  const toggle = async (a: Automation) => {
    setSaving(a.id);
    try {
      await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, action: "toggle" }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const run = async (a: Automation) => {
    setSaving("run-" + a.id);
    try {
      await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, action: "run" }),
      });
      showToast("اجرا ثبت شد ✓");
      await load();
    } finally {
      setSaving(null);
    }
  };

  const resetFails = async (a: Automation) => {
    setSaving("reset-" + a.id);
    try {
      await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, action: "resetFails" }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const edit = (a: Automation) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      trigger: a.trigger,
      conditions: a.conditions ?? "",
      actions: a.actions ?? "",
      status: a.status,
    });
    setShowForm(true);
  };

  const del = async (id: string) => {
    if (!confirm("حذف این اتوماسیون؟")) return;
    try {
      await fetch(`/api/admin/automations?id=${id}`, { method: "DELETE" });
      showToast("اتوماسیون حذف شد");
      await load();
    } catch {
      showToast("خطا در حذف");
    }
  };

  const seedDefaults = async () => {
    setSaving("seed");
    try {
      for (const a of DEFAULT_AUTOMATIONS) {
        await fetch("/api/admin/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(a),
        });
      }
      showToast("اتوماسیون‌های پیش‌فرض اضافه شدند ✓");
      await load();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Cog className="h-6 w-6 text-[#F58220]" />
            رجیستری اتوماسیون
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            مدیریت گردش‌کارهای خودکار، تریگرها و وضعیت اجرا
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
            پیش‌فرض‌ها
          </button>
          <button
            onClick={() => {
              reset();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            اتوماسیون جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="کل" value={stats.total} />
          <StatCard label="فعال" value={stats.active} tone="emerald" />
          <StatCard label="متوقف" value={stats.paused} tone="amber" />
          <StatCard label="کل خطاها" value={stats.totalFailures} tone="red" />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-black text-zinc-900">
            {editId ? "ویرایش اتوماسیون" : "اتوماسیون جدید"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">نام *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">تریگر</label>
              <select
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              >
                {TRIGGER_PRESETS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">شرط‌ها (JSON)</label>
              <textarea
                rows={3}
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                dir="ltr"
                placeholder='{"featured":true}'
                className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">اکشن‌ها (JSON)</label>
              <textarea
                rows={3}
                value={form.actions}
                onChange={(e) => setForm({ ...form, actions: e.target.value })}
                dir="ltr"
                placeholder='{"type":"NOTIFY"}'
                className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
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
              {editId ? "ذخیره تغییرات" : "ساخت اتوماسیون"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Cog className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            اتوماسیونی ثبت نشده. روی «پیش‌فرض‌ها» بزنید تا نمونه‌ها اضافه شوند.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const isActive = a.status === "ACTIVE";
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-zinc-900">{a.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isActive ? "فعال" : "متوقف"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      تریگر: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700">{a.trigger}</code>
                    </p>
                    {a.lastRunAt && (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400">
                        <Clock className="h-3 w-3" />
                        آخرین اجرا: {timeAgo(a.lastRunAt)}
                      </p>
                    )}
                    {a.failureCount > 0 && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {toFa(a.failureCount)} خطا
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => run(a)}
                      disabled={saving === "run-" + a.id}
                      title="اجرا"
                      className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                    >
                      {saving === "run-" + a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => toggle(a)}
                      disabled={saving === a.id}
                      className="shrink-0"
                      title={isActive ? "توقف" : "فعال‌سازی"}
                    >
                      {isActive ? (
                        <ToggleRight className="h-8 w-8 text-[#F58220]" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-zinc-300" />
                      )}
                    </button>
                    <button
                      onClick={() => edit(a)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#F58220]"
                      title="ویرایش"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {a.failureCount > 0 && (
                      <button
                        onClick={() => resetFails(a)}
                        disabled={saving === "reset-" + a.id}
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                        title="ریست شمارنده خطا"
                      >
                        {saving === "reset-" + a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => del(a.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      title="حذف"
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
  tone?: "default" | "emerald" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
