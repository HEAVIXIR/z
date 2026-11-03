"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  Bot,
  User,
} from "lucide-react";

/* ============================================================
   AskHeavix — chat-style Q&A box on listing detail page.
   POSTs { listingId, question } to /api/ask-heavix and shows
   the AI answer with a confidence badge:
     KNOWN          → teal
     RECOMMENDATION → amber
     UNKNOWN        → zinc
   ============================================================ */

type Confidence = "KNOWN" | "RECOMMENDATION" | "UNKNOWN";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  confidence?: Confidence;
};

const SUGGESTED_QUESTIONS = [
  "این ماشین برای معدن مناسب است؟",
  "مصرف سوخت چقدر است؟",
  "برای چه نوع کارهایی پیشنهاد می‌شود؟",
  "آیا قطعات یدکی در دسترس است؟",
  "هزینه سرویس دوره‌ای حدوداً چقدر است؟",
];

const CONFIDENCE_CFG: Record<
  Confidence,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  KNOWN: {
    label: "از داده‌های آگهی",
    bg: "bg-teal-500/10",
    text: "text-teal-300",
    border: "border-teal-500/30",
    dot: "bg-teal-400",
  },
  RECOMMENDATION: {
    label: "پیشنهاد هوش مصنوعی",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  UNKNOWN: {
    label: "اطلاعات کافی نیست",
    bg: "bg-zinc-500/10",
    text: "text-zinc-300",
    border: "border-zinc-500/30",
    dot: "bg-zinc-400",
  },
};

export default function AskHeavix({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;

    setError(null);
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: question,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask-heavix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, question }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "خطا در ارتباط با هویکس");
      }
      const confidence: Confidence = json.confidence ?? "UNKNOWN";
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: json.answer,
          confidence,
        },
      ]);
    } catch (e: any) {
      setError(e?.message ?? "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-l from-[#F58220]/10 to-transparent px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F58220]/15">
          <Sparkles className="h-5 w-5 text-[#F58220]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-black text-white">از هویکس بپرسید</h3>
          <p className="mt-0.5 text-[11px] text-white/50">
            دربارهٔ «{listingTitle}» هر سؤالی دارید بپرسید
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/40">
          <Bot className="h-3 w-3" />
          AI Assistant
        </span>
      </div>

      {/* Chat body */}
      <div
        ref={scrollRef}
        className="max-h-[380px] min-h-[180px] space-y-3 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
            <Bot className="mx-auto mb-3 h-8 w-8 text-white/30" />
            <p className="text-sm text-white/55">
              سلام! من دستیار هوشمند هویکس هستم. دربارهٔ این دستگاه هر
              سؤالی دارید بپرسید — از مشخصات فنی گرفته تا کاربردها و
              هزینه‌های جانبی.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                m.role === "user"
                  ? "bg-white/10"
                  : "bg-[#F58220]/15"
              }`}
            >
              {m.role === "user" ? (
                <User className="h-3.5 w-3.5 text-white/70" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-[#F58220]" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                m.role === "user"
                  ? "bg-[#F58220] text-white"
                  : "border border-white/10 bg-white/[0.03] text-white/85"
              }`}
            >
              {m.text}
              {m.confidence && (
                <div
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${CONFIDENCE_CFG[m.confidence].bg} ${CONFIDENCE_CFG[m.confidence].text} ${CONFIDENCE_CFG[m.confidence].border}`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${CONFIDENCE_CFG[m.confidence].dot}`}
                  />
                  {CONFIDENCE_CFG[m.confidence].label}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F58220]/15">
              <Sparkles className="h-3.5 w-3.5 text-[#F58220]" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F58220]" />
              هویکس در حال فکر کردن است...
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/70 transition hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220] disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="سؤال خود را بنویسید..."
          disabled={loading}
          maxLength={600}
          className="h-11 flex-1 rounded-xl border border-white/10 bg-[#0b0b0b] px-4 text-sm text-white outline-none transition focus:border-[#F58220]/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F58220] text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
          title="ارسال"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      <p className="px-5 pb-3 text-[10px] leading-5 text-white/30">
        پاسخ‌ها توسط هوش مصنوعی تولید می‌شوند و صرفاً جنبهٔ راهنمایی دارند؛
        هویکس ضمانت صحت آن‌ها را ندارد.
      </p>
    </div>
  );
}
