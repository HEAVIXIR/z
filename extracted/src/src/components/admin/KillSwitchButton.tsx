"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Power, ShieldCheck } from "lucide-react";

/* ============================================================
   KillSwitchButton — big red emergency button for the admin dashboard.
   Toggles KILL_SWITCH_ALL_AI FeatureFlag via /api/admin/feature-flags.
   ============================================================ */

export default function KillSwitchButton() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/feature-flags");
        const json = await res.json();
        const flag = (json.data || []).find((f: any) => f.key === "KILL_SWITCH_ALL_AI");
        if (!cancelled) setEnabled(flag ? flag.enabled : null);
      } catch {
        if (!cancelled) setEnabled(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const toggle = async () => {
    if (enabled === null) return;
    if (enabled && !confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    setConfirming(false);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "KILL_SWITCH_ALL_AI",
          label: "Kill Switch — All AI",
          description:
            "When DISABLED, blocks every AI gateway operation immediately. Use only in emergencies.",
          enabled: !enabled,
          rolloutPct: 100,
        }),
      });
      const json = await res.json();
      if (json.success || json.ok) {
        setEnabled(!enabled);
        showToast(
          !enabled
            ? "✓ AI operations re-enabled."
            : "⛔ ALL AI OPERATIONS BLOCKED.",
        );
      } else {
        showToast(json.error ?? "Failed to toggle kill switch");
      }
    } catch {
      showToast("Network error");
    }
    setBusy(false);
  };

  const isKilled = enabled === false;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition ${
        isKilled
          ? "border-red-400 bg-red-50"
          : "border-red-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isKilled ? "bg-red-600 text-white" : "bg-red-100 text-red-600"
            }`}
          >
            {isKilled ? <Power className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-black text-zinc-900">
              Kill Switch — هوش مصنوعی
            </h3>
            <p className="mt-1 max-w-md text-xs leading-6 text-zinc-600">
              {isKilled
                ? "⛔ تمام عملیات‌های هوش مصنوعی در حال حاضر مسدود شده‌اند. برای فعال‌سازی مجدد، دکمهٔ زیر را بزنید."
                : "در صورت فعال‌سازی اضطراری، تمام درخواست‌های هوش مصنوعی از طریق /api/ai-gateway و /api/ai-search بلافاصله مسدود می‌شوند."}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isKilled
                    ? "bg-red-600 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isKilled ? "bg-white animate-pulse" : "bg-emerald-500"
                  }`}
                />
                {isKilled ? "AI BLOCKED" : "AI ACTIVE"}
              </span>
              {enabled === null && (
                <span className="text-[10px] text-zinc-400">در حال بارگذاری…</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={busy || enabled === null}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition disabled:opacity-50 ${
            isKilled
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : confirming
                ? "animate-pulse bg-red-600 text-white hover:bg-red-700"
                : "border-2 border-red-600 bg-white text-red-600 hover:bg-red-50"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isKilled ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          {isKilled
            ? "فعال‌سازی مجدد AI"
            : confirming
              ? "مجدداً کلیک کنید برای تأیید"
              : "قطع اضطراری AI"}
        </button>
      </div>

      {toast && (
        <div className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
