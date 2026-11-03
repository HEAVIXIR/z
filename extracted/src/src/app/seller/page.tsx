import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Store, Megaphone, TrendingUp, Users, Star, ShieldCheck, ArrowLeft, BarChart3, MessageSquare, Bell, Settings, Zap } from "lucide-react";
import { toFa } from "@/lib/format";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SellerCenterPage() {
  const [totalListings, totalSellers, totalViews, verifiedListings] = await Promise.all([
    db.listing.count({ where: { status: "PUBLISHED" } }),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.listing.aggregate({ _sum: { viewCount: true } }),
    db.listing.count({ where: { status: "PUBLISHED", verified: true } }),
  ]);
  const features = [
    { icon: Megaphone, title: "مدیریت آگهی‌ها", desc: "آگهی‌های خود را ایجاد، ویرایش و مدیریت کنید", href: "/listings/new", color: "text-[#F58220] bg-[#F58220]/10" },
    { icon: BarChart3, title: "تحلیل و آمار", desc: "بازدید، تماس و سرنخ هر آگهی را ببینید", href: "/seller/dashboard", color: "text-blue-400 bg-blue-500/10" },
    { icon: MessageSquare, title: "پیام‌ها و سرنخ‌ها", desc: "تماس‌های دریافتی از خریداران را مدیریت کنید", href: "#", color: "text-teal-400 bg-teal-500/10" },
    { icon: ShieldCheck, title: "احراز هویت", desc: "حساب خود را تأیید کنید و نشان تأییدشده بگیرید", href: "#", color: "text-purple-400 bg-purple-500/10" },
    { icon: Bell, title: "هشدار و اطلاع‌رسانی", desc: "از درخواست‌های خرید جدید مطلع شوید", href: "#", color: "text-amber-400 bg-amber-500/10" },
    { icon: Settings, title: "تنظیمات فروشنده", desc: "پروفایل شرکت و اطلاعات تماس خود را مدیریت کنید", href: "#", color: "text-zinc-400 bg-zinc-500/10" },
  ];
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-12">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F58220]/15"><Store className="h-8 w-8 text-[#F58220]" /></div>
            <h1 className="text-3xl font-black text-white lg:text-4xl">مرکز فروشندگان هویکس</h1>
            <p className="mt-3 max-w-2xl mx-auto text-sm leading-7 text-white/50">پنل حرفه‌ای مدیریت آگهی، سرنخ، تحلیل و ارتباط با خریداران — همه در یک مکان</p>
          </div>
          <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><Megaphone className="mx-auto mb-2 h-6 w-6 text-[#F58220]" /><p className="text-2xl font-black text-white">{toFa(totalListings)}+</p><p className="text-xs text-white/40">آگهی فعال</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><Users className="mx-auto mb-2 h-6 w-6 text-teal-400" /><p className="text-2xl font-black text-white">{toFa(totalSellers)}+</p><p className="text-xs text-white/40">فروشنده فعال</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><TrendingUp className="mx-auto mb-2 h-6 w-6 text-blue-400" /><p className="text-2xl font-black text-white">{toFa(totalViews._sum.viewCount || 0)}+</p><p className="text-xs text-white/40">بازدید کل</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><ShieldCheck className="mx-auto mb-2 h-6 w-6 text-purple-400" /><p className="text-2xl font-black text-white">{toFa(verifiedListings)}</p><p className="text-xs text-white/40">آگهی تأییدشده</p></div>
          </div>
          <div className="mb-12">
            <h2 className="mb-6 text-center text-xl font-black text-white">ابزارهای فروشنده</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <div key={idx} className="group flex items-start gap-4 rounded-3xl border border-white/10 bg-[#111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/30">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${f.color}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-white">{f.title}</h3><p className="mt-1 text-xs leading-5 text-white/40">{f.desc}</p></div>
                    {f.href !== "#" && <Link href={f.href} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/20 transition group-hover:text-[#F58220]"><ArrowLeft className="h-4 w-4" /></Link>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-3xl border border-[#F58220]/20 bg-gradient-to-br from-[#F58220]/10 to-transparent p-8 text-center">
            <Zap className="mx-auto mb-3 h-10 w-10 text-[#F58220]" />
            <h2 className="text-2xl font-black text-white">آماده فروش ماشین‌آلات خود هستید؟</h2>
            <p className="mt-2 text-sm text-white/50">همین حالا آگهی ثبت کنید و به هزاران خریدار بالقوه دسترسی پیدا کنید</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/listings/new" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F58220] px-8 text-sm font-bold text-white transition hover:bg-[#ff8c38]"><Megaphone className="h-4 w-4" />ثبت آگهی رایگان</Link>
              <Link href="/listings" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition hover:bg-white/10">مشاهده آگهی‌ها<ArrowLeft className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
