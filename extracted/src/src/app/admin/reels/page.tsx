"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Play, Download, Share2, RefreshCw, Film, Instagram, Facebook, MessageCircle, Send, Music } from "lucide-react";

type Reel = {
  id: string;
  listingId: string;
  platform: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  status: string;
  caption: string | null;
  hashtags: string | null;
  createdAt: string;
  listing: { id: string; title: string; slug: string; images: { url: string }[] };
};

type Listing = { id: string; title: string; images: { url: string }[] };

const PLATFORMS = [
  { key: "INSTAGRAM", label: "اینستاگرام", icon: Instagram, color: "text-pink-500" },
  { key: "TIKTOK", label: "تیک‌تاک", icon: Music, color: "text-zinc-700" },
  { key: "FACEBOOK", label: "فیسبوک", icon: Facebook, color: "text-blue-600" },
  { key: "WHATSAPP", label: "واتساپ", icon: MessageCircle, color: "text-green-600" },
  { key: "TELEGRAM", label: "تلگرام", icon: Send, color: "text-sky-500" },
];

export default function ReelsAdminPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("INSTAGRAM");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadReels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reels");
      const data = await res.json();
      if (data.ok) setReels(data.reels || []);
    } catch {}
    setLoading(false);
  }, []);

  const loadListings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/listings?limit=50&status=PUBLISHED");
      const data = await res.json();
      const list = data.listings || data.data || [];
      setListings(list.map((l: any) => ({ id: l.id, title: l.title, images: l.images || [] })));
    } catch {}
  }, []);

  useEffect(() => { loadReels(); loadListings(); }, [loadReels, loadListings]);

  const generate = async () => {
    if (!selectedListing) { setError("ابتدا یک آگهی انتخاب کنید."); return; }
    setGenerating(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/admin/reels", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing, platform: selectedPlatform }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✓ ریلز با موفقیت ساخته شد!`);
        loadReels();
      } else {
        setError(data.error || "خطا در ساخت ریلز");
        if (data.caption) setMessage(`کپشن تولید شد: ${data.caption.slice(0, 80)}...`);
      }
    } catch { setError("خطای شبکه"); }
    setGenerating(false);
  };

  const copyCaption = (reel: Reel) => {
    const text = `${reel.caption || ""}\n${reel.hashtags || ""}`;
    navigator.clipboard.writeText(text);
    setMessage("✓ کپشن و هشتگ‌ها کپی شد");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">ریلز شبکه‌های اجتماعی</h1>
        <p className="mt-1 text-sm text-zinc-500">تولید ویدیوهای کوتاه (۵ ثانیه) از آگهی‌ها برای اشتراک‌گذاری در شبکه‌های اجتماعی</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
      {message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-600">{message}</div>}

      {/* Generator */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-700"><Film className="h-4 w-4 text-[#F58220]" />ساخت ریلز جدید</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">آگهی</label>
            <select value={selectedListing} onChange={(e) => setSelectedListing(e.target.value)} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]">
              <option value="">انتخاب آگهی...</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.title.slice(0, 50)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500">پلتفرم</label>
            <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[#F58220]">
              {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={generating} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-[#ff8c38] disabled:opacity-50">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" />در حال ساخت...</> : <><Film className="h-4 w-4" />ساخت ریلز</>}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">⚠️ ساخت ویدیو ممکن است ۱ تا ۳ دقیقه طول بکشد. صبور باشید.</p>
      </div>

      {/* Reels list */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-black text-zinc-700">ریلزهای ساخته‌شده ({reels.length})</h2>
          <button onClick={loadReels} className="inline-flex items-center gap-1 text-xs font-bold text-[#F58220] hover:underline"><RefreshCw className="h-3 w-3" />به‌روزرسانی</button>
        </div>

        {reels.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">هنوز ریلزی ساخته نشده است.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reels.map((reel) => {
              const platform = PLATFORMS.find((p) => p.key === reel.platform);
              const Icon = platform?.icon || Film;
              return (
                <div key={reel.id} className="overflow-hidden rounded-xl border border-zinc-200">
                  {/* Video / Thumbnail */}
                  <div className="relative aspect-video bg-zinc-900">
                    {reel.status === "READY" && reel.videoUrl ? (
                      <video src={reel.videoUrl} controls className="h-full w-full object-cover" poster={reel.thumbnailUrl || undefined} />
                    ) : reel.thumbnailUrl ? (
                      <img src={reel.thumbnailUrl} alt={reel.listing.title} className="h-full w-full object-cover opacity-60" />
                    ) : null}
                    {reel.status !== "READY" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {reel.status === "PROCESSING" ? <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" /> : <span className="text-xs font-bold text-red-400">{reel.status === "FAILED" ? "ناموفق" : "در انتظار"}</span>}
                      </div>
                    )}
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                      <Icon className={`h-3 w-3 ${platform?.color}`} />{platform?.label}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-xs font-bold text-zinc-800">{reel.listing.title}</h3>
                    {reel.caption && <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{reel.caption}</p>}
                    {reel.hashtags && <p className="mt-1 text-[10px] text-[#F58220]">{reel.hashtags}</p>}
                    <div className="mt-3 flex gap-2">
                      {reel.status === "READY" && reel.videoUrl && (
                        <>
                          <a href={reel.videoUrl} download className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[10px] font-bold text-zinc-600 hover:bg-zinc-200"><Download className="h-3 w-3" />دانلود</a>
                          <button onClick={() => copyCaption(reel)} className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[10px] font-bold text-zinc-600 hover:bg-zinc-200"><Share2 className="h-3 w-3" />کپشن</button>
                        </>
                      )}
                      <span className="ml-auto text-[10px] text-zinc-400">{new Date(reel.createdAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
