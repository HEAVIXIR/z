"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, Send, Eye, CheckCircle2, Plus, Loader2 } from "lucide-react";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /community — Public Q&A community page.
   Lists questions + ask form (modal).
   Dark theme public page.
   ============================================================ */

type Question = {
  id: string;
  title: string;
  body: string | null;
  listingId: string | null;
  status: string;
  viewCount: number;
  createdAt: string;
  _count?: { answers: number };
  answers?: Answer[];
};

type Answer = {
  id: string;
  body: string;
  isAccepted: boolean;
  createdAt: string;
};

export default function CommunityPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questions?limit=50");
      const json = await res.json();
      setQuestions(json.questions || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("عنوان سؤال الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("سؤال شما ثبت شد ✓");
        setTitle("");
        setBody("");
        setShowForm(false);
        await load();
      } else {
        showToast(json.error ?? "خطا در ثبت سؤال");
      }
    } catch {
      showToast("خطا در ارتباط با سرور");
    }
    setSubmitting(false);
  };

  const toggleAnswers = async (qid: string) => {
    if (openId === qid) {
      setOpenId(null);
      return;
    }
    setOpenId(qid);
    if (!answers[qid]) {
      try {
        const res = await fetch(`/api/questions/${qid}/answers`);
        const json = await res.json();
        setAnswers((p) => ({ ...p, [qid]: json.answers || [] }));
      } catch {
        /* ignore */
      }
    }
  };

  const submitAnswer = async (qid: string) => {
    const text = (answerDraft[qid] ?? "").trim();
    if (!text) {
      showToast("متن پاسخ الزامی است");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${qid}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast("پاسخ شما ثبت شد ✓");
        setAnswerDraft((p) => ({ ...p, [qid]: "" }));
        // Reload answers
        const ar = await fetch(`/api/questions/${qid}/answers`);
        const aj = await ar.json();
        setAnswers((p) => ({ ...p, [qid]: aj.answers || [] }));
        await load();
      } else {
        showToast(json.error ?? "خطا در ثبت پاسخ");
      }
    } catch {
      showToast("خطا در ارتباط با سرور");
    }
    setSubmitting(false);
  };

  return (
    <div className="site-theme min-h-screen bg-[#0b0b0b]" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b0b0b]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logos/heavix-logo-white.svg" alt="HEAVIX" className="h-8" />
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-white/50 hover:text-[#F58220]"
          >
            بازگشت به خانه
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        {/* Hero */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#F58220]">
              COMMUNITY
            </span>
            <h1 className="mt-2 text-4xl font-black text-white">انجمن هویکس</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
              پرسش‌های خود دربارهٔ ماشین‌آلات صنعتی، خرید، فروش، اجاره و قطعات را
              مطرح کنید — کارشناسان و کاربران هویکس پاسخ می‌دهند.
            </p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
          >
            <Plus className="h-4 w-4" />
            سؤال جدید
          </button>
        </div>

        {/* Ask form */}
        {showForm && (
          <form
            onSubmit={submitQuestion}
            className="mb-8 rounded-3xl border border-[#F58220]/30 bg-[#111] p-6"
          >
            <h2 className="mb-4 text-lg font-black text-white">پرسیدن سؤال</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">
                  عنوان سؤال *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: بهترین بیل مکانیکی برای معدن چیست؟"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#F58220]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-white/60">
                  جزئیات (اختیاری)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="توضیحات بیشتری دربارهٔ سؤال خود بنویسید…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-[#F58220]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-11 rounded-xl border border-white/10 px-5 text-sm font-bold text-white/60 hover:bg-white/5"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  ثبت سؤال
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Questions list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#111] p-12 text-center">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <p className="text-sm text-white/50">
              هنوز سؤالی مطرح نشده. اولین نفر باشید!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => {
              const isOpen = openId === q.id;
              const qAnswers = answers[q.id] ?? q.answers ?? [];
              const ansCount = q._count?.answers ?? qAnswers.length;
              return (
                <div
                  key={q.id}
                  className="rounded-3xl border border-white/10 bg-[#111] p-5"
                >
                  <button
                    onClick={() => toggleAnswers(q.id)}
                    className="flex w-full items-start gap-3 text-right"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F58220]/10 text-[#F58220]">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            q.status === "OPEN"
                              ? "bg-amber-500/15 text-amber-400"
                              : q.status === "ANSWERED"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-white/10 text-white/50"
                          }`}
                        >
                          {q.status === "OPEN"
                            ? "باز"
                            : q.status === "ANSWERED"
                              ? "پاسخ داده شده"
                              : q.status === "CLOSED"
                                ? "بسته"
                                : q.status}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                          <Eye className="h-3 w-3" />
                          {toFa(q.viewCount)}
                        </span>
                        <span className="text-[10px] text-white/40">
                          · {timeAgo(q.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-white">
                        {q.title}
                      </h3>
                      {q.body && (
                        <p className="mt-1 line-clamp-2 text-xs leading-6 text-white/55">
                          {q.body}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] font-bold text-[#F58220]">
                        {toFa(ansCount)} پاسخ · کلیک برای{" "}
                        {isOpen ? "بستن" : "مشاهده"}
                      </p>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {qAnswers.length === 0 ? (
                        <p className="text-xs text-white/40">
                          هنوز پاسخی ثبت نشده. اولین پاسخ‌دهنده باشید.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {qAnswers.map((a) => (
                            <div
                              key={a.id}
                              className={`rounded-2xl border p-3 ${
                                a.isAccepted
                                  ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                                  : "border-white/10 bg-[#0b0b0b]"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                {a.isAccepted && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    پاسخ پذیرفته شده
                                  </span>
                                )}
                                <span className="ml-auto text-[10px] text-white/35">
                                  {timeAgo(a.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs leading-6 text-white/75">
                                {a.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer box */}
                      <div className="mt-4">
                        <textarea
                          value={answerDraft[q.id] ?? ""}
                          onChange={(e) =>
                            setAnswerDraft((p) => ({ ...p, [q.id]: e.target.value }))
                          }
                          rows={2}
                          placeholder="پاسخ خود را بنویسید…"
                          className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#F58220]"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => submitAnswer(q.id)}
                            disabled={submitting}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#F58220] px-4 text-xs font-bold text-white hover:bg-[#ff8c38] disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            ارسال پاسخ
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
