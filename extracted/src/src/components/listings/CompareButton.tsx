"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompare, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   CompareButton — adds the current listing to the comparison
   session (via localStorage pending queue) and navigates to
   /compare. The compare page picks up the pending ID on mount
   and creates a fresh comparison session.

   Storage contract (mirrors /compare):
     heavix:compare:pendingListingIds — JSON array of listing IDs
   ============================================================ */

const PENDING_KEY = "heavix:compare:pendingListingIds";
const MAX_ITEMS = 5;

export default function CompareButton({
  listingId,
  title,
}: {
  listingId: string;
  title?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    setBusy(true);
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      let arr: string[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) arr = parsed.filter((x) => typeof x === "string");
        } catch {
          arr = [];
        }
      }
      // Avoid duplicates.
      if (!arr.includes(listingId)) {
        if (arr.length >= MAX_ITEMS) {
          toast({
            title: "حداکثر موارد",
            description: `در حال حاضر ${MAX_ITEMS} مورد در صف مقایسه است. ابتدا به /compare بروید.`,
            variant: "destructive",
          });
          setBusy(false);
          return;
        }
        arr.push(listingId);
      }
      localStorage.setItem(PENDING_KEY, JSON.stringify(arr));
      setAdded(true);
      toast({
        title: "به مقایسه اضافه شد",
        description: title ? `"${title}" به لیست مقایسه افزوده شد.` : undefined,
      });
      setTimeout(() => {
        router.push("/compare");
      }, 400);
    } catch {
      toast({
        title: "خطا",
        description: "افزودن به مقایسه ناموفق بود.",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F58220]/30 bg-[#F58220]/10 text-sm font-bold text-[#F58220] transition hover:bg-[#F58220]/15 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : added ? (
        <Check className="h-4 w-4" />
      ) : (
        <GitCompare className="h-4 w-4" />
      )}
      {added ? "اضافه شد — در حال انتقال..." : "افزودن به مقایسه"}
    </button>
  );
}
