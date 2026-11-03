"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  ArrowRight,
  Loader2,
  RefreshCw,
  Inbox,
} from "lucide-react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { useToast } from "@/hooks/use-toast";
import { toFa, timeAgo } from "@/lib/format";

/* ============================================================
   /dashboard/messages — user messaging inbox.
   Two-pane layout: conversation list (right in RTL) + thread
   view (left). Manual refresh is enough for V1 (no real-time).
   The page auto-opens a conversation when ?c=<id> is present
   (used by the listing-detail MessageButton).
   ============================================================ */

type OtherUser = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
};

type ListingPreview = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
};

type ConversationListItem = {
  id: string;
  listingId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  updatedAt: string;
  unreadCount: number;
  otherUser: OtherUser;
  listing: ListingPreview | null;
};

type ConversationDetail = {
  id: string;
  listingId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  otherUser: OtherUser;
  listing: ListingPreview | null;
};

type MessageItem = {
  id: string;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  mine: boolean;
};

function fullName(u: OtherUser | null): string {
  if (!u) return "کاربر هویکس";
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return name || u.companyName || "کاربر هویکس";
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-white"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
        </div>
      }
    >
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const initialC = searchParams.get("c");

  const [list, setList] = useState<ConversationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(initialC);
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /* ── Fetch conversation list ── */
  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setList(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      /* swallow — UI keeps the last list */
    } finally {
      setListLoading(false);
    }
  }, [router]);

  /* ── Fetch thread for `activeId` ── */
  const fetchThread = useCallback(
    async (id: string) => {
      setThreadLoading(true);
      try {
        const res = await fetch(
          `/api/messages/conversations/${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403 || res.status === 404) {
          toast({
            title: "دسترسی ممکن نیست",
            description: "این گفتگو در دسترس شما نیست.",
            variant: "destructive",
          });
          setActiveId(null);
          return;
        }
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setConv(data.conversation ?? null);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        // Bump the sidebar unread badge to 0 for this conversation.
        setList((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, unreadCount: 0 } : it,
          ),
        );
      } catch {
        /* keep last state */
      } finally {
        setThreadLoading(false);
      }
    },
    [router, toast],
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (activeId) fetchThread(activeId);
    else {
      setConv(null);
      setMessages([]);
    }
  }, [activeId, fetchThread]);

  // Auto-scroll thread to bottom on new messages.
  useEffect(() => {
    if (!threadLoading && messages.length) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, threadLoading]);

  function selectConversation(id: string) {
    setActiveId(id);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("c", id);
    router.replace(`/dashboard/messages?${sp.toString()}`, { scroll: false });
  }

  function backToList() {
    setActiveId(null);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("c");
    const q = sp.toString();
    router.replace(q ? `/dashboard/messages?${q}` : "/dashboard/messages", {
      scroll: false,
    });
  }

  async function sendMessage() {
    if (!activeId) return;
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch(
        `/api/messages/conversations/${encodeURIComponent(activeId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "ارسال ناموفق بود");
      }
      const msg = (await res.json()) as MessageItem;
      setMessages((prev) => [...prev, msg]);
      // Update sidebar preview.
      setList((prev) =>
        prev
          .map((it) =>
            it.id === activeId
              ? {
                  ...it,
                  lastMessagePreview: body.length > 120 ? body.slice(0, 120) + "…" : body,
                  lastMessageAt: msg.createdAt,
                }
              : it,
          )
          .sort((a, b) => {
            const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : Date.parse(a.updatedAt);
            const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : Date.parse(b.updatedAt);
            return tb - ta;
          }),
      );
      inputRef.current?.focus();
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "ارسال ناموفق بود",
        variant: "destructive",
      });
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send (Shift+Enter for newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const totalUnread = list.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[#0b0b0b] text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,130,32,0.08), transparent 70%)",
      }}
    >
      <DashboardNav />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 lg:px-6 lg:py-10">
        {/* Page heading */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white lg:text-3xl">
              پیام‌ها
            </h1>
            <p className="mt-1 text-xs text-white/55">
              گفتگوهای شما با فروشندگان و خریداران هویکس
              {totalUnread > 0 && (
                <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-[#F58220]/15 px-2 py-0.5 text-[11px] font-bold text-[#F58220]">
                  {toFa(totalUnread)} پیام خوانده‌نشده
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchList}
            disabled={listLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-bold text-white/65 transition hover:border-[#F58220]/40 hover:text-[#F58220] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${listLoading ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </button>
        </div>

        {/* Two-pane layout */}
        <div className="grid min-h-[28rem] flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          {/* Conversation list */}
          <aside
            className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] ${
              activeId ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-bold text-white/85">گفتگوها</h2>
              <p className="text-[11px] text-white/45">
                {toFa(list.length)} گفتگو
              </p>
            </div>
            <div className="max-h-[36rem] flex-1 overflow-y-auto">
              {listLoading && list.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : list.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Inbox className="mx-auto h-10 w-10 text-white/25" />
                  <p className="mt-3 text-sm text-white/45">
                    هنوز گفتگویی ندارید.
                  </p>
                  <p className="mt-1 text-[11px] text-white/35">
                    از صفحهٔ آگهی روی «پیام» بزنید تا گفتگو آغاز شود.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {list.map((c) => {
                    const active = c.id === activeId;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => selectConversation(c.id)}
                          className={`flex w-full gap-3 px-4 py-3 text-right transition ${
                            active ? "bg-[#F58220]/10" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-xs font-black text-[#F58220]">
                            {fullName(c.otherUser).slice(0, 1)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-bold text-white">
                                {fullName(c.otherUser)}
                              </span>
                              <span className="shrink-0 text-[10px] text-white/40">
                                {c.lastMessageAt
                                  ? timeAgo(c.lastMessageAt)
                                  : timeAgo(c.updatedAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-xs text-white/55">
                              {c.lastMessagePreview ?? "گفتگو آغاز شد"}
                            </p>
                            {c.listing && (
                              <p className="mt-1 line-clamp-1 text-[10px] text-[#F58220]/80">
                                {c.listing.title}
                              </p>
                            )}
                          </div>
                          {c.unreadCount > 0 && (
                            <span className="ml-1 mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F58220] px-1.5 text-[10px] font-black text-white">
                              {toFa(c.unreadCount)}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Thread panel */}
          <section
            className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] ${
              activeId ? "flex" : "hidden lg:flex"
            }`}
          >
            {!activeId ? (
              <EmptyThread />
            ) : threadLoading && !conv ? (
              <div className="flex flex-1 items-center justify-center py-16 text-white/40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conv ? (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <button
                    type="button"
                    onClick={backToList}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-[#F58220]/40 hover:text-[#F58220] lg:hidden"
                    aria-label="بازگشت به فهرست"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-xs font-black text-[#F58220]">
                    {fullName(conv.otherUser).slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {fullName(conv.otherUser)}
                    </div>
                    {conv.listing && (
                      <Link
                        href={`/listings/${conv.listing.slug}`}
                        className="line-clamp-1 text-[11px] text-[#F58220]/80 hover:underline"
                      >
                        {conv.listing.title}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-16 text-center text-white/40">
                      <MessageSquare className="h-10 w-10 text-white/25" />
                      <p className="mt-3 text-sm">هنوز پیامی رد و بدل نشده است.</p>
                      <p className="mt-1 text-[11px] text-white/35">
                        اولین پیام را ارسال کنید.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {messages.map((m) => (
                        <li
                          key={m.id}
                          className={`flex ${m.mine ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[78%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                              m.mine
                                ? "rounded-tr-sm bg-[#F58220] text-white"
                                : "rounded-tl-sm bg-white/[0.06] text-white/90"
                            }`}
                          >
                            {m.body}
                            <span
                              className={`mt-1 block text-[10px] ${
                                m.mine ? "text-white/70" : "text-white/40"
                              }`}
                            >
                              {timeAgo(m.createdAt)}
                              {m.mine && (m.read ? " · خوانده شد" : " · تحویل شد")}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div ref={threadEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t border-white/10 p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      placeholder="پیام خود را بنویسید…"
                      className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#F58220]/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F58220] text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
                      aria-label="ارسال پیام"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 -scale-x-100" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/35">
                    Enter برای ارسال · Shift+Enter برای خط جدید
                  </p>
                </div>
              </>
            ) : (
              <EmptyThread />
            )}
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t border-white/10 py-6 text-center text-[11px] text-white/35">
        HEAVIX © {toFa(new Date().getFullYear())} — بازار ماشین‌آلات صنعتی
      </footer>
    </div>
  );
}

function EmptyThread() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F58220]/10 text-[#F58220]">
        <MessageSquare className="h-8 w-8" />
      </div>
      <p className="mt-4 text-sm font-bold text-white">
        گفتگویی را برای مشاهده انتخاب کنید
      </p>
      <p className="mt-1 max-w-xs text-xs text-white/45">
        از فهرست گفتگوها یک مورد را برگزینید، یا از صفحهٔ آگهی روی «پیام» بزنید تا
        گفتگو آغاز شود.
      </p>
    </div>
  );
}
