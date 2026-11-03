"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Video,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  Download,
  ExternalLink,
  Instagram,
  Facebook,
  MessageCircle,
  Send,
  Music2,
  Loader2,
  Film,
  Eye,
  Share2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/* ============================================================
   SocialReelsAdmin — AI-powered social media reel generator.
   Pick a listing + platform → generate a 5-second vertical
   video → preview → share to Instagram/TikTok/Facebook/
   WhatsApp/Telegram.
   ============================================================ */

type ReelListing = {
  id: string;
  title: string;
  slug: string;
  brand: { name: string } | null;
  images: { url: string; isPrimary: boolean }[];
};

type Reel = {
  id: string;
  listingId: string;
  platform: string;
  prompt: string | null;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number;
  resolution: string;
  error: string | null;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  listing: ReelListing | null;
};

type Stats = {
  total: number;
  ready: number;
  generating: number;
  failed: number;
};

const PLATFORMS = [
  { code: "INSTAGRAM", label: "اینستاگرام", icon: Instagram, color: "text-pink-400" },
  { code: "TIKTOK", label: "تیک‌تاک", icon: Music2, color: "text-zinc-100" },
  { code: "FACEBOOK", label: "فیسبوک", icon: Facebook, color: "text-blue-400" },
  { code: "WHATSAPP", label: "واتس‌اپ", icon: MessageCircle, color: "text-green-400" },
  { code: "TELEGRAM", label: "تلگرام", icon: Send, color: "text-sky-400" },
  { code: "GENERAL", label: "عمومی (ریلز)", icon: Film, color: "text-orange-400" },
] as const;

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "در صف", color: "bg-zinc-700 text-zinc-200", icon: Clock },
  GENERATING: { label: "در حال تولید", color: "bg-amber-500/20 text-amber-300", icon: Loader2 },
  READY: { label: "آماده", color: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2 },
  FAILED: { label: "خطا", color: "bg-red-500/20 text-red-300", icon: XCircle },
};

export default function SocialReelsAdmin() {
  const router = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, ready: 0, generating: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewReel, setPreviewReel] = useState<Reel | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, string> | null>(null);

  // Generate form state
  const [listingSearch, setListingSearch] = useState("");
  const [listingResults, setListingResults] = useState<ReelListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<ReelListing | null>(null);
  const [platform, setPlatform] = useState<string>("INSTAGRAM");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<string>("5");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social-reels");
      const d = await res.json();
      if (d.success) {
        setReels(d.reels || []);
        setStats(d.stats || { total: 0, ready: 0, generating: 0, failed: 0 });
      } else {
        toast.error(d.error || "خطا در بارگذاری ریلزها");
      }
    } catch {
      toast.error("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 10s if there are generating reels
    const t = setInterval(() => {
      setReels((cur) => {
        if (cur.some((r) => r.status === "GENERATING" || r.status === "PENDING")) {
          load();
        }
        return cur;
      });
    }, 10000);
    return () => clearInterval(t);
  }, [load]);

  // Search listings (debounced)
  useEffect(() => {
    if (!listingSearch.trim()) {
      setListingResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/listings?q=${encodeURIComponent(listingSearch)}&limit=10&status=PUBLISHED`,
        );
        const d = await res.json();
        const rows = Array.isArray(d.listings) ? d.listings : Array.isArray(d.data) ? d.data : [];
        setListingResults(rows);
      } catch {
        setListingResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [listingSearch]);

  const handleGenerate = async () => {
    if (!selectedListing) {
      toast.error("یک آگهی انتخاب کنید");
      return;
    }
    setGenerating(true);
    try {
      // Use async generation to avoid long HTTP wait
      const res = await fetch("/api/admin/social-reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedListing.id,
          platform,
          prompt: prompt || undefined,
          durationSec: Number(duration) || 5,
          resolution: "720x1440",
          action: "generate-async",
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("تولید ویدیو شروع شد", {
          description: "در پس‌زمینه تولید می‌شود. هر ۱۰ ثانیه لیست به‌روزرسانی می‌شود.",
        });
        setGenerateOpen(false);
        setSelectedListing(null);
        setListingSearch("");
        setPrompt("");
        load();
      } else {
        toast.error(d.error || "خطا در شروع تولید");
      }
    } catch {
      toast.error("خطای شبکه");
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = async (reel: Reel) => {
    setPreviewReel(reel);
    setShareLinks(null);
    try {
      const res = await fetch(`/api/admin/social-reels/${reel.id}`);
      const d = await res.json();
      if (d.success) {
        setShareLinks(d.shareLinks);
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("این ریلز حذف شود؟")) return;
    try {
      const res = await fetch(`/api/admin/social-reels/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        toast.success("ریلز حذف شد");
        load();
      } else {
        toast.error(d.error || "خطا در حذف");
      }
    } catch {
      toast.error("خطای شبکه");
    }
  };

  const platformMeta = (code: string) =>
    PLATFORMS.find((p) => p.code === code) || PLATFORMS[5];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Video className="h-6 w-6 text-[#F58220]" />
            ریلز شبکه‌های اجتماعی
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            تولید ویدیوهای کوتاه با هوش مصنوعی از آگهی‌ها برای اشتراک در اینستاگرام، تیک‌تاک، فیسبوک، واتس‌اپ و تلگرام
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </Button>
          <Button
            size="sm"
            onClick={() => setGenerateOpen(true)}
            className="bg-[#F58220] text-white hover:bg-[#e07610]"
          >
            <Plus className="h-4 w-4" />
            تولید ریلز جدید
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="کل ریلزها" value={stats.total} icon={Film} color="text-zinc-200" />
        <StatCard label="آماده" value={stats.ready} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="در حال تولید" value={stats.generating} icon={Loader2} color="text-amber-400" />
        <StatCard label="خطا" value={stats.failed} icon={AlertCircle} color="text-red-400" />
      </div>

      {/* Reels grid */}
      {loading && reels.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reels.length === 0 ? (
        <Card className="border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <Video className="mx-auto h-12 w-12 text-zinc-600" />
          <p className="mt-4 text-zinc-400">هنوز ریلزی تولید نشده است</p>
          <p className="mt-1 text-sm text-zinc-500">
            روی «تولید ریلز جدید» کلیک کنید تا اولین ویدیوی شبکه اجتماعی خود را بسازید
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reels.map((reel) => {
            const pm = platformMeta(reel.platform);
            const sm = STATUS_META[reel.status] || STATUS_META.PENDING;
            const Icon = pm.icon;
            return (
              <Card
                key={reel.id}
                className="group overflow-hidden border-zinc-800 bg-zinc-900/70 p-0 transition hover:border-[#F58220]/40"
              >
                {/* Thumbnail / video preview */}
                <div className="relative aspect-[9/16] w-full overflow-hidden bg-zinc-950">
                  {reel.status === "READY" && reel.videoUrl ? (
                    <video
                      src={reel.videoUrl}
                      poster={reel.thumbnailUrl || undefined}
                      controls
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : reel.thumbnailUrl ? (
                    <img
                      src={reel.thumbnailUrl}
                      alt={reel.listing?.title || "reel"}
                      className="h-full w-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="h-10 w-10 text-zinc-700" />
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute right-2 top-2">
                    <Badge className={`${sm.color} border-0 text-[10px]`} variant="secondary">
                      <sm.icon className={`h-3 w-3 ${reel.status === "GENERATING" ? "animate-spin" : ""}`} />
                      {sm.label}
                    </Badge>
                  </div>
                  {/* Platform badge */}
                  <div className="absolute left-2 top-2">
                    <Badge className="border-0 bg-black/60 text-[10px]" variant="secondary">
                      <Icon className={`h-3 w-3 ${pm.color}`} />
                      {pm.label}
                    </Badge>
                  </div>
                  {/* Generating overlay */}
                  {reel.status === "GENERATING" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-[#F58220]" />
                      <p className="mt-2 text-xs text-white">در حال تولید...</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-xs font-medium text-zinc-200">
                    {reel.listing?.title || "—"}
                  </p>
                  {reel.listing?.brand?.name && (
                    <p className="text-[10px] text-zinc-500">{reel.listing.brand.name}</p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{reel.durationSec}ث • {reel.resolution}</span>
                    <span>{new Date(reel.createdAt).toLocaleDateString("fa-IR")}</span>
                  </div>
                  {reel.status === "FAILED" && reel.error && (
                    <p className="line-clamp-2 text-[10px] text-red-400">{reel.error}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 border-zinc-700 px-2 text-[10px]"
                      onClick={() => handlePreview(reel)}
                      disabled={reel.status !== "READY"}
                    >
                      <Play className="h-3 w-3" />
                      مشاهده
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-700 px-2 text-[10px] hover:border-red-500/50 hover:text-red-400"
                      onClick={() => handleDelete(reel.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#F58220]">
              <Video className="h-5 w-5" />
              تولید ریلز جدید
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              یک آگهی انتخاب کنید تا هوش مصنوعی از تصویر آن یک ویدیوی کوتاه عمودی برای شبکه‌های اجتماعی بسازد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Listing search */}
            <div className="space-y-2">
              <Label className="text-zinc-300">آگهی</Label>
              <Input
                placeholder="جستجوی آگهی (عنوان، برند، مدل)..."
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                className="border-zinc-700 bg-zinc-900"
              />
              {listingResults.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                  {listingResults.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setSelectedListing(l);
                        setListingSearch(l.title);
                        setListingResults([]);
                      }}
                      className={`flex w-full items-center gap-3 rounded-md p-2 text-right transition hover:bg-zinc-800 ${
                        selectedListing?.id === l.id ? "bg-[#F58220]/10 ring-1 ring-[#F58220]" : ""
                      }`}
                    >
                      {l.images[0]?.url ? (
                        <img src={l.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-zinc-800" />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-xs text-zinc-200">{l.title}</p>
                        {l.brand?.name && (
                          <p className="text-[10px] text-zinc-500">{l.brand.name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedListing && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  انتخاب شده: {selectedListing.title}
                </div>
              )}
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label className="text-zinc-300">پلتفرم هدف</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.code}
                      onClick={() => setPlatform(p.code)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition ${
                        platform === p.code
                          ? "border-[#F58220] bg-[#F58220]/10"
                          : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${p.color}`} />
                      <span className="text-[10px] text-zinc-300">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">مدت ویدیو</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="border-zinc-700 bg-zinc-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900">
                    <SelectItem value="5">۵ ثانیه</SelectItem>
                    <SelectItem value="10">۱۰ ثانیه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">ابعاد</Label>
                <Input value="720×1440 (عمودی)" disabled className="border-zinc-700 bg-zinc-900" />
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label className="text-zinc-300">پرامپت (اختیاری)</Label>
              <Textarea
                placeholder="اگر خالی بگذارید، هوش مصناعی پرامپت سینمایی مناسب تولید می‌کند..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="border-zinc-700 bg-zinc-900"
              />
            </div>

            <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertCircle className="inline h-4 w-4" /> تولید ویدیو ۱ تا ۳ دقیقه زمان می‌برد. در پس‌زمینه انجام می‌شود و لیست هر ۱۰ ثانیه به‌روزرسانی می‌شود.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={generating}>
              انصراف
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedListing}
              className="bg-[#F58220] text-white hover:bg-[#e07610]"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال شروع...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  تولید ریلز
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewReel} onOpenChange={(v) => !v && setPreviewReel(null)}>
        <DialogContent className="max-w-3xl border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#F58220]">
              <Play className="h-5 w-5" />
              پیش‌نمایش ریلز
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {previewReel?.listing?.title}
            </DialogDescription>
          </DialogHeader>

          {previewReel && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Video player */}
              <div className="space-y-3">
                {previewReel.videoUrl ? (
                  <video
                    src={previewReel.videoUrl}
                    poster={previewReel.thumbnailUrl || undefined}
                    controls
                    loop
                    autoPlay
                    muted
                    playsInline
                    className="aspect-[9/16] w-full rounded-lg bg-black"
                  />
                ) : (
                  <div className="flex aspect-[9/16] items-center justify-center rounded-lg bg-zinc-900">
                    <Film className="h-12 w-12 text-zinc-700" />
                  </div>
                )}
                <div className="flex gap-2">
                  {shareLinks?.download && (
                    <a href={shareLinks.download} download target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="border-zinc-700">
                        <Download className="h-4 w-4" />
                        دانلود
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Share buttons */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-zinc-200">اشتراک در شبکه‌های اجتماعی</h4>
                <div className="grid grid-cols-1 gap-2">
                  {shareLinks && (
                    <>
                      <ShareButton
                        href={shareLinks.instagram}
                        icon={Instagram}
                        label="اینستاگرام"
                        color="text-pink-400"
                      />
                      <ShareButton
                        href={shareLinks.tiktok}
                        icon={Music2}
                        label="تیک‌تاک"
                        color="text-zinc-100"
                      />
                      <ShareButton
                        href={shareLinks.facebook}
                        icon={Facebook}
                        label="فیسبوک"
                        color="text-blue-400"
                      />
                      <ShareButton
                        href={shareLinks.whatsapp}
                        icon={MessageCircle}
                        label="واتس‌اپ"
                        color="text-green-400"
                      />
                      <ShareButton
                        href={shareLinks.telegram}
                        icon={Send}
                        label="تلگرام"
                        color="text-sky-400"
                      />
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>پلتفرم:</span>
                    <span>{platformMeta(previewReel.platform).label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مدت:</span>
                    <span>{previewReel.durationSec} ثانیه</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ابعاد:</span>
                    <span>{previewReel.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>بازدید:</span>
                    <span>{previewReel.viewCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>اشتراک:</span>
                    <span>{previewReel.shareCount}</span>
                  </div>
                </div>

                {previewReel.prompt && (
                  <div className="rounded-lg bg-zinc-900 p-2 text-[10px] text-zinc-500">
                    <span className="font-bold text-zinc-400">پرامپت: </span>
                    {previewReel.prompt}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-500">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString("fa-IR")}</p>
        </div>
        <Icon className={`h-6 w-6 ${color} opacity-50`} />
      </div>
    </Card>
  );
}

function ShareButton({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3 transition hover:border-[#F58220]/40 hover:bg-zinc-800"
    >
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="flex-1 text-sm text-zinc-200">{label}</span>
      <ExternalLink className="h-3 w-3 text-zinc-500" />
    </a>
  );
}
