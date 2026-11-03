"use client";

import { useState } from "react";
import { Sparkles, Send, Loader2, MessageSquare } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "وضعیت کلی بازار ماشین‌آلات سنگین ایران چگونه است؟",
  "کدام دسته‌ها بیشترین رشد را داشته‌اند؟",
  "میانگین قیمت بیل مکانیکی در بازار چقدر است؟",
  "بهترین برندهای حال حاضر بازار کدامند؟",
  "کدام استان‌ها بیشترین تقاضا را دارند؟",
  "پیش‌بینی روند بازار در ۳ ماه آینده چیست؟",
];

export default function AIAnalystClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q?: string) => {
    const query = (q ?? question).trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    if (q) setQuestion(q);
    try {
      const res = await fetch("/api/ai-market-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnswer(data.answer ?? data.analysis ?? "پاسخی دریافت نشد.");
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با هوش مصنوعی.");
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="mt-4 text-base font-black text-zinc-900">
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="mt-4 text-lg font-black text-zinc-900">
            {line.slice(2)}
          </h2>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <p key={idx} className="mt-1 pr-4 text-sm leading-7 text-zinc-700">
            • {line.slice(2)}
          </p>
        );
      }
      if (!line.trim()) return <div key={idx} className="h-2" />;
      return (
        <p key={idx} className="mt-1 text-sm leading-7 text-zinc-700">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Input box */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#F58220]" />
          <h2 className="text-sm font-black text-zinc-900">سوال خود را بپرسید</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="مثلاً روند قیمت بیل مکانیکی در ۶ ماه آینده چگونه پیش‌بینی می‌شود؟"
            className="h-12 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
          />
          <button
            type="button"
            onClick={() => ask()}
            disabled={loading || !question.trim()}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            پرسش
          </button>
        </div>
      </div>

      {/* Suggested questions */}
      <div>
        <p className="mb-2 text-xs font-bold text-zinc-500">سوالات پیشنهادی:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              disabled={loading}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-600 transition hover:border-[#F58220]/40 hover:text-[#F58220] disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Answer */}
      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#F58220]" />
          <p className="mt-3 text-sm text-zinc-500">
            هوش مصنوعی در حال تحلیل است...
          </p>
        </div>
      )}

      {answer && !loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2 border-b border-zinc-100 pb-3">
            <MessageSquare className="h-4 w-4 text-[#F58220]" />
            <span className="text-xs font-bold text-zinc-700">تحلیل هوش مصنوعی</span>
          </div>
          <div>{renderMarkdown(answer)}</div>
        </div>
      )}
    </div>
  );
}
