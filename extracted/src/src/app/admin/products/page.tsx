import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import ProductsAdminClient from "./ProductsAdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "محصولات — هویکس" };

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/admin/taxonomy" className="hover:text-[#F58220]">
            تاکسونومی
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span>محصولات</span>
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-zinc-900">
          <Package className="h-6 w-6 text-[#F58220]" />
          محصولات
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          موجودیت کاتالوگی canonical — Brand → Model → Product (مرجع §۵).
        </p>
      </div>

      <ProductsAdminClient />
    </div>
  );
}
