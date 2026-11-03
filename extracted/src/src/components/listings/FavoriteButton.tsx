"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ============================================================
   FavoriteButton — heart toggle that adds/removes the current
   listing from the user's favorites via /api/favorites.

   - Auth required. If the user is not logged in, clicking
     redirects to /login.
   - `initialFavorited` lets a server component seed the state
     (e.g. the listing detail page already knows the user's
     favorites). When omitted, the button renders in the
     "outline" state and reconciles on first click.
   - `count` (optional) renders a small count next to the heart
     when > 0 — useful on listing cards.
   - `size` controls icon + click-target size; "sm" fits the
     top-right corner of a listing card image.
   ============================================================ */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { icon: string; pad: string; badge: string }> = {
  sm: { icon: "h-4 w-4", pad: "p-2", badge: "text-[10px]" },
  md: { icon: "h-5 w-5", pad: "p-2.5", badge: "text-xs" },
  lg: { icon: "h-6 w-6", pad: "p-3", badge: "text-sm" },
};

type Props = {
  listingId: string;
  initialFavorited?: boolean;
  count?: number;
  size?: Size;
  variant?: "overlay" | "solid";
  className?: string;
};

export default function FavoriteButton({
  listingId,
  initialFavorited = false,
  count: initialCount = 0,
  size = "md",
  variant = "overlay",
  className = "",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [fav, setFav] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const s = SIZES[size];

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    setBusy(true);
    try {
      if (fav) {
        const res = await fetch(
          `/api/favorites?listingId=${encodeURIComponent(listingId)}`,
          { method: "DELETE" },
        );
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا در حذف از علاقه‌مندی‌ها");
        }
        setFav(false);
        setCount((c) => Math.max(0, c - 1));
        toast({ title: "از علاقه‌مندی‌ها حذف شد" });
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا در افزودن به علاقه‌مندی‌ها");
        }
        setFav(true);
        setCount((c) => c + 1);
        toast({ title: "به علاقه‌مندی‌ها اضافه شد" });
      }
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "عملیات ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const base =
    variant === "overlay"
      ? "bg-black/55 text-white backdrop-blur hover:bg-black/70"
      : "border border-[#F58220]/40 bg-[#F58220]/10 text-[#F58220] hover:bg-[#F58220]/15";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={fav}
      aria-label={fav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      className={`relative inline-flex items-center justify-center rounded-full transition disabled:opacity-60 ${s.pad} ${base} ${className}`}
    >
      {busy ? (
        <Loader2 className={`${s.icon} animate-spin`} />
      ) : (
        <Heart
          className={`${s.icon} ${fav ? "fill-[#F58220] text-[#F58220]" : ""}`}
        />
      )}
      {count > 0 && (
        <span
          className={`absolute -bottom-1.5 -left-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#F58220] px-1 font-bold text-white ${s.badge}`}
        >
          {count > 99 ? "۹۹+" : toFaDigits(count)}
        </span>
      )}
    </button>
  );
}

function toFaDigits(n: number): string {
  const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/\d/g, (d) => FA[Number(d)] ?? d);
}
