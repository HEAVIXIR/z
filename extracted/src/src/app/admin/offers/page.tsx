import { db } from "@/lib/db";
import { toFa, formatCompactPrice, faDate } from "@/lib/format";
import { CheckCircle2, Clock, XCircle, Wallet } from "lucide-react";
import OfferActions from "./OfferActions";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const [offers, stats] = await Promise.all([
    db.listingOffer.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            sellerName: true,
          },
        },
      },
    }),
    Promise.all([
      db.listingOffer.count(),
      db.listingOffer.count({ where: { status: "PENDING" } }),
      db.listingOffer.count({ where: { status: "ACCEPTED" } }),
      db.listingOffer.count({ where: { status: "REJECTED" } }),
    ]).then(([total, pending, accepted, rejected]) => ({
      total,
      pending,
      accepted,
      rejected,
    })),
  ]);

  const statCards = [
    {
      label: "کل پیشنهادها",
      value: stats.total,
      icon: Wallet,
      color: "text-[#F58220]",
      bg: "bg-[#F58220]/10",
    },
    {
      label: "در انتظار",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "پذیرفته‌شده",
      value: stats.accepted,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "ردشده",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">پیشنهادها</h1>
        <p className="mt-1 text-sm text-zinc-500">مدیریت پیشنهادهای خرید خریداران</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="mt-1 text-2xl font-black text-zinc-900">
                  {toFa(s.value)}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-right font-bold">آگهی</th>
                <th className="px-4 py-3 text-right font-bold">خریدار</th>
                <th className="px-4 py-3 text-right font-bold">مبلغ پیشنهادی</th>
                <th className="px-4 py-3 text-right font-bold">قیمت آگهی</th>
                <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                <th className="px-4 py-3 text-right font-bold">تاریخ</th>
                {/* FIX-ADMIN-EDITABILITY — actions column */}
                <th className="px-4 py-3 text-right font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {offers.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <a
                      href={`/listings/${o.listing?.slug ?? ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-bold text-zinc-900 hover:text-[#F58220]"
                    >
                      {o.listing?.title ?? "—"}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-700">
                      {o.buyerName ?? "—"}
                    </p>
                    <p className="text-[11px] text-zinc-400" dir="ltr">
                      {o.buyerPhone}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#F58220]">
                    {o.offerAmount ? formatCompactPrice(o.offerAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {o.listing?.price ? formatCompactPrice(o.listing.price) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        o.status === "PENDING"
                          ? "bg-amber-100 text-amber-700"
                          : o.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-700"
                            : o.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {o.status === "PENDING"
                        ? "در انتظار"
                        : o.status === "ACCEPTED"
                          ? "پذیرفته‌شده"
                          : o.status === "REJECTED"
                            ? "ردشده"
                            : o.status === "COUNTERED"
                              ? "پیشنهاد متقابل"
                              : o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {faDate(o.createdAt)}
                  </td>
                  {/* FIX-ADMIN-EDITABILITY — accept / reject / counter */}
                  <td className="px-4 py-3">
                    <OfferActions
                      offer={{
                        id: o.id,
                        offerAmount: o.offerAmount
                          ? o.offerAmount.toString()
                          : null,
                        status: o.status,
                        listing: { title: o.listing?.title ?? null },
                      }}
                    />
                  </td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    پیشنهادی ثبت نشده است.
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
