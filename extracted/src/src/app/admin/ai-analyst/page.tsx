"use client";
import { useState } from "react";
import { Sparkles, Loader2, Send, BarChart3 } from "lucide-react";

const SUGGESTED_QUESTIONS = ["بازار بیل مکانیکی را تحلیل کن","کدام دسته بیشترین تقاضا دارد؟","قیمت لودرها در چه محدوده‌ای است؟","کدام برند محبوب‌تر است؟","فرصت رشد در چه مناطقی وجود دارد؟"];

export default function AIAnalystPage() {
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const res = await fetch("/api/ai-market-analyst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: query }) });
      const data = await res.json();
      if (data.success) setAnalysis(data.analysis);
      else setError(data.error ?? "خطا در تحلیل");
    } catch { setError("خطای شبکه"); }
    setLoading(false);
  };

  const renderMarkdown = (md: string) => {
    return md.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="mt-4 mb-2 text-base font-black text-zinc-800">{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} className="mb-3 text-lg font-black text-zinc-900">{line.slice(2)}</h1>;
      if (line.startsWith("- ")) return <li key={i} className="mr-4 text-sm leading-6 text-zinc-700">{line.slice(2)}</li>;
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm leading-6 text-zinc-700">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900"><BarChart3 className="h-6 w-6 text-[#F58220]" />تحلیلگر بازار هوشمند</h1><p className="mt-1 text-sm text-zinc-500">سؤال خود را درباره بازار ماشین‌آلات بپرسید — AI بر اساس داده‌های هویکس تحلیل می‌کند</p></div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder="سؤال خود را بنویسید..." className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white" /><button onClick={() => ask()} disabled={loading || !question.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}تحلیل</button></div>
        <div className="mt-3 flex flex-wrap gap-2">{SUGGESTED_QUESTIONS.map((q) => <button key={q} onClick={() => { setQuestion(q); ask(q); }} disabled={loading} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-500 transition hover:border-[#F58220]/30 hover:text-[#F58220] disabled:opacity-40">{q}</button>)}</div>
      </div>
      {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">⚠ {error}</div>}
      {loading && <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-zinc-200 bg-white"><Loader2 className="h-10 w-10 animate-spin text-[#F58220]" /><p className="mt-3 text-sm text-zinc-500">AI در حال تحلیل داده‌های بازار...</p></div>}
      {analysis && !loading && <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#F58220]"><Sparkles className="h-4 w-4" />تحلیل AI</div><div className="space-y-1">{renderMarkdown(analysis)}</div><p className="mt-4 border-t border-zinc-100 pt-3 text-[10px] text-zinc-400">* این تحلیل بر اساس داده‌های داخلی هویکس تولید شده و برای تصمیم‌گیری نهایی باید با داده‌های خارجی نیز مقایسه شود.</p></div>}
    </div>
  );
}
