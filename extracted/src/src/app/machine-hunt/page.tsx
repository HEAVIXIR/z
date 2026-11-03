import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Flame, ArrowLeft, Search, Bell, Target, Zap } from "lucide-react";
import { toFa } from "@/lib/format";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MachineHuntPage() {
  const activeRequests = await db.buyRequest.count({ where: { status: "ACTIVE" } });
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F58220]/15"><Flame className="h-10 w-10 text-[#F58220]" /></div>
            <h1 className="text-4xl font-black text-white lg:text-5xl">HEAVIX <span className="text-[#F58220]">Machine Hunt</span></h1>
            <p className="mt-4 max-w-2xl mx-auto text-base leading-8 text-white/50">ماشین موردنظرت را پیدا نمی‌کنی؟ هویکس دنبالش می‌گردد. درخواست خود را ثبت کن — شبکه فروشندگان و بازار هویکس برایت پیدا می‌کند.</p>
          </div>
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {[{icon:Search,title:"۱. درخواست ثبت کن",desc:"نوع ماشین، بودجه، شهر و زمان موردنظرت را وارد کن"},{icon:Target,title:"۲. هویکس می‌گردد",desc:"بازار، شبکه فروشندگان و درخواست‌ها را جستجو می‌کنیم"},{icon:Bell,title:"۳. خبرت می‌شود",desc:"وقتی ماشین مطابق پیدا شد، به‌صورت خودکار اطلاع می‌دهی"}].map((s, i) => (
              <div key={i} className="rounded-3xl border border-white/10 bg-[#111] p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F58220]/15"><s.icon className="h-6 w-6 text-[#F58220]" /></div>
                <h3 className="text-sm font-black text-white">{s.title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/40">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mb-10 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><p className="text-2xl font-black text-[#F58220]">{toFa(activeRequests)}</p><p className="text-[11px] text-white/40">درخواست فعال</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><p className="text-2xl font-black text-[#F58220]">∞</p><p className="text-[11px] text-white/40">شبکه فروشندگان</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#111] p-5 text-center"><p className="text-2xl font-black text-[#F58220]">۲۴/۷</p><p className="text-[11px] text-white/40">جستجوی خودکار</p></div>
          </div>
          <div className="rounded-3xl border border-[#F58220]/30 bg-gradient-to-br from-[#F58220]/10 to-transparent p-8 text-center">
            <Zap className="mx-auto mb-4 h-10 w-10 text-[#F58220]" />
            <h2 className="text-2xl font-black text-white">آماده‌ای ماشینت را پیدا کنی؟</h2>
            <p className="mt-2 text-sm text-white/50">همین حالا درخواست ثبت کن — فروشندگان مستقیم با تو تماس می‌گیرند</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/requests/new" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F58220] px-8 text-sm font-bold text-white transition hover:bg-[#ff8c38]"><Flame className="h-4 w-4" />ثبت درخواست خرید</Link>
              <Link href="/listings" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition hover:bg-white/10">مشاهده ماشین‌آلات<ArrowLeft className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
