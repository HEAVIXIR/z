"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  TrendingUp, Users, Megaphone, Flame, Loader2, ArrowLeft,
  Gavel, Eye, CheckCircle2, Sparkles,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /seller/leads — CRM for sellers (Priority #38)
   Shows leads, offers, AI classification + suggestions.
   ============================================================ */

type LeadData = {
  success: boolean;
  stats: { totalLeads: number; totalOffers: number; pendingOffers: number; totalViews: number };
  classification: {
    highPriority: string[];
    mediumPriority: string[];
    lowPriority: string[];
    suggestions: string[];
  };
};

export default function SellerLeadsPage() {
  const [data, setData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-sales-agent")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); else setError(d.error ?? "خطا"); })
      .catch(() => setError("خطای شبکه"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-12">
          {/* Header */}
          <div className="mb-8">
            <Link href="/seller/dashboard" className="mb-3 inline-flex items-center gap-1 text-xs text-white/40 transition hover:text-[#F58220]">
              <ArrowLeft className="h-3 w-3 rotate-180" />داشبورد فروشنده
            </Link>
            <h1 className="flex items-center gap-2 text-3xl font-black text-white">
              <TrendingUp className="h-7 w-7 text-[#F58220]" />
              سرنخ‌ها و مشتریان
            </h1>
            <p className="mt-1 text-sm text-white/50">مدیریت تماس‌ها، پیشنهادها و تحلیل AI</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <p className="text-sm font-bold text-red-400">{error}</p>
              <p className="mt-2 text-xs text-white/40">برای مشاهده سرنخ‌ها باید وارد شوید</p>
              <Link href="/login" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-6 py-2.5 text-sm font-bold text-white">ورود</Link>
            </div>
          ) : data ? (
            <>
              {/* Stats */}
              <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                  <Eye className="mb-2 h-6 w-6 text-blue-400" />
                  <p className="text-2xl font-black text-white">{toFa(data.stats.totalViews)}</p>
                  <p className="text-[11px] text-white/40">بازدید کل</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                  <TrendingUp className="mb-2 h-6 w-6 text-emerald-400" />
                  <p className="text-2xl font-black text-white">{toFa(data.stats.totalLeads)}</p>
                  <p className="text-[11px] text-white/40">سرنخ کل</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
                  <Gavel className="mb-2 h-6 w-6 text-[#F58220]" />
                  <p className="text-2xl font-black text-white">{toFa(data.stats.totalOffers)}</p>
                  <p className="text-[11px] text-white/40">پیشنهاد قیمت</p>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                  <Flame className="mb-2 h-6 w-6 text-amber-400" />
                  <p className="text-2xl font-black text-amber-400">{toFa(data.stats.pendingOffers)}</p>
                  <p className="text-[11px] text-white/40">پیشنهاد معوق</p>
                </div>
              </div>

              {/* AI Classification */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Priority Classification */}
                <div className="rounded-3xl border border-white/10 bg-[#111] p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                    <Sparkles className="h-4 w-4 text-[#F58220]" />
                    دسته‌بندی AI سرنخ‌ها
                  </h2>
                  <div className="space-y-3">
                    {data.classification.highPriority?.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold text-red-400">🔴 اولویت بالا</p>
                        {data.classification.highPriority.map((item, i) => (
                          <div key={i} className="mb-1 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-white/70">{item}</div>
                        ))}
                      </div>
                    )}
                    {data.classification.mediumPriority?.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold text-amber-400">🟡 اولویت متوسط</p>
                        {data.classification.mediumPriority.map((item, i) => (
                          <div key={i} className="mb-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-white/70">{item}</div>
                        ))}
                      </div>
                    )}
                    {data.classification.lowPriority?.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold text-blue-400">🔵 اولویت پایین</p>
                        {data.classification.lowPriority.slice(0, 5).map((item, i) => (
                          <div key={i} className="mb-1 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2 text-xs text-white/70">{item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="rounded-3xl border border-[#F58220]/20 bg-gradient-to-br from-[#F58220]/10 to-transparent p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-[#F58220]">
                    <Sparkles className="h-4 w-4" />
                    پیشنهادهای AI برای فروش بیشتر
                  </h2>
                  <div className="space-y-2">
                    {data.classification.suggestions?.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F58220]" />
                        <p className="text-sm leading-6 text-white/70">{s}</p>
                      </div>
                    ))}
                    {(!data.classification.suggestions || data.classification.suggestions.length === 0) && (
                      <p className="py-6 text-center text-xs text-white/40">پیشنهادی موجود نیست</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
