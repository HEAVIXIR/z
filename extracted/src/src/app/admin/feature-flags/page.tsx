"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flag,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Save,
  Sparkles,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/feature-flags — feature flag dashboard
   Toggle enabled/disabled, edit rollout percentage.
   ============================================================ */

type Flag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  rolloutPct: number;
  updatedAt: string;
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { enabled: boolean; rolloutPct: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags");
      const json = await res.json();
      if (json.success) {
        setFlags(json.data || []);
        setStats(json.stats);
        const next: Record<string, { enabled: boolean; rolloutPct: string }> = {};
        for (const f of json.data || []) {
          next[f.key] = { enabled: f.enabled, rolloutPct: String(f.rolloutPct) };
        }
        setDraft(next);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveFlag = async (flag: Flag) => {
    const d = draft[flag.key];
    if (!d) return;
    setSaving(flag.key);
    try {
      await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: flag.key,
          label: flag.label,
          description: flag.description,
          enabled: d.enabled,
          rolloutPct: Number(d.rolloutPct) || 0,
        }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const toggle = (key: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const setRollout = (key: string, value: string) => {
    const v = value.replace(/[^\d]/g, "");
    const n = v === "" ? "" : String(Math.min(100, Math.max(0, Number(v))));
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], rolloutPct: n },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
            <Flag className="h-6 w-6 text-[#F58220]" />
            پرچم‌های ویژگی
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            کنترل فعال/غیرفعال‌سازی ویژگی‌ها و درصد رول‌اوت کاربران
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          به‌روزرسانی
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="کل پرچم‌ها" value={stats.total} />
          <StatCard label="فعال" value={stats.enabled} tone="emerald" />
          <StatCard label="غیرفعال" value={stats.disabled} tone="red" />
          <StatCard label="رول‌اوت جزئی" value={stats.partialRollout} tone="amber" />
        </div>
      )}

      {/* Flags list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : flags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-sm text-zinc-400">پرچمی یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => {
            const d = draft[f.key];
            const dirty =
              d &&
              (d.enabled !== f.enabled ||
                Number(d.rolloutPct) !== f.rolloutPct);
            return (
              <div
                key={f.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-[#F58220]">
                        {f.key}
                      </code>
                      {d?.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          غیرفعال
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-black text-zinc-900">
                      {f.label}
                    </h3>
                    {f.description && (
                      <p className="mt-1 text-xs text-zinc-500">{f.description}</p>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggle(f.key)}
                    className="flex shrink-0 items-center gap-2"
                    aria-label="تغییر وضعیت"
                  >
                    {d?.enabled ? (
                      <ToggleRight className="h-9 w-9 text-[#F58220]" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-zinc-300" />
                    )}
                  </button>
                </div>

                {/* Rollout control */}
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-zinc-500">
                      درصد رول‌اوت:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={Number(d?.rolloutPct ?? 0)}
                        onChange={(e) => setRollout(f.key, e.target.value)}
                        className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[#F58220]"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={d?.rolloutPct ?? "0"}
                        onChange={(e) => setRollout(f.key, e.target.value)}
                        className="h-9 w-16 rounded-lg border border-zinc-200 bg-white px-2 text-center text-sm font-bold text-zinc-800 focus:border-[#F58220] focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">٪</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!dirty || saving === f.key}
                    onClick={() => saveFlag(f)}
                    className={`mr-auto inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      dirty
                        ? "bg-[#F58220] text-white hover:bg-[#ff8c38]"
                        : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {saving === f.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    ذخیره
                  </button>
                </div>
              </div>
            );
          })}
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
  tone?: "default" | "emerald" | "red" | "amber";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-black ${tones[tone]}`}>{toFa(value)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
