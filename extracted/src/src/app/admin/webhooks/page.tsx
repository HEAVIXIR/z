"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook as WebhookIcon,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  Power,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /admin/webhooks — Manage outbound webhooks.
   ============================================================ */

type Delivery = {
  id: string;
  event: string;
  payload: string;
  statusCode: number | null;
  success: boolean;
  error: string | null;
  createdAt: string;
};

type Webhook = {
  id: string;
  url: string;
  events: string;
  secret: string | null;
  active: boolean;
  lastDeliveryAt: string | null;
  failureCount: number;
  createdAt: string;
  deliveries: Delivery[];
};

const EVENT_PRESETS = [
  "LISTING_CREATED",
  "LISTING_UPDATED",
  "LISTING_SOLD",
  "REVIEW_POSTED",
  "OFFER_SUBMITTED",
  "RFQ_CREATED",
  "USER_REGISTERED",
  "TRANSACTION_COMPLETED",
];

export default function AdminWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("LISTING_CREATED");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/webhooks");
      const json = await res.json();
      setWebhooks(json.webhooks || []);
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
    if (!url.trim() || !url.startsWith("http")) {
      showToast("URL معتبر وارد کنید");
      return;
    }
    if (!events.trim()) {
      showToast("رویدادها الزامی است");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events, secret: secret || undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("وب‌هوک ساخته شد ✓");
        setUrl("");
        setEvents("LISTING_CREATED");
        setSecret("");
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

  const del = async (id: string) => {
    if (!confirm("آیا از حذف این وب‌هوک مطمئن هستید؟")) return;
    try {
      await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
      showToast("وب‌هوک حذف شد");
      await load();
    } catch {
      showToast("خطا");
    }
  };

  const toggle = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      await load();
    } catch {
      showToast("خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <WebhookIcon className="h-6 w-6 text-[#F58220]" />
            وب‌هوک‌ها
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            ارسال خودکار رویدادهای هویکس به URLهای خارجی
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
            وب‌هوک جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="کل" value={stats.total} />
          <StatCard label="فعال" value={stats.active} tone="emerald" />
          <StatCard label="غیرفعال" value={stats.inactive} tone="red" />
          <StatCard label="کل ارسال‌ها" value={stats.deliveries} />
          <StatCard label="موفق" value={stats.ok} tone="emerald" />
          <StatCard label="ناموفق" value={stats.failed} tone="red" />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-black text-zinc-900">
            ساخت وب‌هوک جدید
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">
                URL مقصد *
              </label>
              <input
                type="url"
                dir="ltr"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">
                رویدادها (با کاما جدا کنید) *
              </label>
              <input
                type="text"
                dir="ltr"
                value={events}
                onChange={(e) => setEvents(e.target.value)}
                placeholder="LISTING_CREATED,LISTING_SOLD"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EVENT_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() =>
                      setEvents((p) => (p ? `${p},${e}` : e))
                    }
                    className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[10px] text-zinc-600 hover:border-[#F58220]/40"
                  >
                    + {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-500">
                رمز (اختیاری — برای امضای HMAC)
              </label>
              <input
                type="text"
                dir="ltr"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="خالی بگذارید تا خودکار ساخته شود"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#F58220] focus:outline-none"
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              ساخت وب‌هوک
            </button>
          </div>
        </form>
      )}

      {/* Webhooks list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <WebhookIcon className="mx-auto mb-3 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">هنوز وب‌هوکی ثبت نشده.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => {
            const isOpen = openId === w.id;
            return (
              <div
                key={w.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  w.active ? "border-zinc-200" : "border-zinc-300 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          w.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {w.active ? "فعال" : "غیرفعال"}
                      </span>
                      {w.failureCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          <XCircle className="h-3 w-3" />
                          {toFa(w.failureCount)} خطا
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        ساخته شده {timeAgo(w.createdAt)}
                      </span>
                    </div>
                    <code
                      dir="ltr"
                      className="block truncate font-mono text-xs text-zinc-700"
                    >
                      {w.url}
                    </code>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.events.split(",").map((e, i) => (
                        <span
                          key={i}
                          className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700"
                        >
                          {e.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => toggle(w.id, w.active)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#F58220]"
                      title={w.active ? "غیرفعال کردن" : "فعال‌سازی"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => del(w.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setOpenId(isOpen ? null : w.id)}
                  className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#F58220] hover:underline"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronLeft className="h-3 w-3" />
                  )}
                  تاریخچه ارسال ({toFa(w.deliveries.length)})
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                    {w.deliveries.length === 0 ? (
                      <p className="text-xs text-zinc-400">هنوز ارسالی ثبت نشده.</p>
                    ) : (
                      w.deliveries.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-start gap-2 rounded-lg border border-zinc-100 p-2 text-[11px]"
                        >
                          {d.success ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-blue-700">{d.event}</code>
                              <span className="text-zinc-400">·</span>
                              <span className="text-zinc-500">
                                {d.statusCode ? `HTTP ${d.statusCode}` : "—"}
                              </span>
                              <span className="ml-auto text-zinc-400">
                                {timeAgo(d.createdAt)}
                              </span>
                            </div>
                            {d.error && (
                              <p className="mt-0.5 text-red-500">{d.error}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
      <p className={`text-xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
