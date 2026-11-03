"use client";
import { useState, useEffect, useCallback } from "react";
import { XCircle, Loader2, Send, CheckCircle2, MessageSquare, X } from "lucide-react";
import { toFa } from "@/lib/format";

type Rejection = { id: string; reason: string; reasonLabel: string | null; adminNote: string; status: string; createdAt: string; listing: { id: string; title: string; slug: string; image: string | null }; messages: { id: string; senderRole: string; senderName: string | null; message: string; createdAt: string }[] };
const REASON_LABELS: Record<string,string> = { NO_IMAGE:"بدون تصویر", NO_PRICE:"بدون قیمت", NO_BRAND:"بدون برند", NO_CATEGORY:"بدون دسته", NO_DESCRIPTION:"توضیحات ناقص", INCOMPLETE:"اطلاعات ناقص", INAPPROPRIATE:"نامناسب", DUPLICATE:"تکراری", OTHER:"سایر" };
const STATUS_CFG: Record<string,{label:string;cls:string}> = { OPEN:{label:"باز",cls:"bg-amber-100 text-amber-700"}, RESOLVED:{label:"حل‌شده",cls:"bg-emerald-100 text-emerald-700"}, IGNORED:{label:"نادیده",cls:"bg-zinc-100 text-zinc-500"} };

export default function AdminRejectionsPage() {
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Rejection | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/admin/rejections-all"); const json = await res.json(); if (json.success) setRejections(json.data || []); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/rejections/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: replyText.trim() }) });
      const data = await res.json();
      if (data.success) {
        setSelected({ ...selected, messages: [...selected.messages, { id: data.id, senderRole: "ADMIN", senderName: "مدیر هویکس", message: replyText.trim(), createdAt: data.createdAt }] });
        setReplyText(""); load();
      }
    } catch {}
    setSending(false);
  };

  const resolveRejection = async (id: string) => {
    await fetch(`/api/rejections/${id}/messages`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESOLVED" }) });
    load(); if (selected?.id === id) setSelected({ ...selected, status: "RESOLVED" });
  };

  const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };
  const openCount = rejections.filter((r) => r.status === "OPEN").length;
  const resolvedCount = rejections.filter((r) => r.status === "RESOLVED").length;

  return (
    <div className="space-y-6">
      <div><h1 className="flex items-center gap-2 text-2xl font-black text-zinc-900"><XCircle className="h-6 w-6 text-[#F58220]" />رد آگهی‌ها و چت با فروشندگان</h1><p className="mt-1 text-sm text-zinc-500">{toFa(rejections.length)} رد کل · {toFa(openCount)} باز · {toFa(resolvedCount)} حل‌شده</p></div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div> : rejections.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center"><CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-300" /><p className="text-sm text-zinc-400">هیچ آگهی رد‌شده‌ای وجود ندارد.</p></div> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="space-y-3">
            {rejections.map((r) => { const sCfg = STATUS_CFG[r.status] ?? { label: r.status, cls: "bg-zinc-100 text-zinc-500" }; const isSelected = selected?.id === r.id; return (
              <button key={r.id} onClick={() => setSelected(r)} className={`w-full rounded-2xl border bg-white p-4 text-right shadow-sm transition ${isSelected ? "border-[#F58220] ring-2 ring-[#F58220]/20" : "border-zinc-200 hover:border-zinc-300"}`}>
                <div className="flex items-start gap-3">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">{r.listing.image ? <img src={r.listing.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-zinc-300">🚜</div>}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-800">{r.listing.title}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">{REASON_LABELS[r.reason] || r.reasonLabel || r.reason}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sCfg.cls}`}>{sCfg.label}</span>{r.messages.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400"><MessageSquare className="h-3 w-3" />{toFa(r.messages.length)}</span>}</div><p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">{r.adminNote}</p></div>
                  <span className="shrink-0 text-[10px] text-zinc-400">{fmtDate(r.createdAt)}</span>
                </div>
              </button>
            );})}
          </div>
          <div className="lg:sticky lg:top-4 lg:h-fit">
            {selected ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-zinc-800 line-clamp-1">{selected.listing.title}</h3><button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button></div><div className="mt-1 flex items-center gap-2"><span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">{REASON_LABELS[selected.reason] || selected.reasonLabel}</span><span className="text-[10px] text-zinc-400">{fmtDate(selected.createdAt)}</span></div></div>
                <div className="border-b border-zinc-100 bg-amber-50 px-4 py-3"><p className="text-[10px] font-bold text-amber-700">دلیل رد:</p><p className="mt-1 text-xs leading-5 text-amber-800">{selected.adminNote}</p></div>
                <div className="max-h-[300px] space-y-2 overflow-y-auto p-4">{selected.messages.length === 0 ? <p className="py-6 text-center text-xs text-zinc-400">هنوز پیامی exchanged نشده</p> : selected.messages.map((m) => (<div key={m.id} className={`flex ${m.senderRole === "ADMIN" ? "justify-start" : "justify-end"}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${m.senderRole === "ADMIN" ? "bg-[#F58220]/10 text-zinc-700" : "bg-blue-50 text-zinc-700"}`}><p className="mb-0.5 text-[9px] font-bold opacity-60">{m.senderRole === "ADMIN" ? "مدیر" : m.senderName || "فروشنده"}</p><p className="leading-5">{m.message}</p><p className="mt-1 text-[9px] opacity-40">{fmtDate(m.createdAt)}</p></div></div>))}</div>
                <div className="border-t border-zinc-100 p-3"><div className="flex gap-2"><input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} placeholder="پاسخ به فروشنده..." className="h-9 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white" /><button onClick={sendReply} disabled={sending || !replyText.trim()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F58220] text-white transition hover:bg-[#ff8c38] disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div>{selected.status === "OPEN" && <button onClick={() => resolveRejection(selected.id)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" />حل‌شده و انتشار آگهی</button>}</div>
              </div>
            ) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center"><MessageSquare className="mx-auto mb-3 h-10 w-10 text-zinc-300" /><p className="text-sm text-zinc-400">یک مورد را برای مشاهده چت انتخاب کنید</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
