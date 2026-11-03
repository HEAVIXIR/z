"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { toFa } from "@/lib/format";

/* BrandRowActions — client-side actions cell for each brand row in the
   server-rendered brands list. Contains the existing Edit link plus a
   new Delete button (with confirm + safety check). */
export function BrandRowActions({
  brandId,
  brandName,
  listingsCount,
}: {
  brandId: string;
  brandName: string;
  listingsCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (listingsCount > 0) {
      alert(
        `این برند ${toFa(listingsCount)} آگهی فعال دارد و قابل حذف نیست. ابتدا آگهی‌ها را منتقل یا حذف کنید.`,
      );
      return;
    }
    if (!confirm(`حذف برند «${brandName}»؟ این عمل قابل بازگشت نیست.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/taxonomy/brands/${brandId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "حذف ناموفق بود.");
      }
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "خطا در حذف.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href={`/admin/taxonomy/brands/${brandId}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
        title="ویرایش"
      >
        <Edit className="h-4 w-4" />
      </Link>
      <button
        onClick={remove}
        disabled={busy}
        title="حذف"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
