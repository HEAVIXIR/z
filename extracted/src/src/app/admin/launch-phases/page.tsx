"use client";

import { useState, useEffect } from "react";
import {
  Rocket, Loader2, Check, Target, TrendingUp,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /admin/launch-phases — Launch phase tracker (Priority #65)
   ============================================================ */

type Phase = {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  progress: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "در انتظار", cls: "bg-zinc-100 text-zinc-500" },
  ACTIVE: { label: "فعال", cls: "bg-emerald-100 text-emerald-700" },
  COMPLETED: { label: "تکمیل‌شده", cls: "bg-blue-100 text-blue-700" },
};

export default function LaunchPhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/launch-phases");
      const json = await res.json();
      if (json.success) setPhases(json.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (phase: number, status: string) => {
    await fetch("/api/admin/launch-phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, status }),
    });
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Rocket className="h-6 w-6 text-[#F58220]" />
          مراحل راه‌اندازی هویکس
        </h1>
        <p className="mt-1 text-sm text-zinc-500">پیگیری پیشرفت فازهای راه‌اندازی مارکت‌پلیس</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xl font-black text-zinc-900">{toFa(phases.length)}</p>
          <p className="text-[11px] text-zinc-500">کل فازها</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xl font-black text-emerald-600">{toFa(phases.filter(p => p.status === "COMPLETED").length)}</p>
          <p className="text-[11px] text-zinc-500">تکمیل‌شده</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xl font-black text-amber-600">{toFa(phases.filter(p => p.status === "ACTIVE").length)}</p>
          <p className="text-[11px] text-zinc-500">فعال</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xl font-black text-zinc-500">{toFa(phases.filter(p => p.status === "PENDING").length)}</p>
          <p className="text-[11px] text-zinc-500">در انتظار</p>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-4">
        {phases.map((p) => {
          const sCfg = STATUS_CFG[p.status] ?? { label: p.status, cls: "bg-zinc-100 text-zinc-500" };
          return (
            <div key={p.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Phase number */}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black ${
                  p.status === "COMPLETED" ? "bg-blue-500 text-white" :
                  p.status === "ACTIVE" ? "bg-[#F58220] text-white" :
                  "bg-zinc-100 text-zinc-400"
                }`}>
                  {p.status === "COMPLETED" ? <Check className="h-6 w-6" /> : toFa(p.phase)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-zinc-900">{p.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sCfg.cls}`}>{sCfg.label}</span>
                  </div>
                  {p.description && <p className="mt-1 text-xs text-zinc-400">{p.description}</p>}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">
                        <Target className="inline h-3 w-3" /> {toFa(p.currentValue)} / {toFa(p.targetValue)}
                      </span>
                      <span className="font-bold text-[#F58220]">{toFa(p.progress)}٪</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.progress >= 100 ? "bg-blue-500" : "bg-[#F58220]"
                        }`}
                        style={{ width: `${Math.min(100, p.progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    {p.status !== "ACTIVE" && (
                      <button
                        onClick={() => updateStatus(p.phase, "ACTIVE")}
                        className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-100"
                      >
                        فعال کردن
                      </button>
                    )}
                    {p.status !== "COMPLETED" && (
                      <button
                        onClick={() => updateStatus(p.phase, "COMPLETED")}
                        className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
                      >
                        تکمیل‌شده
                      </button>
                    )}
                    {p.status !== "PENDING" && (
                      <button
                        onClick={() => updateStatus(p.phase, "PENDING")}
                        className="rounded-lg bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-500 transition hover:bg-zinc-100"
                      >
                        در انتظار
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
