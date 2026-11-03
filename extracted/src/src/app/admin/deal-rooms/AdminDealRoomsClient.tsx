"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import { DEAL_STATUS_LABELS } from "@/lib/inspection-checklists";
import { Search, MessageSquare, FileText, Phone, ExternalLink } from "lucide-react";

interface Room {
  id: string;
  status: string;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  agreedPrice: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    price: string | null;
    province: string | null;
    city: string | null;
    images: { url: string }[];
  } | null;
  buyer: { id: string; name: string; mobile: string } | null;
  seller: { id: string; name: string; mobile: string } | null;
  messageCount: number;
  documentCount: number;
}

const FILTERS = ["ALL", "OPEN", "NEGOTIATING", "AGREED", "INSPECTION", "TRANSPORT", "COMPLETED", "CANCELLED"];

export default function AdminDealRoomsClient({
  rooms,
  statusColors,
}: {
  rooms: Room[];
  statusColors: Record<string, string>;
}) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (filter !== "ALL" && (r.status || "OPEN").toUpperCase() !== filter) return false;
      if (query) {
        const q = query.trim();
        if (
          !(
            r.listing?.title?.includes(q) ||
            r.buyer?.name?.includes(q) ||
            r.seller?.name?.includes(q) ||
            r.buyer?.mobile?.includes(q) ||
            r.seller?.mobile?.includes(q)
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, filter, query]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس عنوان آگهی / نام / موبایل…"
            className="flex-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                filter === f
                  ? "bg-[#F58220] text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-[#F58220]/40 hover:text-[#F58220]"
              }`}
            >
              {f === "ALL" ? "همه" : DEAL_STATUS_LABELS[f] ?? f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">
              <tr>
                <th className="px-3 py-3 font-bold">آگهی</th>
                <th className="px-3 py-3 font-bold">خریدار</th>
                <th className="px-3 py-3 font-bold">فروشنده</th>
                <th className="px-3 py-3 font-bold">قیمت توافق</th>
                <th className="px-3 py-3 font-bold">تأیید</th>
                <th className="px-3 py-3 font-bold">پیام/سند</th>
                <th className="px-3 py-3 font-bold">وضعیت</th>
                <th className="px-3 py-3 font-bold">به‌روزرسانی</th>
                <th className="px-3 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-zinc-400">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = (r.status || "OPEN").toUpperCase();
                  const statusLabel = DEAL_STATUS_LABELS[status] ?? status;
                  const statusColor = statusColors[status] ?? statusColors.OPEN;
                  const img = r.listing?.images[0]?.url;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                            {img ? (
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">🚜</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            {r.listing ? (
                              <Link
                                href={`/listings/${r.listing.slug}`}
                                target="_blank"
                                className="block truncate text-xs font-bold text-zinc-800 hover:text-[#F58220]"
                              >
                                {r.listing.title}
                              </Link>
                            ) : (
                              <span className="text-xs text-zinc-400">آگهی حذف شده</span>
                            )}
                            <div className="text-[10px] text-zinc-400">
                              {r.listing?.province ?? "—"}، {r.listing?.city ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.buyer ? (
                          <div>
                            <div className="text-[11px] font-bold text-zinc-800">{r.buyer.name}</div>
                            <a href={`tel:${r.buyer.mobile}`} className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Phone className="h-3 w-3" />
                              {toFa(r.buyer.mobile)}
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.seller ? (
                          <div>
                            <div className="text-[11px] font-bold text-zinc-800">{r.seller.name}</div>
                            <a href={`tel:${r.seller.mobile}`} className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <Phone className="h-3 w-3" />
                              {toFa(r.seller.mobile)}
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.agreedPrice ? (
                          <span className="text-[11px] font-bold text-emerald-700">
                            {formatCompactPrice(r.agreedPrice)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            r.buyerConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {r.buyerConfirmed ? "✓ خریدار" : "خریدار"}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            r.sellerConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {r.sellerConfirmed ? "✓ فروشنده" : "فروشنده"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                          <span className="inline-flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" />
                            {toFa(r.messageCount)}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <FileText className="h-3 w-3" />
                            {toFa(r.documentCount)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-zinc-500">
                        {faDate(r.updatedAt)}
                      </td>
                      <td className="px-3 py-3 text-left">
                        <Link
                          href={`/dashboard/deal-rooms/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-zinc-700 transition hover:border-[#F58220] hover:text-[#F58220]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          مشاهده
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
