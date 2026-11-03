"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Loader2,
  Handshake,
  Search,
  X,
  Check,
  XCircle,
  Trash2,
  Plus,
  Building2,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toFa, faDate, timeAgo } from "@/lib/format";

/* ============================================================
   PartnershipSection — admin panel for company-to-company
   partnership links. Mounted on /admin/companies/[id].
   - Lists accepted partners + pending requests (in/out).
   - Search + invite another company.
   - Accept / reject incoming requests.
   - Remove any partnership.
   ============================================================ */

type Partner = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  province: string | null;
  verified: boolean;
  _count?: { listings: number };
  listingsCount?: number;
};

type PartnerRow = {
  id: string;
  status: string; // PENDING | ACCEPTED | REJECTED
  requestedAt: string;
  acceptedAt: string | null;
  notes: string | null;
  direction: "OUTGOING" | "INCOMING";
  partner: Partner;
};

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  ACCEPTED: "تأیید شده",
  REJECTED: "رد شده",
};

export default function PartnershipSection({
  companyId,
  initial,
}: {
  companyId: string;
  initial: { outgoing: PartnerRow[]; incoming: PartnerRow[] };
}) {
  const [rows, setRows] = useState<{
    outgoing: PartnerRow[];
    incoming: PartnerRow[];
  }>(initial);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Partner[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/company/partners?companyId=${companyId}`, { cache: "no-store" });
      const json = await res.json();
      setRows({
        outgoing: json.outgoing ?? [],
        incoming: json.incoming ?? [],
      });
    } catch (e: any) {
      setError(e?.message ?? "خطا در بارگذاری همکاران");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Debounced company search (uses public /api/companies).
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies?q=${encodeURIComponent(q)}&limit=10`);
        const json = await res.json();
        // Exclude self + already-listed.
        const existingIds = new Set<string>([
          ...rows.outgoing.map((r) => r.partner.id),
          ...rows.incoming.map((r) => r.partner.id),
          companyId,
        ]);
        const filtered = (json.companies || [])
          .filter((c: Partner) => !existingIds.has(c.id))
          .map((c: any) => ({
            ...c,
            listingsCount: c.listingsCount ?? c._count?.listings ?? 0,
          }));
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, rows, companyId]);

  const invite = async (partnerId: string) => {
    setBusy(partnerId);
    setError(null);
    try {
      const res = await fetch(`/api/company/partners?companyId=${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, partnerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "خطا در ارسال درخواست همکاری");
      setSearch("");
      setResults([]);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "خطا در ارسال درخواست");
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, action: "accept" | "reject" | "remove") => {
    setBusy(id);
    setError(null);
    try {
      const url =
        action === "remove"
          ? `/api/company/partners/${id}?companyId=${companyId}`
          : `/api/company/partners/${id}?companyId=${companyId}`;
      const res = await fetch(url, {
        method: action === "remove" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "remove" ? undefined : JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "خطا در عملیات");
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "خطا در عملیات");
    } finally {
      setBusy(null);
    }
  };

  const cardCls = "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4";

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2">
        <Handshake className="h-5 w-5 text-[#F58220]" />
        <h2 className="text-lg font-black text-zinc-900">شبکه همکاران</h2>
        <span className="text-xs text-zinc-400">
          ({toFa(rows.outgoing.filter((r) => r.status === "ACCEPTED").length + rows.incoming.filter((r) => r.status === "ACCEPTED").length)} همکار تأییدشده)
        </span>
        <button
          onClick={reload}
          disabled={loading}
          className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:border-[#F58220] hover:text-[#F58220] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          به‌روزرسانی
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Search + invite */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-zinc-600">
          دعوت از شرکت‌های دیگر
        </label>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام شرکت را بنویسید..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        </div>
        {searchLoading && (
          <p className="mt-1.5 text-[11px] text-zinc-400">در حال جستجو...</p>
        )}
        {results.length > 0 && (
          <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
            {results.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2 last:border-b-0"
              >
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-800">{c.name}</p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {[c.province, c.city].filter(Boolean).join("، ")}
                    {c.listingsCount ? ` · ${toFa(c.listingsCount)} آگهی` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => invite(c.id)}
                  disabled={busy === c.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#F58220] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#ff8c38] disabled:opacity-60"
                >
                  {busy === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  دعوت
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests (pending) */}
      {rows.incoming.filter((r) => r.status === "PENDING").length > 0 && (
        <div>
          <p className="mb-2 text-xs font-black text-zinc-700">درخواست‌های دریافتی</p>
          <div className="space-y-2">
            {rows.incoming
              .filter((r) => r.status === "PENDING")
              .map((r) => (
                <PartnerRowItem
                  key={r.id}
                  row={r}
                  busy={busy === r.id}
                  onAccept={() => act(r.id, "accept")}
                  onReject={() => act(r.id, "reject")}
                  onRemove={() => act(r.id, "remove")}
                />
              ))}
          </div>
        </div>
      )}

      {/* Accepted partners + outgoing pending */}
      <div>
        <p className="mb-2 text-xs font-black text-zinc-700">
          همکاران ({toFa(rows.outgoing.length + rows.incoming.filter((r) => r.status !== "PENDING").length)})
        </p>
        {rows.outgoing.length === 0 && rows.incoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
            هنوز همکاری ثبت نشده. با جستجوی نام شرکت، دعوت‌نامه ارسال کنید.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.outgoing.map((r) => (
              <PartnerRowItem
                key={r.id}
                row={r}
                busy={busy === r.id}
                onAccept={() => act(r.id, "accept")}
                onReject={() => act(r.id, "reject")}
                onRemove={() => act(r.id, "remove")}
              />
            ))}
            {rows.incoming
              .filter((r) => r.status !== "PENDING")
              .map((r) => (
                <PartnerRowItem
                  key={r.id}
                  row={r}
                  busy={busy === r.id}
                  onAccept={() => act(r.id, "accept")}
                  onReject={() => act(r.id, "reject")}
                  onRemove={() => act(r.id, "remove")}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerRowItem({
  row,
  busy,
  onAccept,
  onReject,
  onRemove,
}: {
  row: PartnerRow;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  const p = row.partner;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
        {p.logoUrl ? (
          <img src={p.logoUrl} alt={p.name} className="h-full w-full object-contain" />
        ) : (
          <Building2 className="h-4 w-4 text-zinc-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/companies/${encodeURIComponent(p.slug)}`}
            target="_blank"
            className="truncate text-xs font-bold text-zinc-800 hover:text-[#F58220]"
          >
            {p.name}
          </Link>
          {p.verified && <Check className="h-3 w-3 text-emerald-500" />}
        </div>
        <p className="text-[10px] text-zinc-500">
          {[p.province, p.city].filter(Boolean).join("، ")}
          {p.listingsCount ? ` · ${toFa(p.listingsCount)} آگهی` : ""}
          {" · "}
          {row.direction === "OUTGOING" ? "دعوت از طرف شما" : "دعوت‌شده"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_CLS[row.status] ?? "bg-zinc-100 text-zinc-500"}`}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
        {row.status === "PENDING" && row.direction === "INCOMING" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 text-[10px] font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
              title="پذیرفتن"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              پذیرفتن
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-red-500 hover:bg-red-50 disabled:opacity-60"
              title="رد کردن"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {row.status === "ACCEPTED" && (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-red-500 hover:bg-red-50 disabled:opacity-60"
            title="حذف همکاری"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
        {row.status === "REJECTED" && (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-60"
            title="حذف"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
