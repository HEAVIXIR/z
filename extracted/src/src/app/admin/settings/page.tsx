import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import { toFa as _toFa } from "@/lib/format";
import SiteSettingsForm from "./SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const brandsCount = await db.brand.count();
  const catsCount = await db.category.count();
  const listingsCount = await db.listing.count();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">تنظیمات</h1>
        <p className="mt-1 text-sm text-zinc-500">
          پیکربندی کلی سایت و اطلاعات سیستم
        </p>
      </div>

      {/* System info */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">اطلاعات سیستم</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="نام پلتفرم" value="هویکس (HEAVIX)" />
          <InfoRow label="برند مادر" value="آریا ماشین جم" />
          <InfoRow label="برند خواهری" value="MEKANIX" />
          <InfoRow label="زبان" value="فارسی (RTL)" />
          <InfoRow label="پایگاه داده" value="SQLite" />
          <InfoRow label="فریم‌ورک" value="Next.js 16 + Tailwind v4" />
        </div>
      </div>

      {/* Data counts */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">آمار داده‌ها</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatBox label="برندها" value={brandsCount} />
          <StatBox label="دسته‌بندی‌ها" value={catsCount} />
          <StatBox label="آگهی‌ها" value={listingsCount} />
        </div>
      </div>

      {/* Admin account */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-zinc-900">حساب مدیریت</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="نام کاربری" value="admin" />
          <InfoRow label="سطح دسترسی" value="مدیر کل" />
        </div>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          برای تغییر رمز عبور، متغیرهای محیطی <code>ADMIN_USERNAME</code> و{" "}
          <code>ADMIN_PASSWORD</code> را در فایل <code>.env</code> تنظیم کنید.
        </p>
      </div>

      {/* Site content settings (editable) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <SiteSettingsForm />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <span className="text-xs font-bold text-zinc-500">{label}</span>
      <span className="text-sm font-bold text-zinc-800">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 text-center">
      <div className="text-3xl font-black text-[#F58220]">
        {toFa(value.toLocaleString("en-US"))}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
