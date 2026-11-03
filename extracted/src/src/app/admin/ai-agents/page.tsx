import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import { Sparkles, Brain, Play, Clock, CheckCircle2, XCircle, Activity, Bot } from "lucide-react";
import AIAgentsAdminClient from "./AIAgentsAdminClient";

export const dynamic = "force-dynamic";

/* ============================================================
   /admin/ai-agents — AI Agents platform admin page (P2-26)
   ============================================================ */

export default async function AIAgentsPage() {
  // Touch the agent registry so the built-in agents are seeded
  // before we render — `listAgents` would also do it, but we want
  // to fetch with relations-ready stats separately.
  const agents = await db.aIAgent.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Format lastRunAt as Persian date string for the initial SSR.
  const formatted = agents.map((a) => ({
    id: a.id,
    key: a.key,
    nameFa: a.nameFa,
    nameEn: a.nameEn,
    description: a.description,
    taskType: a.taskType,
    active: a.active,
    lastStatus: a.lastStatus,
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

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Bot className="h-6 w-6 text-[#F58220]" />
          ایجنت‌های هوش مصنوعی
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          پلتفرم ایجنت‌های هوش مصنوعی برای تکمیل کاتالوگ، پژوهش برند و بازبینی.
          هوش مصنوعی پیشنهاد می‌دهد — تأیید نهایی با ادمین است (اصل ۸ HBR-1.0).
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <Brain className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">قانون حاکمیت هوش مصنوعی</p>
            <p className="text-xs leading-6">
              هرگونه خروجی ایجنت به‌صورت{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
                AI_SUGGESTED
              </code>{" "}
              و{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
                verified=false
              </code>{" "}
              ذخیره می‌شود. هیچ‌کدام بدون بازبینی ادمین به‌عنوان دادهٔ قطعی پذیرفته
              نمی‌شود. اجرای هر ایجنت در لاگ ممیزی ثبت می‌شود.
            </p>
          </div>
        </div>
      </div>

      <AIAgentsAdminClient agents={formatted} />

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#F58220]" />
          <span>
            مجموعهٔ فعلی شامل {toFa(agents.length)} ایجنت ثبت‌شده است. برای افزودن
            ایجنت جدید، کلید آن را در <code>src/lib/ai-agents/index.ts</code> ثبت
            کنید.
          </span>
        </div>
      </div>
    </div>
  );
}
