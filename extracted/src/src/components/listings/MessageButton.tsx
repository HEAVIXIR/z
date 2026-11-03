"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   MessageButton — starts (or reopens) a 1-1 conversation about a
   specific listing and jumps the caller straight into the thread
   on /dashboard/messages?c=<conversationId>.

   - If the user is not logged in, clicking redirects to /login.
   - If the caller IS the seller of this listing, the button is
     disabled with a hint (you can't message yourself).
   ============================================================ */

type Props = {
  listingId: string;
  sellerId: string | null;
  isOwner?: boolean;
  title?: string;
  label?: string;
  className?: string;
};

export default function MessageButton({
  listingId,
  sellerId,
  isOwner = false,
  label = "پیام",
  className = "",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (isOwner) {
      toast({
        title: "این آگهی متعلق به شماست",
        description: "نمی‌توانید به خودتان پیام بدهید.",
      });
      return;
    }
    if (!sellerId) {
      toast({
        title: "فروشنده مشخص نیست",
        description: "برای این آگهی امکان ارسال پیام وجود ندارد.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/messages/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, otherUserId: sellerId }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در ایجاد گفتگو");
      }
      const data = await res.json();
      router.push(`/dashboard/messages?c=${encodeURIComponent(data.id)}`);
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "عملیات ناموفق بود",
        variant: "destructive",
      });
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || isOwner}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-white/85 transition hover:border-[#F58220]/40 hover:text-[#F58220] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {isOwner ? "آگهی شما" : label}
    </button>
  );
}
