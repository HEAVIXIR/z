"use client";

import { useState, useCallback } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Bot,
} from "lucide-react";

/* ============================================================
   AIAgentsAdminClient — interactive grid of AI agent cards.
   Fetches the latest agent list on mount, lets the admin run
   any agent, and surfaces the run summary inline.
   ============================================================ */

type Agent = {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  taskType: string;
  active: boolean;
  lastStatus: string | null;
  lastRunAtFa: string | null;
};

type RunResult = {
  ok: boolean;
  summary: string;
  error?: string;
  details?: Record<string, unknown>;
};

export default function AIAgentsAdminClient({
  agents: initialAgents,
}: {
  agents: Agent[];
}) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-agents", { cache: "no-store" });
      if (!res.ok) {
        setError("خطا در دریافت فهرست ایجنت‌ها.");
        return;
      }
      const j = await res.json();
      const next: Agent[] = (j.agents ?? []).map((a: any) => ({
        id: a.id,
        key: a.key,
        nameFa: a.nameFa,
        nameEn: a.nameEn ?? null,
        description: a.description ?? null,
        taskType: a.taskType,
        active: a.active,
        lastStatus: a.lastStatus ?? null,
        lastRunAtFa: a.lastRunAt
          ? new Date(a.lastRunAt).toLocaleString("fa-IR", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
      }));
      setAgents(next);
    } catch {
      setError("خطا در ارتباط با سرور.");
    }
  }, []);

  const runAgent = async (key: string) => {
    setRunningKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const j: RunResult = await res.json().catch(() => ({
        ok: false,
        summary: "پاسخ نامعتبر از سرور.",
        error: "INVALID_RESPONSE",
      }));
      setResults((prev) => ({ ...prev, [key]: j }));
      // Refresh so the lastStatus / lastRunAt badge updates.
      await refresh();
    } catch (e: any) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          ok: false,
          summary: "خطا در ارتباط با سرور.",
          error: e?.message ?? "NETWORK",
        },
      }));
    } finally {
      setRunningKey(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Bot className="h-4 w-4 text-[#F58220]" />
          <span>
            ایجنت‌ها به‌صورت درون‌پروسه‌ای اجرا می‌شوند. برای کارهای سنگین‌تر از
            صف کارهای پس‌زمینه استفاده کنید.
          </span>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          <RefreshCw size={14} />
          به‌روزرسانی
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Agent grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {agents.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            هیچ ایجنتی ثبت نشده است.
          </div>
        ) : (
          agents.map((a) => {
            const isRunning = runningKey === a.key;
            const result = results[a.key];
            return (
              <div
                key={a.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition ${
                  a.active
                    ? "border-zinc-200 hover:border-zinc-300"
                    : "border-zinc-200 opacity-60"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-black text-zinc-900">
                        {a.nameFa}
                      </h3>
                      <StatusBadge status={a.lastStatus} />
                    </div>
                    <code className="mt-0.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                      {a.key}
                    </code>
                    {a.nameEn && (
                      <span className="mr-2 text-[11px] text-zinc-400">
                        ({a.nameEn})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => runAgent(a.key)}
                    disabled={isRunning || !a.active}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRunning ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Play size={13} />
                    )}
                    اجرا
                  </button>
                </div>

                {/* Description */}
                {a.description && (
                  <p className="text-xs leading-6 text-zinc-600">
                    {a.description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {a.lastRunAtFa
                      ? `آخرین اجرا: ${a.lastRunAtFa}`
                      : "هنوز اجرا نشده"}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                    task: {a.taskType}
                  </span>
                </div>

                {/* Last run result */}
                {result && (
                  <div
                    className={`rounded-xl border px-3 py-2.5 text-xs leading-6 ${
                      result.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.ok ? (
                        <CheckCircle2 size={14} className="mt-1 shrink-0" />
                      ) : (
                        <XCircle size={14} className="mt-1 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold">{result.summary}</p>
                        {result.error && !result.ok && (
                          <p className="mt-1 font-mono text-[10px] text-red-600">
                            {result.error}
                          </p>
                        )}
                        {result.details &&
                          typeof result.details === "object" &&
                          Object.keys(result.details).length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] underline">
                                جزئیات
                              </summary>
                              <pre className="mt-1 max-h-40 overflow-auto rounded bg-white/60 p-2 font-mono text-[10px] text-zinc-700">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const meta: Record<string, { fa: string; cls: string }> = {
    SUCCESS: {
      fa: "موفق",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    FAILED: { fa: "خطا", cls: "bg-red-100 text-red-700 border-red-200" },
    RUNNING: {
      fa: "در حال اجرا",
      cls: "bg-blue-100 text-blue-700 border-blue-200",
    },
  };
  const m = meta[status] ?? {
    fa: status,
    cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${m.cls}`}
    >
      {m.fa}
    </span>
  );
}
