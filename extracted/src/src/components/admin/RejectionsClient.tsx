"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Send,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { toFa, faDate } from "@/lib/format";

type RejectionMessage = {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
};

type Rejection = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  reason: string;
  reasonLabel: string;
  adminNote: string;
  status: string;
  createdAt: string;
  messages: RejectionMessage[];
};

export default function RejectionsClient({
  rejections,
}: {
  rejections: Rejection[];
}) {
  const [activeId, setActiveId] = useState<string | null>(
    rejections[0]?.id ?? null,
  );
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Rejection[]>(rejections);

  const active = items.find((r) => r.id === activeId);

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rejections/${active.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply, senderRole: "ADMIN" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق بود.");
      setItems(
        items.map((r) =>
          r.id === active.id
            ? {
                ...r,
                status: "OPEN",
                messages: [
                  ...r.messages,
                  {
                    id: data.id ?? `m-${Date.now()}`,
                    senderRole: "ADMIN",
                    senderName: "مدیر",
                    message: reply,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : r,
        ),
      );
      setReply("");
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارسال.");
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`/api/rejections/${id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      });
      setItems(
        items.map((r) => (r.id === id ? { ...r, status: "RESOLVED" } : r)),
      );
    } catch {
      setError("عملیات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  const reopen = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`/api/rejections/${id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen" }),
      });
      setItems(items.map((r) => (r.id === id ? { ...r, status: "OPEN" } : r)));
    } catch {
      setError("عملیات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-zinc-300" />
        <p className="mt-3 text-sm text-zinc-500">هیچ ردی ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* List */}
      <div className="space-y-2">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActiveId(r.id)}
            className={`w-full rounded-2xl border p-3 text-right transition ${
              activeId === r.id
                ? "border-[#F58220] bg-[#F58220]/5"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-bold text-zinc-900">
                {r.listingTitle}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  r.status === "RESOLVED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.status === "RESOLVED" ? "حل‌شده" : "باز"}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              {r.reasonLabel || r.reason}
            </p>
            <p className="mt-1 text-[10px] text-zinc-400">{faDate(r.createdAt)}</p>
          </button>
        ))}
      </div>

      {/* Chat panel */}
      {active && (
        <div className="flex h-[600px] flex-col rounded-2xl border border-zinc-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 p-4">
            <div className="min-w-0">
              <Link
                href={`/listings/${active.listingSlug}`}
                target="_blank"
                className="truncate text-sm font-black text-zinc-900 hover:text-[#F58220]"
              >
                {active.listingTitle}
              </Link>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                دلیل: {active.reasonLabel || active.reason}
              </p>
            </div>
            {active.status === "RESOLVED" ? (
              <button
                type="button"
                onClick={() => reopen(active.id)}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-amber-100 px-3 text-xs font-bold text-amber-700 transition hover:bg-amber-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                باز کردن مجدد
              </button>
            ) : (
              <button
                type="button"
                onClick={() => resolve(active.id)}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                حل‌شده
              </button>
            )}
          </div>

          {/* Admin note */}
          {active.adminNote && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
              <p className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                <AlertCircle className="h-3 w-3" />
                یادداشت مدیر: {active.adminNote}
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {active.messages.map((m) => {
              const isAdmin = m.senderRole === "ADMIN";
              return (
                <div
                  key={m.id}
                  className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl p-3 ${
                      isAdmin
                        ? "bg-[#F58220]/10 text-zinc-900"
                        : "bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold text-zinc-500">
                      {isAdmin ? "مدیر" : m.senderName || "فروشنده"}
                    </p>
                    <p className="text-sm leading-6">{m.message}</p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {faDate(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            {active.messages.length === 0 && (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-xs text-zinc-400">
                  پیامی در این گفتگو ثبت نشده است.
                </p>
              </div>
            )}
          </div>

          {/* Reply box */}
          <div className="border-t border-zinc-200 p-3">
            {error && (
              <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="پاسخ به فروشنده..."
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#F58220]"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={loading || !reply.trim()}
                className="inline-flex h-11 shrink-0 items-center gap-1 self-end rounded-xl bg-[#F58220] px-4 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
