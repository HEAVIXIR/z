import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import LocationsManager from "./LocationsManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "مکان‌ها — هویکس" };

export default function LocationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>مکان‌ها</span>
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-zinc-900">
          <MapPin className="h-6 w-6 text-[#F58220]" />
          مکان‌ها
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          درخت کشور / استان / شهر (HBR-1.0 §23) — بُعد مستقل موقعیت.
        </p>
      </div>

      <LocationsManager />
    </div>
  );
}
