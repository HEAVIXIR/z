"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Paperclip,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  DEAL_DOC_TYPE_LABELS,
  DEAL_STATUS_LABELS,
} from "@/lib/inspection-checklists";

interface DealRoomPayload {
  id: string;
  status: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  agreedPrice: string | null;
  role: "BUYER" | "SELLER";
  listing: {
    id: string;
    slug: string;
    title: string;
    price: string | null;
    province: string | null;
    city: string | null;
    images: { url: string }[];
  } | null;
  messages: {
    id: string;
    senderRole: string;
    senderName: string | null;
    message: string;
    attachmentUrl: string | null;
    createdAt: string;
  }[];
  documents: {
    id: string;
    type: string;
    url: string;
    uploadedBy: string | null;
    status: string;
    createdAt: string;
  }[];
}

const STATUS_OPTIONS = [
  "OPEN",
  "NEGOTIATING",
  "AGREED",
  "INSPECTION",
  "TRANSPORT",
  "COMPLETED",
  "CANCELLED",
];

const DOC_TYPES = [
  "CONTRACT",
  "INSPECTION_REPORT",
  "INVOICE",
  "OWNERSHIP_PROOF",
  "TRANSPORT_DOC",
  "OTHER",
];

export default function DealRoomClient({ dealRoom }: { dealRoom: DealRoomPayload }) {
  const [messages, setMessages] = useState(dealRoom.messages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState(dealRoom.agreedPrice ?? "");
  const [status, setStatus] = useState(dealRoom.status);
  const [buyerConfirmed, setBuyerConfirmed] = useState(dealRoom.buyerConfirmed);
  const [sellerConfirmed, setSellerConfirmed] = useState(dealRoom.sellerConfirmed);
  const [docType, setDocType] = useState<string>("CONTRACT");
  const [docUrl, setDocUrl] = useState("");
  const [docUploading, setDocUploading] = useState(false);
  const [docs, setDocs] = useState(dealRoom.documents);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const message = text.trim();
    if (!message) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/deal-rooms/${dealRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در ارسال پیام");
      }
      const { message: msg } = await res.json();
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setSending(false);
    }
  }, [text, dealRoom.id]);

  const updateRoom = useCallback(async (patch: Record<string, unknown>) => {
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/deal-rooms/${dealRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در به‌روزرسانی");
      }
      const { dealRoom: updated } = await res.json();
      setStatus(updated.status);
      setBuyerConfirmed(updated.buyerConfirmed);
      setSellerConfirmed(updated.sellerConfirmed);
      setAgreedPrice(updated.agreedPrice ?? "");
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setUpdating(false);
    }
  }, [dealRoom.id]);

  const uploadDocument = useCallback(async () => {
    if (!docUrl.trim()) return;
    setDocUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deal-rooms/${dealRoom.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType, url: docUrl.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در بارگذاری سند");
      }
      const { document } = await res.json();
      setDocs((prev) => [document, ...prev]);
      setDocUrl("");
    } catch (e: any) {
      setError(e?.message ?? "خطا");
    } finally {
      setDocUploading(false);
    }
  }, [dealRoom.id, docType, docUrl]);

  const myConfirm = dealRoom.role === "BUYER" ? buyerConfirmed : sellerConfirmed;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Messages + status controls */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Chat */}
        <section className="flex h-[34rem] flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
            گفتگو
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-xs text-white/40">
                هنوز پیامی رد و بدل نشده است. اولین پیام را ارسال کنید.
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.senderRole === dealRoom.role;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-[#F58220] text-white"
                          : "border border-white/10 bg-white/[0.04] text-white/85"
                      }`}
                    >
                      {!mine && (
                        <div className="mb-0.5 text-[10px] font-bold opacity-70">
                          {m.senderName ?? (m.senderRole === "BUYER" ? "خریدار" : "فروشنده")}
                        </div>
                      )}
                      {m.message && <p className="leading-6">{m.message}</p>}
                      {m.attachmentUrl && (
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-[11px] underline opacity-90"
                        >
                          <Paperclip className="h-3 w-3" />
                          پیوست
                        </a>
                      )}
                      <div className="mt-1 text-[9px] opacity-60">
                        {new Date(m.createdAt).toLocaleString("fa-IR")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="پیام خود را بنویسید…"
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F58220] text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
              aria-label="ارسال"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </section>

        {/* Status controls */}
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div>
            <div className="mb-2 text-xs font-bold text-white/60">تغییر وضعیت اتاق</div>
            <select
              value={status}
              onChange={(e) => updateRoom({ status: e.target.value })}
              disabled={updating}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#F58220] focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">
                  {DEAL_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold text-white/60">قیمت توافق شده (تومان)</div>
            <div className="flex gap-2">
              <input
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۸۵۰۰۰۰۰۰۰۰"
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
              />
              <button
                onClick={() => updateRoom({ agreedPrice })}
                disabled={updating}
                className="rounded-lg border border-[#F58220]/40 bg-[#F58220]/10 px-3 py-2 text-[11px] font-bold text-[#F58220] transition hover:bg-[#F58220]/20 disabled:opacity-40"
              >
                ثبت
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold text-white/60">تأیید معامله</div>
            <button
              onClick={() =>
                updateRoom({
                  [dealRoom.role === "BUYER" ? "buyerConfirmed" : "sellerConfirmed"]: !myConfirm,
                })
              }
              disabled={updating}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${
                myConfirm
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-[#F58220]/40 bg-[#F58220]/10 text-[#F58220] hover:bg-[#F58220]/20"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {myConfirm ? "تأیید کردم ✓" : "تأیید می‌کنم"}
            </button>
            <p className="mt-2 text-[10px] text-white/40">
              وقتی هر دو طرف تأیید کنند، وضعیت اتاق به‌صورت خودکار به «توافق اولیه» تغییر می‌کند.
            </p>
          </div>

          {updating && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              در حال به‌روزرسانی…
            </div>
          )}
        </section>
      </div>

      {/* Upload document */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <Upload className="h-4 w-4 text-[#F58220]" />
          بارگذاری سند جدید
        </div>
        <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-[#F58220] focus:outline-none"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t} className="bg-zinc-900">
                {DEAL_DOC_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
          <input
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="URL سند (https://…)"
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#F58220] focus:outline-none"
          />
          <button
            onClick={uploadDocument}
            disabled={docUploading || !docUrl.trim()}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
          >
            {docUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            بارگذاری
          </button>
        </div>
        <p className="mt-2 text-[10px] text-white/40">
          سند بارگذاری شده پس از بررسی کارشناس هویکس تأیید یا رد می‌شود.
        </p>
      </section>
    </div>
  );
}
