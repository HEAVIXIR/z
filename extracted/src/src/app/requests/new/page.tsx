"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const CATEGORIES = ["بیل مکانیکی","لودر","بلدوزر","گریدر","دامپ تراک","جرثقیل","کامیون","سنگ‌شکن","فورک‌لیفت","بیل معکوس","کمباین","تراکتور","قطعات","ادوات","خدمات"];
const CITIES = ["تهران","اصفهان","مشهد","کرمان","یزد","اهواز","شیراز","تبریز","اراک","قزوین","زاهدان","بندرعباس","رشت","کرج","قم"];
const DEADLINES = ["فوری","۱ هفته","۲ هفته","۱ ماه","۳ ماه","۶ ماه"];

export default function NewRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", category: "", brandPref: "", transaction: "SALE", budgetMin: "", budgetMax: "", city: "", deadline: "", requesterName: "", requesterPhone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.ok) { setSubmitted(true); setTimeout(() => router.push("/"), 3000); }
      else setError(data.error ?? "خطا");
    } catch { setError("خطای شبکه"); }
    setSubmitting(false);
  };
  const inputCls = "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220] focus:bg-white/10";
  const labelCls = "mb-1.5 block text-xs font-bold text-white/60";
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15"><Flame className="h-7 w-7 text-[#F58220]" /></div>
            <h1 className="text-3xl font-black text-white">ثبت درخواست خرید</h1>
            <p className="mt-2 text-sm text-white/50">ماشین موردنظرتان را پیدا نکردید؟ درخواست خود را ثبت کنید تا فروشندگان مستقیم با شما تماس بگیرند.</p>
          </div>
          {submitted ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
              <h2 className="text-xl font-black text-white">درخواست شما ثبت شد!</h2>
              <p className="mt-2 text-sm text-white/50">درخواست شما در بخش «درخواست‌های فعال» نمایش داده می‌شود.</p>
              <p className="mt-4 text-xs text-white/30">در حال انتقال...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-[#111] p-6 sm:p-8">
              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400">⚠ {error}</div>}
              <div><label className={labelCls}>عنوان درخواست *</label><input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثلاً: بیل مکانیکی ۲۰ تن دست دوم برای معدن" className={inputCls} /></div>
              <div><label className={labelCls}>نوع معامله</label><div className="flex gap-2">{[{v:"SALE",l:"خرید"},{v:"RENT",l:"اجاره"}].map((t) => <button key={t.v} type="button" onClick={() => set("transaction", t.v)} className={`flex-1 rounded-xl border py-3 text-sm font-bold transition ${form.transaction === t.v ? "border-[#F58220] bg-[#F58220]/15 text-[#F58220]" : "border-white/10 bg-white/5 text-white/50"}`}>{t.l}</button>)}</div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelCls}>دسته‌بندی</label><select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}><option value="">انتخاب...</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div><div><label className={labelCls}>برند موردنظر (اختیاری)</label><input value={form.brandPref} onChange={(e) => set("brandPref", e.target.value)} placeholder="مثلاً: کوماتسو، وولوو" className={inputCls} /></div></div>
              <div><label className={labelCls}>بودجه (تومان)</label><div className="grid gap-3 sm:grid-cols-2"><input value={form.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} placeholder="حداقل" className={inputCls} dir="ltr" /><input value={form.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} placeholder="حداکثر" className={inputCls} dir="ltr" /></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelCls}>شهر</label><select value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls}><option value="">انتخاب...</option>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div><div><label className={labelCls}>زمان موردنیاز</label><select value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={inputCls}><option value="">انتخاب...</option>{DEADLINES.map((d) => <option key={d} value={d}>{d}</option>)}</select></div></div>
              <div><label className={labelCls}>توضیحات بیشتر</label><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="جزئیات بیشتر..." className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220] focus:bg-white/10" /></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"><p className="mb-3 text-xs font-bold text-white/60">اطلاعات تماس</p><div className="grid gap-3 sm:grid-cols-2"><div><label className={labelCls}>نام</label><input value={form.requesterName} onChange={(e) => set("requesterName", e.target.value)} placeholder="نام شما" className={inputCls} /></div><div><label className={labelCls}>شماره تماس</label><input value={form.requesterPhone} onChange={(e) => set("requesterPhone", e.target.value)} placeholder="0912..." className={inputCls} dir="ltr" /></div></div></div>
              <div className="flex gap-3"><button type="button" onClick={() => router.push("/")} className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white/60 transition hover:bg-white/10">انصراف</button><button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F58220] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Flame className="h-4 w-4" /> ثبت درخواست</>}</button></div>
            </form>
          )}
          <div className="mt-6 text-center"><button onClick={() => router.push("/")} className="inline-flex items-center gap-1 text-xs text-white/30 transition hover:text-[#F58220]"><ArrowRight className="h-3 w-3" /> بازگشت به صفحه اصلی</button></div>
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
