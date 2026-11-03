"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
  Plus,
  GitCompare,
  Loader2,
  Sparkles,
  Save,
  Share2,
  AlertTriangle,
  Info,
  Trash2,
  ListFilter,
} from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   /compare — HEAVIX Machine Comparison Engine (V1.0)
   docs/HEAVIX-MACHINE-COMPARISON-SPEC-V1.0.md

   Flow:
     • If ?share=TOKEN is present → load the shared session
       (read-only) and render it.
     • Otherwise → client-side session:
         - Search listings via /api/listings
         - Add → POST /api/compare (creates session lazily on
           first add), then POST /api/compare/[id]/items
         - Remove → DELETE /api/compare/[id]/items/[itemId]
         - "تفاوت‌ها فقط" toggle (rows where isDifferent = true)
         - "خلاصه هوش مصنوعی" → POST /api/compare/[id]/ai-summary
         - "ذخیره مقایسه" → PATCH /api/compare/[id] { name }
         - "اشتراک‌گذاری" → copies ${origin}/compare?share=TOKEN

   Min 2 items, max 5 items. Dark theme, RTL, responsive.
   ============================================================ */

type CategoryInfo = { id: string; name: string };

type PriceRange = {
  min: number | null;
  max: number | null;
  avg: number | null;
  currency: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sampleSize: number;
};

type Cell = {
  itemId: string;
  display: string;
  raw: string | null;
  unit?: string | null;
  normalized: string;
  provenance?: {
    source?: string | null;
    confidence?: number | null;
    verifiedAt?: string | null;
    sourceReference?: string | null;
  };
};

type Row = {
  key: string;
  label: string;
  category: "fixed" | "attribute";
  unit?: string | null;
  cells: Cell[];
  isDifferent: boolean;
  isPrice?: boolean;
  priceRanges?: PriceRange[];
};

type ItemData = {
  id: string;
  sortOrder: number;
  type: string;
  title: string;
  slug?: string | null;
  image?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  year?: number | null;
  city?: string | null;
  province?: string | null;
  listingId?: string | null;
};

type ComparisonData = {
  items: ItemData[];
  rows: Row[];
  attributes: string[];
  differences: string[];
  crossCategoryWarning: boolean;
  categories: CategoryInfo[];
};

type Session = {
  id: string;
  name: string | null;
  shareToken: string | null;
  shareExpiresAt: string | null;
  aiSummary: string | null;
  aiSummaryAt: string | null;
};

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  price: string | null;
  priceType: string;
  condition: string | null;
  city: string | null;
  year: number | null;
  workingHours: number | null;
  brand?: { name: string; nameEn: string | null; country: string | null } | null;
  category?: { name: string; icon: string | null } | null;
  images?: { url: string }[];
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  NEGOTIABLE: "توافقی",
  FIXED: "مقطوع",
  CALL_FOR_PRICE: "تماس بگیرید",
  AUCTION: "مزایده",
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: "نو",
  USED: "کارکرده",
  REFURBISHED: "بازسازی‌شده",
  FOR_PARTS: "قطعات",
};

const SOURCE_LABELS: Record<string, string> = {
  SELLER_INPUT: "فروشنده",
  SELLER_INPUT_LOWERCASE: "فروشنده",
  MANUFACTURER_DOCUMENT: "کاتالوگ سازنده",
  AI_EXTRACTION: "استخراج AI",
  AI_INFERENCE: "استنباط AI",
  ADMIN_VERIFIED: "تأیید کارشناس",
  IMPORTED: "واردشده",
};

const SESSION_KEY = "heavix:compare:sessionId";
const PENDING_KEY = "heavix:compare:pendingListingIds";
const MIN_ITEMS = 2;
const MAX_ITEMS = 5;

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("share");
  const isReadOnly = Boolean(shareToken);
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // ── Search state ──
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  /* ── Load session (shared or local) ── */
  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare/${id}`, { cache: "no-store" });
      if (res.status === 404 || res.status === 410) {
        // Session gone — drop the stale localStorage id and start fresh.
        if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
        setSessionId(null);
        setSession(null);
        setData(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("خطا در بارگذاری مقایسه");
      const json = await res.json();
      setSession(json.session);
      setData(json.data);
      setAiSummary(json.session?.aiSummary ?? null);
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در بارگذاری مقایسه",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadShared = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare/shared/${token}`, { cache: "no-store" });
      if (!res.ok) {
        toast({
          title: "لینک نامعتبر",
          description: "لینک اشتراک‌گذاری نامعتبر یا منقضی است.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const json = await res.json();
      setSession({
        id: json.session.id,
        name: json.session.name,
        shareToken: token,
        shareExpiresAt: json.session.shareExpiresAt,
        aiSummary: null,
        aiSummaryAt: null,
      });
      setData(json.data);
      setAiSummary(null);
    } catch {
      toast({
        title: "خطا",
        description: "خطا در بارگذاری مقایسهٔ اشتراک‌گذاری‌شده",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (shareToken) {
      loadShared(shareToken);
      return;
    }
    // Pick up pending listing IDs (set by the Compare button on the
    // listing detail page) and add them to the session before rendering.
    let pendingIds: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PENDING_KEY);
        if (raw) {
          pendingIds = JSON.parse(raw);
          if (!Array.isArray(pendingIds)) pendingIds = [];
          pendingIds = pendingIds.filter((x) => typeof x === "string").slice(0, MAX_ITEMS);
          localStorage.removeItem(PENDING_KEY);
        }
      } catch {
        /* ignore */
      }
    }

    // Try to resume an existing local session.
    const savedId =
      typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;

    if (pendingIds.length > 0) {
      // Create a fresh session with the pending listings pre-populated.
      (async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: null, listingIds: pendingIds }),
          });
          if (!res.ok) throw new Error("خطا در ایجاد جلسهٔ مقایسه");
          const json = await res.json();
          const newId = json.session.id as string;
          setSessionId(newId);
          setSession(json.session);
          if (typeof window !== "undefined") {
            localStorage.setItem(SESSION_KEY, newId);
          }
          await loadSession(newId);
        } catch {
          setLoading(false);
        }
      })();
      return;
    }

    if (savedId) {
      loadSession(savedId);
    } else {
      setLoading(false);
    }
  }, [shareToken, loadShared, loadSession]);

  /* ── Search ── */
  const doSearch = useCallback(
    (q: string) => {
      setSearch(q);
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      if (q.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      setSearching(true);
      searchDebounce.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/listings?q=${encodeURIComponent(q)}&limit=10`);
          const json = await res.json();
          if (json.success !== false) {
            setSearchResults((json.data || json.listings || []).slice(0, 8));
            setShowResults(true);
          }
        } catch {
          /* ignore */
        } finally {
          setSearching(false);
        }
      }, 250);
    },
    [],
  );

  /* ── Add listing (creates session lazily on first add) ── */
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: null }),
      });
      if (!res.ok) throw new Error("خطا در ایجاد جلسهٔ مقایسه");
      const json = await res.json();
      const newId = json.session.id as string;
      setSessionId(newId);
      setSession(json.session);
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, newId);
      }
      return newId;
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در ایجاد جلسهٔ مقایسه",
        variant: "destructive",
      });
      return null;
    }
  }, [sessionId, toast]);

  const addListing = useCallback(
    async (l: SearchResult) => {
      // Cap check
      if ((data?.items.length ?? 0) >= MAX_ITEMS) {
        toast({
          title: "حداکثر موارد",
          description: `حداکثر ${toFa(MAX_ITEMS)} مورد قابل مقایسه است.`,
          variant: "destructive",
        });
        return;
      }
      // Dedupe
      if (data?.items.some((i) => i.listingId === l.id)) {
        toast({ title: "تکراری", description: "این آگهی قبلاً اضافه شده است." });
        return;
      }
      const id = await ensureSession();
      if (!id) return;
      try {
        const res = await fetch(`/api/compare/${id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: l.id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "خطا در افزودن مورد");
        }
        setSearch("");
        setSearchResults([]);
        setShowResults(false);
        await loadSession(id);
      } catch (err: any) {
        toast({
          title: "خطا",
          description: err?.message ?? "خطا در افزودن مورد",
          variant: "destructive",
        });
      }
    },
    [data, ensureSession, loadSession, toast],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/compare/${sessionId}/items/${itemId}`, {
          method: "DELETE",
        });
        await loadSession(sessionId);
      } catch (err: any) {
        toast({
          title: "خطا",
          description: err?.message ?? "خطا در حذف مورد",
          variant: "destructive",
        });
      }
    },
    [sessionId, loadSession, toast],
  );

  /* ── AI summary ── */
  const generateSummary = useCallback(async () => {
    if (!sessionId) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/compare/${sessionId}/ai-summary`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "خطا در تولید خلاصه");
      }
      const json = await res.json();
      setAiSummary(json.summary);
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در تولید خلاصهٔ هوش مصنوعی",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }, [sessionId, toast]);

  /* ── Save (name + ensure share token) ── */
  const saveComparison = useCallback(async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/compare/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim() || null,
          refreshShareToken: !session?.shareToken,
        }),
      });
      if (!res.ok) throw new Error("خطا در ذخیره");
      const json = await res.json();
      setSession((prev) =>
        prev
          ? {
              ...prev,
              name: json.session.name,
              shareToken: json.session.shareToken,
              shareExpiresAt: json.session.shareExpiresAt,
            }
          : prev,
      );
      setShowSaveDialog(false);
      toast({ title: "ذخیره شد", description: "مقایسه ذخیره و لینک اشتراک‌گذاری آماده است." });
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message ?? "خطا در ذخیره",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [sessionId, saveName, session, toast]);

  /* ── Share ── */
  const shareLink = useMemo(() => {
    if (!session?.shareToken) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/compare?share=${session.shareToken}`;
  }, [session?.shareToken]);

  const copyShareLink = useCallback(async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
      toast({ title: "لینک کپی شد", description: "لینک مقایسه در کلیپ‌بورد ذخیره شد." });
    } catch {
      toast({
        title: "خطا",
        description: "کپی لینک ناموفق بود.",
        variant: "destructive",
      });
    }
  }, [shareLink, toast]);

  /* ── Reset / new comparison ── */
  const startNew = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setSession(null);
    setData(null);
    setAiSummary(null);
    setSearch("");
    setSearchResults([]);
    setShowResults(false);
    router.push("/compare");
  }, [router]);

  /* ── Filtered rows (differences-only mode) ── */
  const visibleRows = useMemo(() => {
    if (!data) return [];
    if (!differencesOnly) return data.rows;
    return data.rows.filter((r) => r.isDifferent);
  }, [data, differencesOnly]);

  const itemCount = data?.items.length ?? 0;
  const canCompare = itemCount >= MIN_ITEMS;
  const canSave = itemCount >= MIN_ITEMS && !isReadOnly;

  /* ── Render ── */
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          {/* ── Header ── */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15">
                <GitCompare className="h-7 w-7 text-[#F58220]" />
              </div>
              <h1 className="text-3xl font-black text-white lg:text-4xl">
                {isReadOnly ? "مقایسهٔ اشتراک‌گذاری‌شده" : "موتور مقایسه ماشین‌آلات"}
              </h1>
              <p className="mt-2 text-sm text-white/50">
                {toFa(MIN_ITEMS)} تا {toFa(MAX_ITEMS)} آگهی را کنار هم بگذارید و تفاوت‌ها را ببینید.
              </p>
            </div>
            {session?.name && (
              <div className="rounded-2xl border border-white/10 bg-[#111] px-4 py-2 text-xs text-white/60">
                <span className="text-white/40">نام مقایسه:</span>{" "}
                <span className="font-bold text-white">{session.name}</span>
              </div>
            )}
          </div>

          {/* ── Cross-category warning ── */}
          {data?.crossCategoryWarning && data.categories.length > 1 && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-amber-200">
                  هشدار: موارد از دسته‌های متفاوت هستند
                </p>
                <p className="mt-1 text-xs text-amber-200/70">
                  موارد انتخاب‌شده از دسته‌های زیر هستند:{" "}
                  {data.categories.map((c) => c.name).join("، ")}.
                  مقایسهٔ Cross-category ممکن است معنادار نباشد.
                </p>
              </div>
            </div>
          )}

          {/* ── Search bar (hidden in read-only mode) ── */}
          {!isReadOnly && (
            <div className="relative mx-auto mb-8 max-w-2xl">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111] p-1.5">
                <Search className="mr-2 h-4 w-4 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => doSearch(e.target.value)}
                  placeholder="جستجوی آگهی برای افزودن به مقایسه — عنوان، برند..."
                  className="h-10 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  disabled={itemCount >= MAX_ITEMS}
                />
                {searching && <Loader2 className="h-4 w-4 animate-spin text-[#F58220]" />}
                {itemCount >= MAX_ITEMS && (
                  <span className="px-2 text-[10px] text-white/40">سقف {toFa(MAX_ITEMS)} مورد</span>
                )}
              </div>
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl">
                  {searchResults.map((l) => {
                    const alreadyAdded = data?.items.some((i) => i.listingId === l.id);
                    const disabled = alreadyAdded || itemCount >= MAX_ITEMS;
                    return (
                      <button
                        key={l.id}
                        onClick={() => addListing(l)}
                        disabled={disabled}
                        className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-right transition hover:bg-white/5 disabled:opacity-30"
                      >
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                          {l.images?.[0]?.url ? (
                            <img
                              src={l.images[0].url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">{l.category?.icon ?? "🚜"}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{l.title}</p>
                          <p className="text-[11px] text-white/40">
                            {l.brand?.name ?? "—"} · {l.city ?? "—"} ·{" "}
                            {l.year ? toFa(l.year) : "—"}
                          </p>
                        </div>
                        {alreadyAdded ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Plus className="h-4 w-4 text-[#F58220]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {showResults && searchResults.length === 0 && !searching && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-[#0e0e0e] p-4 text-center text-xs text-white/40">
                  موردی یافت نشد
                </div>
              )}
            </div>
          )}

          {/* ── Action bar ── */}
          {canCompare && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {/* Differences-only toggle */}
              {!isReadOnly && (
                <button
                  onClick={() => setDifferencesOnly((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    differencesOnly
                      ? "border-[#F58220] bg-[#F58220]/10 text-[#F58220]"
                      : "border-white/10 bg-[#111] text-white/60 hover:border-white/20"
                  }`}
                >
                  <ListFilter className="h-4 w-4" />
                  {differencesOnly ? "نمایش همه" : "تفاوت‌ها فقط"}
                </button>
              )}

              <div className="mr-auto flex flex-wrap items-center gap-2">
                {/* AI summary */}
                {!isReadOnly && (
                  <button
                    onClick={generateSummary}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#F58220]/40 bg-[#F58220]/10 px-4 py-2 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/15 disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    خلاصه هوش مصنوعی
                  </button>
                )}

                {/* Save */}
                {canSave && (
                  <button
                    onClick={() => {
                      setSaveName(session?.name ?? "");
                      setShowSaveDialog(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111] px-4 py-2 text-xs font-bold text-white transition hover:border-white/20"
                  >
                    <Save className="h-4 w-4" />
                    ذخیره مقایسه
                  </button>
                )}

                {/* Share */}
                {session?.shareToken && (
                  <button
                    onClick={copyShareLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/15"
                  >
                    {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {shareCopied ? "کپی شد" : "اشتراک‌گذاری"}
                  </button>
                )}

                {/* New (reset) */}
                {!isReadOnly && sessionId && (
                  <button
                    onClick={startNew}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111] px-4 py-2 text-xs font-bold text-white/50 transition hover:border-red-500/30 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    مقایسهٔ جدید
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── AI summary panel ── */}
          {aiSummary && (
            <div className="mb-6 rounded-3xl border border-[#F58220]/20 bg-[#F58220]/[0.04] p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F58220]/15">
                  <Sparkles className="h-4 w-4 text-[#F58220]" />
                </div>
                <h3 className="text-base font-black text-white">خلاصه هوش مصنوعی</h3>
              </div>
              <div className="whitespace-pre-line text-sm leading-7 text-white/75">
                {aiSummary}
              </div>
              <p className="mt-4 flex items-center gap-1 text-[10px] text-white/30">
                <Info className="h-3 w-3" />
                هویکس برنده اعلام نمی‌کند — تصمیم‌گیری با شماست.
              </p>
            </div>
          )}

          {/* ── Loading state ── */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
            </div>
          ) : /* ── Comparison table ── */
          canCompare && data ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="sticky right-0 z-10 w-32 bg-[#111] px-4 py-4 text-right text-xs font-bold text-white/40">
                        مشخصه
                      </th>
                      {data.items.map((it) => (
                        <th key={it.id} className="px-4 py-4 text-center align-top">
                          <div className="mx-auto mb-2 flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                            {it.image ? (
                              <img
                                src={it.image}
                                alt={it.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">🚜</span>
                            )}
                          </div>
                          <Link
                            href={it.slug ? `/listings/${it.slug}` : "#"}
                            className="line-clamp-2 text-xs font-bold text-white hover:text-[#F58220]"
                          >
                            {it.title}
                          </Link>
                          {!isReadOnly && (
                            <button
                              onClick={() => removeItem(it.id)}
                              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] text-red-400 transition hover:bg-red-500/20"
                            >
                              <X className="h-3 w-3" /> حذف
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={itemCount + 1}
                          className="px-4 py-12 text-center text-sm text-white/40"
                        >
                          {differencesOnly
                            ? "تفاوتی در موارد انتخاب‌شده یافت نشد."
                            : "هیچ ردیفی برای نمایش وجود ندارد."}
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map((row, idx) => (
                        <tr
                          key={row.key}
                          className={
                            idx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                          }
                        >
                          <td className="sticky right-0 z-10 bg-inherit px-4 py-3 text-xs font-bold text-white/50">
                            <div className="flex items-center gap-1.5">
                              {row.label}
                              {row.isDifferent && (
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full bg-[#F58220]"
                                  title="مقدار در موارد متفاوت است"
                                />
                              )}
                            </div>
                          </td>
                          {row.cells.map((cell, cellIdx) => (
                            <td
                              key={cell.itemId}
                              className={`px-4 py-3 text-center align-top ${
                                row.isPrice ? "text-[#F58220]" : "text-sm text-white/80"
                              }`}
                            >
                              <div className="text-sm font-medium">
                                {cell.display || "—"}
                              </div>
                              {row.isPrice && row.priceRanges && row.priceRanges[cellIdx] && (
                                <PriceRangeInfo
                                  range={row.priceRanges[cellIdx]!}
                                />
                              )}
                              {cell.provenance &&
                                cell.provenance.source &&
                                cell.provenance.source !== "SELLER_INPUT" && (
                                  <div className="mt-1 text-[9px] text-emerald-300/70">
                                    {SOURCE_LABELS[cell.provenance.source] ??
                                      cell.provenance.source}
                                    {cell.provenance.confidence != null
                                      ? ` · ${toFa(Math.round(cell.provenance.confidence * 100))}٪`
                                      : ""}
                                  </div>
                                )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                    <tr className="border-t border-white/10">
                      <td className="bg-[#111] px-4 py-4"></td>
                      {data.items.map((it) => (
                        <td key={it.id} className="px-4 py-4 text-center">
                          {it.slug && (
                            <Link
                              href={`/listings/${it.slug}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38]"
                            >
                              مشاهده
                              <ArrowLeft className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#111] p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">
                حداقل {toFa(MIN_ITEMS)} آگهی برای مقایسه انتخاب کنید
              </p>
              <p className="mt-1 text-xs text-white/30">
                با جستجو در کادر بالا، آگهی‌ها را اضافه کنید
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Save dialog ── */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-black text-white">ذخیرهٔ مقایسه</h3>
            <label className="mb-1.5 block text-xs font-bold text-white/60">
              نام مقایسه (اختیاری)
            </label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="مثلاً: بیل‌های CAT مدل ۳۲۰"
              className="mb-4 h-11 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-3 text-sm text-white outline-none focus:border-[#F58220]"
              autoFocus
            />
            <p className="mb-4 text-[11px] leading-5 text-white/40">
              پس از ذخیره، یک لینک اشتراک‌گذاری عمومی تولید می‌شود که می‌توانید با دیگران
              به اشتراک بگذارید.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60 transition hover:bg-white/5"
              >
                انصراف
              </button>
              <button
                onClick={saveComparison}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F58220] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

/* ── Helper component: per-item price range badge ── */
function PriceRangeInfo({ range }: { range: PriceRange }) {
  if (range.min == null || range.max == null) return null;
  return (
    <div className="mt-1 text-[10px] leading-4 text-white/40">
      بازه تخمین:{" "}
      <span className="text-white/60">
        {Number(range.min).toLocaleString("fa-IR")} –{" "}
        {Number(range.max).toLocaleString("fa-IR")} ت
      </span>
      {range.sampleSize > 0 && (
        <span className="text-white/30">
          {" "}
          (نمونه: {toFa(range.sampleSize)})
        </span>
      )}
    </div>
  );
}
