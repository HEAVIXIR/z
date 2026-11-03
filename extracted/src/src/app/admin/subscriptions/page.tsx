import { db } from "@/lib/db";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";
import {
  Crown,
  CheckCircle2,
  TrendingUp,
  Users,
  Sparkles,
  BarChart,
  Headset,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PLAN_FEATURES = [
  {
    name: "BASIC",
    label: "پایه",
    price: "رایگان",
    color: "text-zinc-700",
    bg: "bg-zinc-100",
    features: [
      "تا ۱۰ آگهی فعال",
      "نمایش استاندارد در نتایج",
      "پشتیبانی ایمیلی",
      "داشبورد پایه",
    ],
    icon: Users,
  },
  {
    name: "PRO",
    label: "حرفه‌ای",
    price: "۴۹۹٬۰۰۰ تومان / ماه",
    color: "text-[#F58220]",
    bg: "bg-[#F58220]/10",
    features: [
      "تا ۵۰ آگهی فعال",
      "۳ آگهی ویژهٔ ماهانه",
      "دسترسی به تحلیل بازار",
      "اولویت در نتایج جستجو",
      "پشتیبانی تلفنی",
    ],
    icon: TrendingUp,
  },
  {
    name: "PREMIUM",
    label: "پرمیوم",
    price: "۱٬۴۹۹٬۰۰۰ تومان / ماه",
    color: "text-amber-600",
    bg: "bg-amber-100",
    features: [
      "آگهی نامحدود",
      "آگهی‌های ویژهٔ نامحدود",
      "دسترسی به هوش مصنوعی",
      "صفحهٔ شرکت اختصاصی",
      "سرنخ‌های اولویت‌دار",
      "پشتیبانی اختصاصی ۷/۲۴",
    ],
    icon: Crown,
  },
];

export default async function SubscriptionsPage() {
  const [subscriptions, stats] = await Promise.all([
    db.premiumSubscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, mobile: true, email: true },
        },
      },
    }),
    Promise.all([
      db.premiumSubscription.count(),
      db.premiumSubscription.count({ where: { plan: "BASIC" } }),
      db.premiumSubscription.count({ where: { plan: "PRO" } }),
      db.premiumSubscription.count({ where: { plan: "PREMIUM" } }),
      db.premiumSubscription.count({ where: { status: "ACTIVE" } }),
    ]).then(([total, basic, pro, premium, active]) => ({
      total,
      basic,
      pro,
      premium,
      active,
    })),
  ]);

  const statCards = [
    {
      label: "کل اشتراک‌ها",
      value: stats.total,
      icon: Crown,
      color: "text-[#F58220]",
      bg: "bg-[#F58220]/10",
    },
    {
      label: "اشتراک فعال",
      value: stats.active,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "اشتراک PRO",
      value: stats.pro,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "اشتراک PREMIUM",
      value: stats.premium,
      icon: Sparkles,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">اشتراک‌های Premium</h1>
        <p className="mt-1 text-sm text-zinc-500">مدیریت اشتراک‌های پولی کاربران</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="mt-1 text-2xl font-black text-zinc-900">{toFa(s.value)}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-zinc-900">
          <BarChart className="h-5 w-5 text-[#F58220]" />
          مقایسهٔ طرح‌ها
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_FEATURES.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${
                p.name === "PRO"
                  ? "border-[#F58220] bg-[#F58220]/5"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${p.bg}`}>
                  <p.icon className={`h-5 w-5 ${p.color}`} />
                </div>
                <span className={`text-xs font-black ${p.color}`}>{p.name}</span>
              </div>
              <h3 className="text-lg font-black text-zinc-900">{p.label}</h3>
              <p className="mt-1 text-sm font-bold text-zinc-700">{p.price}</p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-600">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-zinc-100 pt-3 text-center">
                <span className="text-xs text-zinc-500">
                  {toFa(
                    p.name === "BASIC"
                      ? stats.basic
                      : p.name === "PRO"
                        ? stats.pro
                        : stats.premium,
                  )}{" "}
                  مشترك
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">کاربر</th>
                <th className="px-4 py-3 text-right font-bold">طرح</th>
                <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                <th className="px-4 py-3 text-right font-bold">شروع</th>
                <th className="px-4 py-3 text-right font-bold">انقضا</th>
                <th className="px-4 py-3 text-right font-bold">مبلغ</th>
                <th className="px-4 py-3 text-right font-bold">امکانات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {subscriptions.map((s) => {
                const features = [
                  s.featuredCredits > 0 && `${toFa(s.featuredCredits)} ویژه`,
                  s.analyticsAccess && "تحلیل",
                  s.aiAssistantAccess && "هوش مصنوعی",
                  s.priorityLeads && "سرنخ اولویت",
                  s.companyPage && "صفحهٔ شرکت",
                ].filter(Boolean);
                return (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-zinc-900">
                        {s.user?.firstName} {s.user?.lastName}
                      </p>
                      <p className="text-[11px] text-zinc-400" dir="ltr">
                        {s.user?.mobile ?? s.user?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.plan === "PREMIUM"
                            ? "bg-amber-100 text-amber-700"
                            : s.plan === "PRO"
                              ? "bg-[#F58220]/10 text-[#F58220]"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {s.status === "ACTIVE" ? "فعال" : s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {faDate(s.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {s.expiresAt ? faDate(s.expiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-700">
                      {s.amount ? formatCompactPrice(s.amount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {features.map((f, i) => (
                          <span
                            key={i}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                          >
                            {f}
                          </span>
                        ))}
                        {features.length === 0 && (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    اشتراک پولی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
