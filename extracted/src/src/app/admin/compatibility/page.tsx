import Link from "next/link";
import { ChevronLeft, Share2 } from "lucide-react";
import CompatibilityManager from "./CompatibilityManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "گراف سازگاری — هویکس" };

export default function CompatibilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>گراف سازگاری</span>
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Share2 className="h-6 w-6 text-[#F58220]" />
          گراف سازگاری
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          یال‌های سازگاری بین موجودیت‌های کاتالوگ (Product / Machine / Part / Attachment / Model).
          مدل generic مطابق STEP 9.
        </p>
      </div>

      <CompatibilityManager />
    </div>
  );
}
