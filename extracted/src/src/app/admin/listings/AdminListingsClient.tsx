"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Clock,
  Search,
  Loader2,
  X,
  Save,
  ExternalLink,
  CheckSquare,
  Square,
  Zap,
  Phone,
  ImageIcon,
  Upload,
  Image as ImageIcon2,
  Copy,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Settings2,
  ShieldCheck,
  ListFilter,
  BadgeCheck,
  XCircle,
} from "lucide-react";

/* ============================================================
   /admin/listings — full-featured listing management.

   Features (parity with major marketplace admin panels):
     • Stats bar (total, published, draft, sold, paused, featured, views)
     • Advanced filters (search, status, brand, category, featured, sort)
     • Bulk select + bulk actions (feature, publish, pause, extend, markSold, delete)
     • Per-row actions (feature toggle, publish/pause, extend, edit, duplicate, view, delete)
     • Detailed edit modal with image manager (add via URL/upload, set primary, remove)
     • Seller phone + source provenance display
   ============================================================ */

type Image = { id: string; url: string; isPrimary: boolean; sortOrder: number };

type Listing = {
  id: string;
  slug: string;
  title: string;
  shortDesc: string | null;
  description: string | null;
  price: string | null;
  priceType: string;
  listingType: string;
  status: string;
  featured: boolean;
  verified: boolean;
  showInLatest: boolean;
  condition: string | null;
  province: string | null;
  city: string | null;
  year: number | null;
  workingHours: number | null;
  viewCount: number;
  favoriteCount: number;
  sellerPhone: string | null;
  sellerName: string | null;
  sourceUrl: string | null;
  sourceSite: string | null;
  adminNotes: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  soldAt: string | null;
  createdAt: string;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string; icon: string | null } | null;
  images: Image[];
};

type Stats = {
  total: number;
  published: number;
  draft: number;
  sold: number;
  paused: number;
  featured: number;
  verified: number;
  hiddenFromLatest: number;
  totalViews: number;
};

type Brand = { id: string; name: string };
type Category = { id: string; name: string; parentId: string | null };

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  PUBLISHED: { label: "منتشرشده", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  DRAFT: { label: "پیش‌نویس", cls: "bg-zinc-100 text-zinc-500", dot: "bg-zinc-400" },
  SOLD: { label: "فروخته‌شده", cls: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  PAUSED: { label: "متوقفشده", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
};

const PRICE_TYPES: Record<string, string> = {
  NEGOTIABLE: "توافقی", FIXED: "مقطوع", CALL_FOR_PRICE: "تماس بگیرید", AUCTION: "مزایده",
};

const CONDITIONS: Record<string, string> = {
  NEW: "نو", USED: "کارکرده", REFURBISHED: "بازسازی‌شده", FOR_PARTS: "قطعات",
};

export default function AdminListingsClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [editing, setEditing] = useState<Listing | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  // Load brands + categories for filters + edit modal
  useEffect(() => {
    fetch("/api/taxonomy/brands?pageSize=300").then((r) => r.json()).then((d) => {
      if (d.data) setBrands(d.data.map((b: any) => ({ id: b.id, name: b.name })));
    }).catch(() => {});
    fetch("/api/taxonomy/categories").then((r) => r.json()).then((d) => {
      if (d.data) setCategories(d.data);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      if (brandFilter) params.set("brandId", brandFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (sort) params.set("sort", sort);
      if (verifiedFilter === "yes") params.set("verified", "true");
      if (verifiedFilter === "hidden") params.set("showInLatest", "false");
      const res = await fetch(`/api/admin/listings?${params}`);
      const json = await res.json();
      // API returns { listings: [...], total, stats } (NOT { success, data }).
      // Be defensive: accept either shape in case the response evolves.
      const rows = Array.isArray(json.listings) ? json.listings : (Array.isArray(json.data) ? json.data : []);
      setListings(rows);
      setStats(json.stats ?? null);
    } catch {
      setListings([]);
    }
    setLoading(false);
  }, [search, statusFilter, brandFilter, categoryFilter, sort, verifiedFilter]);

  useEffect(() => { load(); }, [load]);

  const action = async (id: string, act: string, extra?: any) => {
    try {
      await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, ...extra }),
      });
      load();
    } catch {}
  };

  const remove = async (id: string) => {
    if (!confirm("حذف این آگهی؟ این عمل قابل بازگشت نیست.")) return;
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    load();
  };

  const openEdit = async (l: Listing) => {
    // Fetch full detail to ensure all fields/images.
    // Single GET returns { listing: {...} } (NOT { success, data }).
    try {
      const res = await fetch(`/api/admin/listings/${l.id}`);
      const json = await res.json();
      const detail = json.listing ?? json.data;
      if (detail) {
        setEditing({ ...l, ...detail, images: Array.isArray(detail.images) ? detail.images : (l.images || []) });
      } else {
        setEditing({ ...l });
      }
    } catch {
      setEditing({ ...l });
    }
    setShowEditModal(true);
  };

  const runBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "delete" && !confirm(`${selected.size} آگهی حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    setBulkWorking(true);
    try {
      await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkAction, ids: Array.from(selected) }),
      });
      setSelected(new Set());
      setBulkAction("");
      load();
    } catch {}
    setBulkWorking(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === listings.length) setSelected(new Set());
    else setSelected(new Set(listings.map((l) => l.id)));
  };

  const fmtPrice = (p: string | null) => {
    if (!p) return "—";
    const n = Number(p);
    return isNaN(n) ? "—" : n.toLocaleString("fa-IR");
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  const daysUntilExpiry = (iso: string | null) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">آگهی‌ها</h1>
          <p className="mt-1 text-sm text-zinc-500">{stats?.total ?? 0} آگهی کل · {listings.length} نمایش داده شده</p>
        </div>
        <Link href="/listings/new" className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]">
          <Plus className="h-4 w-4" /> آگهی جدید
        </Link>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
          <StatCard label="کل" value={stats.total} icon={<Settings2 className="h-4 w-4" />} color="text-zinc-700 bg-zinc-100" />
          <StatCard label="منتشرشده" value={stats.published} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-700 bg-emerald-100" />
          <StatCard label="پیش‌نویس" value={stats.draft ?? stats.pending} icon={<Pencil className="h-4 w-4" />} color="text-zinc-600 bg-zinc-100" />
          <StatCard label="متوقف" value={stats.paused} icon={<EyeOff className="h-4 w-4" />} color="text-amber-700 bg-amber-100" />
          <StatCard label="فروخته‌شده" value={stats.sold} icon={<DollarSign className="h-4 w-4" />} color="text-blue-700 bg-blue-100" />
          <StatCard label="ویژه" value={stats.featured} icon={<Star className="h-4 w-4" />} color="text-amber-600 bg-amber-50" />
          <StatCard label="تأییدشده" value={stats.verified} icon={<ShieldCheck className="h-4 w-4" />} color="text-teal-700 bg-teal-100" />
          <StatCard label="مخفی از آخرین‌ها" value={stats.hiddenFromLatest} icon={<ListFilter className="h-4 w-4" />} color="text-purple-700 bg-purple-100" />
          <StatCard label="بازدید کل" value={stats.totalViews} icon={<TrendingUp className="h-4 w-4" />} color="text-zinc-700 bg-zinc-100" />
        </div>
      )}

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی عنوان..."
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-9 pl-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"
            />
          </div>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"
          >
            <option value="">همه برندها</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"
          >
            <option value="">همه دسته‌ها</option>
            {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220] focus:bg-white"
          >
            <option value="createdAt">جدیدترین</option>
            <option value="viewCount">پربازدیدترین</option>
            <option value="price_asc">ارزان‌ترین</option>
            <option value="price_desc">گران‌ترین</option>
            <option value="title">عنوان (الفبا)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
            {["", "PUBLISHED", "DRAFT", "PAUSED", "SOLD"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === s ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {s ? STATUS_CONFIG[s]?.label : "همه وضعیت‌ها"}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
            {[
              { v: "", l: "همه" },
              { v: "yes", l: "تأییدشده" },
              { v: "hidden", l: "مخفی از آخرین‌ها" },
            ].map((f) => (
              <button
                key={f.v}
                onClick={() => setVerifiedFilter(f.v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  verifiedFilter === f.v ? "bg-white text-[#F58220] shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F58220]/5 border border-[#F58220]/20 px-3 py-2">
            <span className="text-xs font-bold text-[#F58220]">{selected.size} انتخاب‌شده</span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-[#F58220]"
            >
              <option value="">انتخاب عملیات...</option>
              <optgroup label="نمایش در سکشن‌ها">
                <option value="feature">⭐ افزودن به آگهی‌های ویژه</option>
                <option value="unfeature">حذف از آگهی‌های ویژه</option>
                <option value="verify">🛡 افزودن به تأییدشده‌ها</option>
                <option value="unverify">حذف از تأییدشده‌ها</option>
                <option value="showInLatest">📋 نمایش در آخرین آگهی‌ها</option>
                <option value="hideFromLatest">🚫 مخفی کردن از آخرین آگهی‌ها</option>
              </optgroup>
              <optgroup label="وضعیت">
                <option value="publish">📢 انتشار</option>
                <option value="pause">⏸ توقف</option>
                <option value="extend">🔄 تمدید (۳۰ روز)</option>
                <option value="markSold">💰 علامت‌گذاری فروخته‌شده</option>
              </optgroup>
              <optgroup label="سایر">
                <option value="delete">🗑 حذف</option>
              </optgroup>
            </select>
            <button
              onClick={runBulk}
              disabled={!bulkAction || bulkWorking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F58220] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-40"
            >
              {bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              اجرا
            </button>
            <button
              onClick={() => { setSelected(new Set()); setBulkAction(""); }}
              className="mr-auto text-xs text-zinc-400 hover:text-zinc-600"
            >
              لغو انتخاب
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-3 text-center">
                    <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-[#F58220]">
                      {selected.size === listings.length && listings.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-bold">آگهی</th>
                  <th className="px-4 py-3 text-right font-bold">قیمت</th>
                  <th className="px-4 py-3 text-center font-bold">بازدید</th>
                  <th className="px-4 py-3 text-center font-bold">تماس</th>
                  <th className="px-4 py-3 text-center font-bold">سکشن‌ها</th>
                  <th className="px-4 py-3 text-center font-bold">انقضا</th>
                  <th className="px-4 py-3 text-center font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-center font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {listings.map((l) => {
                  const sCfg = STATUS_CONFIG[l.status] ?? { label: l.status, cls: "bg-zinc-100 text-zinc-500", dot: "bg-zinc-400" };
                  const days = daysUntilExpiry(l.expiresAt);
                  const isExpired = days !== null && days < 0 && l.status === "PUBLISHED";
                  return (
                    <tr key={l.id} className={`group transition hover:bg-zinc-50 ${selected.has(l.id) ? "bg-[#F58220]/5" : ""}`}>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => toggleSelect(l.id)} className="text-zinc-400 hover:text-[#F58220]">
                          {selected.has(l.id) ? <CheckSquare className="h-4 w-4 text-[#F58220]" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
                            {l.images[0]?.url ? (
                              <img src={l.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-lg">{l.category?.icon ?? "🚜"}</span>
                            )}
                            {l.images.length > 1 && (
                              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                                {l.images.length}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate font-bold text-zinc-800">
                              {l.featured && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                              {l.title}
                            </p>
                            <p className="truncate text-[11px] text-zinc-400">
                              {l.brand?.name ?? "—"} · {l.category?.name ?? "—"} · {l.city ?? "—"} · {l.year ?? "—"}
                            </p>
                            {l.sourceSite && (
                              <span className="mt-0.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500">
                                {l.sourceSite}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-800">
                        {l.price ? `${fmtPrice(l.price)} ت` : PRICE_TYPES[l.priceType] ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {(l.viewCount ?? 0).toLocaleString("fa-IR")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.sellerPhone ? (
                          <a
                            href={`tel:${l.sellerPhone}`}
                            dir="ltr"
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-700 hover:bg-[#F58220]/10 hover:text-[#F58220]"
                            title="تماس با فروشنده"
                          >
                            <Phone className="h-3 w-3" />
                            {l.sellerPhone}
                          </a>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button
                            onClick={() => action(l.id, "toggleFeatured")}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                              l.featured
                                ? "border-amber-200 bg-amber-50 text-amber-500"
                                : "border-zinc-200 text-zinc-300 hover:border-amber-200 hover:text-amber-500"
                            }`}
                            title={l.featured ? "در آگهی‌های ویژه — کلیک برای حذف" : "افزودن به آگهی‌های ویژه"}
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => action(l.id, "toggleVerified")}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                              l.verified
                                ? "border-teal-200 bg-teal-50 text-teal-600"
                                : "border-zinc-200 text-zinc-300 hover:border-teal-200 hover:text-teal-600"
                            }`}
                            title={l.verified ? "در تأییدشده‌ها — کلیک برای حذف" : "افزودن به تأییدشده‌ها"}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => action(l.id, "toggleShowInLatest")}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                              l.showInLatest
                                ? "border-blue-200 bg-blue-50 text-blue-500"
                                : "border-zinc-200 text-zinc-300 hover:border-blue-200 hover:text-blue-500"
                            }`}
                            title={l.showInLatest ? "در آخرین آگهی‌ها — کلیک برای مخفی" : "نمایش در آخرین آگهی‌ها"}
                          >
                            <ListFilter className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                          {l.featured && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">ویژه</span>
                          )}
                          {l.verified && (
                            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-700">تأییدشده</span>
                          )}
                          {l.showInLatest ? (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">آخرین‌ها</span>
                          ) : (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">مخفی</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.status === "PUBLISHED" && days !== null ? (
                          <span className={`text-[11px] font-bold ${isExpired ? "text-red-600" : days < 7 ? "text-amber-600" : "text-zinc-500"}`}>
                            {isExpired ? "منقضی" : `${days.toLocaleString("fa-IR")} روز`}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sCfg.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dot}`} />
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Publish/pause */}
                          <button
                            onClick={() => action(l.id, "", { status: l.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED" })}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${l.status === "PUBLISHED" ? "text-emerald-500" : "text-zinc-300 hover:text-emerald-500"}`}
                            title={l.status === "PUBLISHED" ? "توقف انتشار" : "انتشار"}
                          >
                            {l.status === "PUBLISHED" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          {/* Extend */}
                          <button
                            onClick={() => action(l.id, "extend")}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-blue-50 hover:text-blue-500"
                            title="تمدید (۳۰ روز)"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                          {/* Mark sold */}
                          {l.status !== "SOLD" && (
                            <button
                              onClick={() => action(l.id, "markSold")}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-blue-50 hover:text-blue-500"
                              title="فروخته‌شده"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Edit (full edit page) */}
                          <Link
                            href={`/admin/listings/${l.id}/edit`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]"
                            title="ویرایش کامل"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          {/* Duplicate */}
                          <button
                            onClick={() => action(l.id, "duplicate")}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                            title="ساخت کپی"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {/* View on site */}
                          <Link
                            href={`/listings/${l.slug}`}
                            target="_blank"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:text-blue-500"
                            title="مشاهده در سایت"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          {/* Reject with reason */}
                          <button
                            onClick={() => { setRejecting(l); setShowRejectModal(true); }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                            title="رد آگهی با توضیح"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => remove(l.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-zinc-400">
                      <AlertCircle className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                      آگهی‌ای یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && editing && (
        <EditModal
          listing={editing}
          brands={brands}
          categories={categories}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); load(); }}
        />
      )}

      {/* Reject modal */}
      {showRejectModal && rejecting && (
        <RejectModal
          listing={rejecting}
          onClose={() => setShowRejectModal(false)}
          onDone={() => { setShowRejectModal(false); load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | undefined | null; icon: React.ReactNode; color: string }) {
  // Defensive: stats object shape varies — fall back to 0 so undefined never crashes toLocaleString.
  const v = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <p className="text-xl font-black text-zinc-900">{v.toLocaleString("fa-IR")}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

/* ============================================================
   EditModal — full editor with image manager
   ============================================================ */
function EditModal({
  listing,
  brands,
  categories,
  onClose,
  onSaved,
}: {
  listing: Listing;
  brands: Brand[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({ ...listing });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [images, setImages] = useState<Image[]>(listing.images || []);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        // Add to DB
        await fetch(`/api/admin/listings/${listing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addImages: [{ url: json.url }] }),
        });
        // Refresh images — single GET returns { listing: {...} }.
        const r = await fetch(`/api/admin/listings/${listing.id}`);
        const d = await r.json();
        const detail = d.listing ?? d.data;
        if (detail && Array.isArray(detail.images)) setImages(detail.images);
      } else {
        setError(json.error ?? "خطا در آپلود");
      }
    } catch {
      setError("خطای شبکه");
    }
    setUploading(false);
  };

  const addFromUrl = async () => {
    if (!newImageUrl) return;
    setUploading(true);
    try {
      await fetch(`/api/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addImages: [{ url: newImageUrl }] }),
      });
      const r = await fetch(`/api/admin/listings/${listing.id}`);
      const d = await r.json();
      const detail = d.listing ?? d.data;
      if (detail && Array.isArray(detail.images)) setImages(detail.images);
      setNewImageUrl("");
    } catch {}
    setUploading(false);
  };

  const setPrimary = async (imgId: string) => {
    await fetch(`/api/admin/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setPrimaryImage: imgId }),
    });
    setImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.id === imgId })));
  };

  const removeImage = async (imgId: string) => {
    if (!confirm("حذف این تصویر؟")) return;
    await fetch(`/api/admin/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeImages: [imgId] }),
    });
    setImages((prev) => prev.filter((i) => i.id !== imgId));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortDesc: form.shortDesc,
          description: form.description,
          price: form.price ? String(form.price) : null,
          priceType: form.priceType,
          listingType: form.listingType,
          status: form.status,
          featured: form.featured,
          condition: form.condition,
          province: form.province,
          city: form.city,
          year: form.year ? String(form.year) : null,
          workingHours: form.workingHours ? String(form.workingHours) : null,
          brandId: form.brandId || null,
          categoryId: form.categoryId || null,
          sellerPhone: form.sellerPhone,
          sellerName: form.sellerName,
          adminNotes: form.adminNotes,
          verified: form.verified,
          showInLatest: form.showInLatest,
        }),
      });
      const json = await res.json();
      if (json.ok || json.success) {
        onSaved();
      } else {
        setError(json.error ?? "خطا در ذخیره");
      }
    } catch {
      setError("خطای شبکه");
    }
    setSaving(false);
  };

  const inputCls = "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900">ویرایش آگهی</h2>
            <p className="text-xs text-zinc-400">{listing.slug}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>
          )}

          {/* Image manager */}
          <div>
            <label className={labelCls}>تصاویر ({images.length})</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  {img.isPrimary && (
                    <span className="absolute right-1 top-1 rounded bg-[#F58220] px-1.5 py-0.5 text-[9px] font-bold text-white">اصلی</span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                    {!img.isPrimary && (
                      <button
                        onClick={() => setPrimary(img.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#F58220]"
                        title="تنظیم به‌عنوان اصلی"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-red-500"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Upload box */}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 transition hover:border-[#F58220] hover:text-[#F58220]">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-[10px] font-bold">آپلود</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                />
              </label>
            </div>
            {/* Add from URL */}
            <div className="mt-2 flex gap-2">
              <input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="یا افزودن با URL تصویر..."
                className="h-9 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 outline-none focus:border-[#F58220]"
                dir="ltr"
              />
              <button
                onClick={addFromUrl}
                disabled={!newImageUrl || uploading}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                <ImageIcon2 className="h-3.5 w-3.5" /> افزودن
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>عنوان آگهی</label>
            <input value={form.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>توضیحات کامل</label>
            <textarea
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
          </div>

          {/* Short desc */}
          <div>
            <label className={labelCls}>خلاصه (کوتاه)</label>
            <input value={form.shortDesc || ""} onChange={(e) => set("shortDesc", e.target.value)} className={inputCls} />
          </div>

          {/* Price + type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>قیمت (تومان)</label>
              <input value={form.price ? String(form.price) : ""} onChange={(e) => set("price", e.target.value ? Number(e.target.value) : null)} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>نوع قیمت</label>
              <select value={form.priceType} onChange={(e) => set("priceType", e.target.value)} className={inputCls}>
                {Object.entries(PRICE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Year + hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>سال ساخت</label>
              <input value={form.year ? String(form.year) : ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} className={inputCls} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>ساعت کارکرد</label>
              <input value={form.workingHours ? String(form.workingHours) : ""} onChange={(e) => set("workingHours", e.target.value ? Number(e.target.value) : null)} className={inputCls} dir="ltr" />
            </div>
          </div>

          {/* Brand + category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>برند</label>
              <select value={form.brandId || ""} onChange={(e) => set("brandId", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>دسته</label>
              <select value={form.categoryId || ""} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* City + province */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>استان</label>
              <input value={form.province || ""} onChange={(e) => set("province", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>شهر</label>
              <input value={form.city || ""} onChange={(e) => set("city", e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Status + condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>وضعیت آگهی</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>حالت دستگاه</label>
              <select value={form.condition || ""} onChange={(e) => set("condition", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {Object.entries(CONDITIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Seller info */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-bold text-zinc-600">اطلاعات تماس و منبع</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>شماره تماس فروشنده</label>
                <input value={form.sellerPhone || ""} onChange={(e) => set("sellerPhone", e.target.value)} className={inputCls} dir="ltr" />
              </div>
              <div>
                <label className={labelCls}>نام فروشنده</label>
                <input value={form.sellerName || ""} onChange={(e) => set("sellerName", e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>یادداشت ادمین (داخلی)</label>
              <input value={form.adminNotes || ""} onChange={(e) => set("adminNotes", e.target.value)} className={inputCls} placeholder="یادداشت خصوصی ادمین..." />
            </div>
          </div>

          {/* Section placement controls */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-bold text-zinc-600">نمایش در سکشن‌های صفحه اصلی</p>
            <p className="mb-3 text-[11px] text-zinc-400">انتخاب کنید این آگهی در کدام سکشن(های) صفحه اصلی نمایش داده شود (می‌تواند هر سه را انتخاب کنید)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                form.featured ? "border-amber-300 bg-amber-50 text-amber-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-amber-200"
              }`}>
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-amber-500" />
                <Star className="h-4 w-4 text-amber-500" />
                <div className="min-w-0">
                  <div>آگهی ویژه</div>
                  <div className="text-[10px] font-normal text-zinc-400">سکشن آگهی‌های ویژه</div>
                </div>
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                form.verified ? "border-teal-300 bg-teal-50 text-teal-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-teal-200"
              }`}>
                <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="h-4 w-4 accent-teal-600" />
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <div className="min-w-0">
                  <div>تأییدشدهٔ هویکس</div>
                  <div className="text-[10px] font-normal text-zinc-400">سکشن ماشین‌آلات تأییدشده + نشان</div>
                </div>
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                form.showInLatest ? "border-blue-300 bg-blue-50 text-blue-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-blue-200"
              }`}>
                <input type="checkbox" checked={form.showInLatest} onChange={(e) => set("showInLatest", e.target.checked)} className="h-4 w-4 accent-blue-500" />
                <ListFilter className="h-4 w-4 text-blue-500" />
                <div className="min-w-0">
                  <div>آخرین آگهی‌ها</div>
                  <div className="text-[10px] font-normal text-zinc-400">سکشن آخرین آگهی‌ها (معمولی)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">
            انصراف
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره تغییرات
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RejectModal — admin rejects a listing with reason + explanation.
   The reason presets are derived from catalog health checks.
   ============================================================ */
function RejectModal({
  listing,
  onClose,
  onDone,
}: {
  listing: Listing;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REASONS = [
    { value: "NO_IMAGE", label: "بدون تصویر", hint: "آگهی تصویر ندارد — از فروشنده بخواهید تصویر اضافه کند" },
    { value: "NO_PRICE", label: "بدون قیمت", hint: "قیمت مشخص نشده — از فروشنده بخواهید قیمت‌گذاری کند" },
    { value: "NO_BRAND", label: "بدون برند", hint: "برند مشخص نشده — برند را تطبیق دهید" },
    { value: "NO_CATEGORY", label: "بدون دسته", hint: "دسته‌بندی نشده — دسته مناسب را انتخاب کنید" },
    { value: "NO_DESCRIPTION", label: "توضیحات ناقص", hint: "توضیحات کافی نیست — توضیحات کامل‌تر ارائه دهید" },
    { value: "INCOMPLETE", label: "اطلاعات ناقص", hint: "مشخصات دستگاه ناقص است" },
    { value: "INAPPROPRIATE", label: "محتوای نامناسب", hint: "محتوا با قوانین هویکس همخوانی ندارد" },
    { value: "DUPLICATE", label: "آگهی تکراری", hint: "این آگهی تکراری است" },
    { value: "OTHER", label: "سایر", hint: "دلیل دیگر" },
  ];

  const submit = async () => {
    if (!reason) { setError("دلیل رد را انتخاب کنید"); return; }
    if (adminNote.trim().length < 5) { setError("توضیحات دلیل الزامی است (حداقل ۵ نویسه)"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, adminNote: adminNote.trim() }),
      });
      const data = await res.json();
      // Reject endpoint returns { ok: true, rejection } on success (NOT { success }).
      if (data.ok || data.success) {
        onDone();
      } else {
        setError(data.error ?? "خطا در رد آگهی");
      }
    } catch {
      setError("خطای شبکه");
    }
    setSubmitting(false);
  };

  const selectedReason = REASONS.find((r) => r.value === reason);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-zinc-900">
            <XCircle className="h-5 w-5 text-red-500" />
            رد آگهی
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Listing info */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs text-zinc-400">آگهی</p>
            <p className="mt-1 text-sm font-bold text-zinc-800 line-clamp-1">{listing.title}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">⚠ {error}</div>
          )}

          {/* Reason selection */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">دلیل رد *</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`rounded-xl border p-2.5 text-right text-xs font-bold transition ${
                    reason === r.value ? "border-red-400 bg-red-50 text-red-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {selectedReason && (
              <p className="mt-2 text-[11px] text-zinc-400">{selectedReason.hint}</p>
            )}
          </div>

          {/* Admin note */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">توضیح برای فروشنده *</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              placeholder="دلیل رد را به‌طور کامل برای فروشنده توضیح دهید. مثلاً: «آگهی شما تصویر ندارد. لطفاً حداقل ۲ تصویر از دستگاه اضافه کنید تا آگهی تأیید شود.»"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#F58220]"
            />
            <p className="mt-1 text-[10px] text-zinc-400">این توضیح برای فروشنده ارسال می‌شود و در چت رد آگهی نمایش داده می‌شود</p>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50">
            انصراف
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            رد آگهی و اطلاع به فروشنده
          </button>
        </div>
      </div>
    </div>
  );
}
