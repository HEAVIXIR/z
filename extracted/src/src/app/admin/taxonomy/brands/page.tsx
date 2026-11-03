import Link from "next/link";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import {
  Building2,
  Globe,
  FolderTree,
  Cog,
  Star,
  CheckCircle2,
  XCircle,
  Edit,
} from "lucide-react";
import { BrandListFilters } from "./BrandListFilters";
import BatchLogoSearchButton from "./BatchActions/BatchLogoSearchButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "برندها — هویکس" };

// 15 type options
const TYPE_OPTIONS = [
  "MANUFACTURER", "DISTRIBUTOR", "DEALER", "RESELLER",
  "OEM", "IMPORTER", "EXPORTER", "WHOLESALER",
  "RETAILER", "SERVICE_PROVIDER", "RENTAL_COMPANY", "TRADING_COMPANY",
  "SUBSIDIARY", "JOINT_VENTURE", "PRIVATE_LABEL",
];

// 11 status options
const STATUS_OPTIONS = [
  "ACTIVE", "INACTIVE", "DRAFT", "PENDING", "ARCHIVED",
  "DISCONTINUED", "LEGACY", "HISTORICAL", "ACQUIRED", "MERGED", "BANKRUPT",
];

// 5 verification options
const VERIFICATION_OPTIONS = [
  "UNVERIFIED", "PENDING", "VERIFIED", "DISPUTED", "REJECTED",
];

export default async function TaxonomyBrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status || "";
  const typeFilter = sp.type || "";
  const verificationFilter = sp.verification || "";
  const industryFilter = sp.industry || "";
  const q = sp.q || "";

  // Parallel fetch brands + industries
  const [brands, industries, categoriesCount] = await Promise.all([
    db.brand.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(verificationFilter ? { verification: verificationFilter } : {}),
        ...(industryFilter ? { industries: { some: { industry: industryFilter } } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { nameEn: { contains: q } },
                { shortName: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        domains: { select: { domain: true } },
        industries: true,
        brandFamily: { select: { id: true, name: true } },
        _count: {
          select: {
            categories: true,
            models: { where: { status: "ACTIVE" } },
            listings: { where: { status: "PUBLISHED" } },
          },
        },
      },
      take: 200,
    }),
    db.industry.findMany({
      orderBy: { sortOrder: "asc" },
      select: { key: true, nameFa: true, nameEn: true },
    }),
    db.category.count(),
  ]);

  // Status badge — color-coded
  const statusBadge = (status: string) => {
    if (status === "ACTIVE")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          فعال
        </span>
      );
    if (status === "LEGACY" || status === "HISTORICAL")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          {status === "LEGACY" ? "میراثی" : "تاریخی"}
        </span>
      );
    if (status === "DISCONTINUED")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
          <XCircle className="h-3 w-3" />
          متوقف‌شده
        </span>
      );
    if (status === "ARCHIVED")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
          <XCircle className="h-3 w-3" />
          بایگانی
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
        {status}
      </span>
    );
  };

  // Verification badge
  const verificationBadge = (v: string | null) => {
    if (!v || v === "UNVERIFIED")
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
          تأیید نشده
        </span>
      );
    if (v === "VERIFIED")
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          تأیید شده
        </span>
      );
    if (v === "PENDING")
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          در انتظار
        </span>
      );
    if (v === "DISPUTED")
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
          مورد اختلاف
        </span>
      );
    if (v === "REJECTED")
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
          رد شده
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
        {v}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">برندها</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {toFa(brands.length)} برند · {toFa(categoriesCount)} دسته‌بندی
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BatchLogoSearchButton />
          <Link
            href="/admin/brands/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F58220] px-6 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
          >
            + برند جدید
          </Link>
        </div>
      </div>

      <BrandListFilters
        typeOptions={TYPE_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        verificationOptions={VERIFICATION_OPTIONS}
        industries={industries}
        currentType={typeFilter}
        currentStatus={statusFilter}
        currentVerification={verificationFilter}
        currentIndustry={industryFilter}
        currentQ={q}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">برند</th>
                <th className="px-4 py-3 text-right font-bold">نوع</th>
                <th className="px-4 py-3 text-right font-bold">کشور</th>
                <th className="px-4 py-3 text-right font-bold">دامنه‌ها</th>
                <th className="px-4 py-3 text-right font-bold">دسته‌ها</th>
                <th className="px-4 py-3 text-right font-bold">مدل‌ها</th>
                <th className="px-4 py-3 text-right font-bold">آگهی‌ها</th>
                <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                <th className="px-4 py-3 text-right font-bold">تأیید</th>
                <th className="px-4 py-3 text-center font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-bold text-zinc-900">
                          {b.featured && (
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          )}
                          {b.name}
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {b.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.type ? (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700" dir="ltr">
                        {b.type}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {b.country ? (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-zinc-400" />
                        {b.country}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {b.domains.slice(0, 3).map((d) => (
                        <span
                          key={d.domain}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                        >
                          {d.domain}
                        </span>
                      ))}
                      {b.domains.length > 3 && (
                        <span className="text-[10px] text-zinc-400">
                          +{toFa(b.domains.length - 3)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-zinc-600">
                      <FolderTree className="h-3.5 w-3.5 text-zinc-400" />
                      {toFa(b._count.categories)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-zinc-600">
                      <Cog className="h-3.5 w-3.5 text-zinc-400" />
                      {toFa(b._count.models)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-zinc-800">
                    {toFa(b._count.listings)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(b.status)}</td>
                  <td className="px-4 py-3">{verificationBadge(b.verification)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/admin/taxonomy/brands/${b.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-400">
                    برندی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
