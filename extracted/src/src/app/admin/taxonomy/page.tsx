import Link from "next/link";
import { db } from "@/lib/db";
import { toFa } from "@/lib/format";
import {
  FolderTree,
  ArrowLeftRight,
  Wrench,
  Factory,
  MapPin,
  Tags,
  ChevronLeft,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "تاکسونومی — هویکس" };

export default async function TaxonomyHubPage() {
  // Stats — parallel fetch
  const [
    catCount,
    txnCount,
    svcCount,
    indCount,
    countryCount,
    attrCount,
  ] = await Promise.all([
    db.category.count(),
    db.transactionType.count(),
    db.serviceType.count(),
    db.applicationIndustry.count(),
    db.country.count(),
    db.attributeDefinition.count(),
  ]);

  const cards = [
    {
      title: "مدیریت دسته‌ها",
      desc: "درخت دسته‌بندی کاتالوگ با لایه (CATALOG / MARKETPLACE / SERVICE / FALLBACK)، taxPath و صنایع کاربرد پیوند‌خورده.",
      href: "/admin/categories",
      icon: FolderTree,
      count: catCount,
      accent: "text-orange-600",
      ring: "ring-orange-100",
    },
    {
      title: "انواع معامله",
      desc: "لایه تراکنش — SALE / RENT / WANTED / QUOTE / AUCTION / SERVICE_REQUEST و … جدا از دسته‌بندی.",
      href: "/admin/taxonomy/transactions",
      icon: ArrowLeftRight,
      count: txnCount,
      accent: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    {
      title: "انواع خدمت",
      desc: "لایه خدمت — INSPECTION / REPAIR / MAINTENANCE / TRANSPORT / CONSULTING / VALUATION و …",
      href: "/admin/taxonomy/services",
      icon: Wrench,
      count: svcCount,
      accent: "text-sky-600",
      ring: "ring-sky-100",
    },
    {
      title: "صنایع کاربرد",
      desc: "۱۶ صنعت کاربرد (Mining، Road، Oil&Gas، …) — بُعدی مستقل از صنعت برند.",
      href: "/admin/taxonomy/industries",
      icon: Factory,
      count: indCount,
      accent: "text-amber-600",
      ring: "ring-amber-100",
    },
    {
      title: "مکان‌ها",
      desc: "درخت کشور / استان / شهر — بُعد مستقل موقعیت برای آگهی‌ها و کاربران.",
      href: "/admin/taxonomy/locations",
      icon: MapPin,
      count: countryCount,
      accent: "text-rose-600",
      ring: "ring-rose-100",
    },
    {
      title: "برندها",
      desc: "کاتالوگ برندها با خانواده، نوع، وضعیت و دامنه.",
      href: "/admin/taxonomy/brands",
      icon: Building2,
      accent: "text-zinc-700",
      ring: "ring-zinc-100",
    },
    {
      title: "ویژگی‌ها",
      desc: "AttributeDefinition و گزینه‌ها — ویژگی‌های فنی قابل فیلتر برای هر دسته.",
      href: "/admin/taxonomy/attributes",
      icon: Tags,
      count: attrCount,
      accent: "text-violet-600",
      ring: "ring-violet-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">تاکسونومی</h1>
        <p className="mt-1 text-sm text-zinc-500">
          مدیریت دسته‌ها، لایه‌های تراکنش/خدمت، صنایع کاربرد و مکان‌ها — طبق
          HBR-1.0.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className={`group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ${c.ring} transition hover:-translate-y-0.5 hover:border-[#F58220] hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 ${c.accent}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                {typeof c.count === "number" && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                    {toFa(c.count)}
                  </span>
                )}
              </div>
              <h3 className="mt-4 flex items-center gap-1 text-lg font-bold text-zinc-900">
                {c.title}
                <ChevronLeft
                  className="h-4 w-4 text-zinc-300 transition group-hover:-translate-x-1 group-hover:text-[#F58220]"
                />
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                {c.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
