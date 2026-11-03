"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Check, Search } from "lucide-react";

const USE_CASES = [{id:"mining",label:"معدن",icon:"⛏️"},{id:"road",label:"راه‌سازی",icon:"🛣️"},{id:"construction",label:"ساختمان",icon:"🏗️"},{id:"agriculture",label:"کشاورزی",icon:"🌾"},{id:"industry",label:"صنعت",icon:"🏭"},{id:"transport",label:"حمل‌ونقل",icon:"🚚"}];
const BUDGETS = [{id:"low",label:"زیر ۲ میلیارد",min:"0",max:"2000000000"},{id:"mid",label:"۲ تا ۵ میلیارد",min:"2000000000",max:"5000000000"},{id:"high",label:"۵ تا ۱۰ میلیارد",min:"5000000000",max:"10000000000"},{id:"premium",label:"بالای ۱۰ میلیارد",min:"10000000000",max:""},{id:"any",label:"بدون محدودیت",min:"",max:""}];
const TRANSACTIONS = [{id:"SALE",label:"خرید"},{id:"RENT",label:"اجاره"}];
const CITIES = ["تهران","اصفهان","مشهد","کرمان","یزد","اهواز","شیراز","تبریز","اراک","کرج"];

export default function FindMyNeedPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState("");
  const [budget, setBudget] = useState("");
  const [transaction, setTransaction] = useState("");
  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);
  const steps = ["کاربرد","بودجه","خرید/اجاره","شهر","نتیجه"];
  const canProceed = () => { if (step === 0) return !!useCase; if (step === 1) return !!budget; if (step === 2) return !!transaction; return true; };
  const next = () => {
    if (step < 3) { setStep(step + 1); }
    else {
      setSearching(true);
      const budgetCfg = BUDGETS.find((b) => b.id === budget);
      const params = new URLSearchParams();
      const useCaseQuery: Record<string,string> = { mining:"معدن", road:"راه‌سازی گریدر", construction:"بیل مکانیکی", agriculture:"تراکتور کمباین", industry:"تجهیزات صنعتی", transport:"دامپ تراک کامیون" };
      if (useCaseQuery[useCase]) params.set("q", useCaseQuery[useCase]);
      if (transaction === "RENT") params.set("type", "RENT");
      if (city) params.set("city", city);
      if (budgetCfg?.min) params.set("minPrice", budgetCfg.min);
      if (budgetCfg?.max) params.set("maxPrice", budgetCfg.max);
      setTimeout(() => { router.push(`/listings?${params.toString()}`); }, 1500);
    }
  };
  const back = () => { if (step > 0) setStep(step - 1); };
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F58220]/15"><Sparkles className="h-8 w-8 text-[#F58220]" /></div>
            <h1 className="text-3xl font-black text-white">نیازم را پیدا کن</h1>
            <p className="mt-2 text-sm text-white/50">نمی‌دانید دقیقاً چه ماشینی نیاز دارید؟ چند سؤال کوتاه پاسخ دهید</p>
          </div>
          <div className="mb-8 flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-[#F58220] text-white" : "bg-white/10 text-white/40"}`}>{i < step ? <Check className="h-3.5 w-3.5" /> : (i+1).toLocaleString("fa-IR")}</div>
                {i < steps.length - 1 && <div className={`h-0.5 w-8 ${i < step ? "bg-emerald-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#111] p-6 sm:p-8">
            {step === 0 && <div><h2 className="mb-4 text-center text-lg font-black text-white">برای چه کاری نیاز دارید؟</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{USE_CASES.map((u) => <button key={u.id} onClick={() => setUseCase(u.id)} className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${useCase === u.id ? "border-[#F58220] bg-[#F58220]/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}><span className="text-3xl">{u.icon}</span><span className={`text-sm font-bold ${useCase === u.id ? "text-[#F58220]" : "text-white/60"}`}>{u.label}</span></button>)}</div></div>}
            {step === 1 && <div><h2 className="mb-4 text-center text-lg font-black text-white">بودجه تقریبی شما؟</h2><div className="space-y-2">{BUDGETS.map((b) => <button key={b.id} onClick={() => setBudget(b.id)} className={`flex w-full items-center justify-between rounded-xl border p-4 transition ${budget === b.id ? "border-[#F58220] bg-[#F58220]/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}><span className={`text-sm font-bold ${budget === b.id ? "text-[#F58220]" : "text-white/60"}`}>{b.label}</span>{budget === b.id && <Check className="h-4 w-4 text-[#F58220]" />}</button>)}</div></div>}
            {step === 2 && <div><h2 className="mb-4 text-center text-lg font-black text-white">خرید یا اجاره؟</h2><div className="grid grid-cols-2 gap-3">{TRANSACTIONS.map((t) => <button key={t.id} onClick={() => setTransaction(t.id)} className={`rounded-2xl border p-6 text-center transition ${transaction === t.id ? "border-[#F58220] bg-[#F58220]/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}><span className={`text-lg font-black ${transaction === t.id ? "text-[#F58220]" : "text-white/60"}`}>{t.label}</span></button>)}</div></div>}
            {step === 3 && <div><h2 className="mb-4 text-center text-lg font-black text-white">شهر شما؟ (اختیاری)</h2><div className="flex flex-wrap justify-center gap-2">{CITIES.map((c) => <button key={c} onClick={() => setCity(city === c ? "" : c)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${city === c ? "border-[#F58220] bg-[#F58220]/10 text-[#F58220]" : "border-white/10 bg-white/5 text-white/60"}`}>{c}</button>)}</div><p className="mt-4 text-center text-xs text-white/30">می‌توانید این مرحله را رد کنید</p></div>}
            {step === 4 && <div className="flex flex-col items-center justify-center py-12">{searching ? <><Loader2 className="h-12 w-12 animate-spin text-[#F58220]" /><p className="mt-4 text-sm text-white/50">در حال جستجوی ماشین‌آلات مناسب...</p></> : <><Search className="h-12 w-12 text-[#F58220]" /><p className="mt-4 text-sm text-white/50">آماده جستجو</p></>}</div>}
          </div>
          {step < 4 && <div className="mt-6 flex items-center justify-between"><button onClick={back} disabled={step === 0} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/10 disabled:opacity-30"><ArrowRight className="h-4 w-4" />قبلی</button><button onClick={next} disabled={!canProceed()} className="inline-flex items-center gap-1 rounded-xl bg-[#F58220] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-30">{step === 3 ? "جستجو" : "بعدی"}<ArrowLeft className="h-4 w-4" /></button></div>}
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
