"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, MessageSquare, Send } from "lucide-react";

/* ============================================================
   BrandAIAssistant — standalone brand AI assistant component.
   Embedded inside BrandControlCenter; can also be used
   standalone for other admin contexts.
   ============================================================ */

type BrandAIAssistantProps = {
  brandId?: string;
  brandName?: string;
  contextLabel?: string;
};

const SUGGESTIONS = [
  "تحلیل وضعیت بازار این برند",
  "پیشنهاد بهبود توضیحات برند",
  "تحلیل رقبا",
  "پیشنهاد مدل‌های جدید",
];

export default function BrandAIAssistant({
  brandId,
  brandName,
  contextLabel,
}: BrandAIAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/ai-market-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, brandId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data.answer ?? data.analysis ?? "پاسخی دریافت نشد.");
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارتباط با هوش مصنوعی.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#F58220]" />
        <h3 className="text-base font-black text-zinc-900">
          {contextLabel ?? `دستیار هوش مصنوعی${brandName ? ` برند ${brandName}` : ""}`}
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setPrompt(s);
              ask(s);
            }}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-[#F58220]/40 hover:text-[#F58220]"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(prompt)}
          placeholder="سوال خود را بنویسید..."
          className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
        />
        <button
          type="button"
          onClick={() => ask(prompt)}
          disabled={loading || !prompt.trim()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          پرسش
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {response && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#F58220]" />
            <span className="text-xs font-bold text-zinc-700">پاسخ هوش مصنوعی</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">
            {response}
          </p>
        </div>
      )}
    </div>
  );
}
