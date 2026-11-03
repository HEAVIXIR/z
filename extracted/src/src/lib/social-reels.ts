import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

/* ============================================================
   social-reels.ts — AI-powered short video generator for
   social media (Instagram/TikTok/Facebook/WhatsApp/Telegram).

   Pipeline:
   1. Load listing + primary image
   2. Build a cinematic prompt (brand + model + machine type)
   3. Read image file → base64 (or fetch remote → buffer)
   4. zai.video.generations.create({ image_url: base64, prompt,
      duration: 5, size: "720x1440" (vertical), quality: "speed" })
   5. Poll zai.async.result.query(taskId) until SUCCESS
   6. Download the resulting video URL → save under
      /public/uploads/reels/<id>.mp4
   7. Update SocialReel row with videoUrl + status=READY

   All steps log to console with [SocialReel] prefix for dev.log.
   ============================================================ */

const REELS_DIR = path.join(process.cwd(), "public", "uploads", "reels");

function ensureReelsDir() {
  if (!fs.existsSync(REELS_DIR)) {
    fs.mkdirSync(REELS_DIR, { recursive: true });
  }
}

/** Persian → English machine-type translation for the prompt. */
const TERM_MAP: Record<string, string> = {
  "بیل مکانیکی": "excavator",
  "بیل": "excavator",
  "لودر": "wheel loader",
  "بلدوزر": "bulldozer",
  "گریدر": "motor grader",
  "غلتک": "road roller",
  "غلطک": "road roller",
  "جرثقیل": "crane",
  "جرثقیل برجی": "tower crane",
  "جرثقیل زنجیری": "crawler crane",
  "لیفتراک": "forklift",
  "تله‌هندلر": "telehandler",
  "دامپ تراک": "dump truck",
  "دامپ‌تراک": "dump truck",
  "کامیون": "truck",
  "کمباین": "combine harvester",
  "تراکتور": "tractor",
  "بیل مکانیکی چرخ‌دار": "wheel excavator",
  "بیل مکانیکی زنجیری": "crawler excavator",
  "کمپرسور": "air compressor",
  "ژنراتور": "generator",
  "پمپ بتن": "concrete pump",
  "بتن‌ریز": "concrete mixer truck",
  " triturador": "crusher",
  "خردکننده": "crusher",
  "حفار": "drilling rig",
  "دریل": "drill",
};

/** Build a cinematic English prompt for the video generator. */
export function buildReelPrompt(listing: {
  title: string;
  brand?: { name: string } | null;
  shortDesc?: string | null;
  condition?: string | null;
  year?: number | null;
}): string {
  const title = listing.title || "industrial machine";
  let machineType = "heavy machinery";
  for (const [fa, en] of Object.entries(TERM_MAP)) {
    if (title.includes(fa)) {
      machineType = en;
      break;
    }
  }
  const brand = listing.brand?.name || "";
  const year = listing.year ? `, year ${listing.year}` : "";
  const cond =
    listing.condition === "NEW"
      ? ", brand new condition"
      : listing.condition === "USED"
        ? ", well-maintained used condition"
        : "";
  return `Cinematic vertical showcase of a ${brand} ${machineType}${year}${cond}. Professional industrial photography style, dramatic lighting, slow camera pan revealing the machine details, high quality, 4K, social media reel format. Highlight the power and engineering of the equipment.`;
}

/** Read a local file path OR fetch a remote URL → base64 data URI. */
async function imageToBase64(imageUrl: string): Promise<string | null> {
  try {
    // Local file path
    if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/images/")) {
      const localPath = path.join(process.cwd(), "public", imageUrl);
      if (fs.existsSync(localPath)) {
        const buf = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mime =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : "image/jpeg";
        return `data:${mime};base64,${buf.toString("base64")}`;
      }
    }
    // Remote URL → fetch
    if (imageUrl.startsWith("http")) {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") || "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    }
    return null;
  } catch (e) {
    console.error("[SocialReel] imageToBase64 error:", e);
    return null;
  }
}

/** Download a remote video URL → save locally, return /uploads/reels/<name>. */
async function downloadVideo(url: string, reelId: string): Promise<string | null> {
  try {
    ensureReelsDir();
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      console.error("[SocialReel] downloadVideo HTTP", res.status);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const fileName = `${reelId}.mp4`;
    const filePath = path.join(REELS_DIR, fileName);
    fs.writeFileSync(filePath, buf);
    console.log(
      `[SocialReel] saved video ${fileName} (${(buf.length / 1024).toFixed(1)} KB)`,
    );
    return `/uploads/reels/${fileName}`;
  } catch (e) {
    console.error("[SocialReel] downloadVideo error:", e);
    return null;
  }
}

/**
 * Generate a social reel video for a listing.
 * Creates the SocialReel row, generates the video, polls, downloads.
 * Returns the updated SocialReel.
 */
export async function generateSocialReel(opts: {
  listingId: string;
  platform?: string;
  prompt?: string;
  duration?: number;
  
}): Promise<{ id: string; status: string; videoUrl?: string | null; error?: string | null }> {
  const {
    listingId,
    platform = "INSTAGRAM",
    prompt,
    duration = 5,
    
  } = opts;

  console.log("[SocialReel] generateSocialReel start for listing", listingId);

  // 1. Load listing + primary image
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      brand: { select: { name: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
    },
  });
  if (!listing) throw new Error("Listing not found");
  const primaryImage = listing.images[0]?.url;
  if (!primaryImage) {
    throw new Error("Listing has no image — cannot generate reel");
  }

  // 2. Create SocialReel row (PENDING)
  const finalPrompt = prompt || buildReelPrompt(listing);
  const reel = await db.socialReel.create({
    data: {
      listingId,
      platform,
      prompt: finalPrompt,
      status: "GENERATING",
      duration,
      
      thumbnailUrl: primaryImage,
    },
  });
  console.log("[SocialReel] created row", reel.id, "platform", platform);

  try {
    // 3. Convert image → base64
    const imageBase64 = await imageToBase64(primaryImage);
    if (!imageBase64) {
      throw new Error("Failed to load primary image as base64");
    }
    console.log(
      "[SocialReel] image base64 ready, length",
      imageBase64.length,
    );

    // 4. Create video generation task (image-to-video)
    const zai = await ZAI.create();
    console.log("[SocialReel] creating video task, prompt:", finalPrompt.slice(0, 80) + "...");

    const task: any = await zai.video.generations.create({
      image_url: imageBase64,
      prompt: finalPrompt,
      quality: "speed",
      with_audio: false,
      size: "720x1440",
      fps: 30,
      duration: duration as 5 | 10,
    });
    console.log("[SocialReel] task created, id:", task.id, "status:", task.task_status);

    // Update row with taskId
    await (db.socialReel as any).update({
      where: { id: reel.id } as any,
    });

    // 5. Poll for result
    let result: any = task;
    const maxPolls = 72; // 72 × 5s = 6 min max
    const pollInterval = 5000;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, pollInterval));
      result = await zai.async.result.query(task.id);
      console.log(
        `[SocialReel] poll ${i + 1}/${maxPolls} status=${result.task_status}`,
      );
      if (result.task_status === "SUCCESS") break;
      if (result.task_status === "FAILED" || result.task_status === "ERROR") {
        throw new Error(`Video task failed: ${result.task_status}`);
      }
    }

    if (result.task_status !== "SUCCESS") {
      throw new Error(`Video generation timed out (status=${result.task_status})`);
    }

    // 6. Extract video URL
    const videoUrl =
      result.video_result?.[0]?.url ||
      result.video_url ||
      result.url ||
      result.video;
    if (!videoUrl) {
      console.error("[SocialReel] no video URL in result:", JSON.stringify(result).slice(0, 500));
      throw new Error("No video URL in task result");
    }
    console.log("[SocialReel] video URL:", videoUrl);

    // 7. Download → save locally
    const localUrl = await downloadVideo(videoUrl, reel.id);
    if (!localUrl) {
      // Fall back to remote URL if download fails
      console.warn("[SocialReel] download failed, using remote URL");
    }
    const finalUrl = localUrl || videoUrl;

    // 8. Update row → READY
    const updated = await (db.socialReel as any).update({
      where: { id: reel.id } as any,
      data: {
        status: "READY",
        videoUrl: finalUrl,
      },
    });
    console.log("[SocialReel] READY:", updated.id, finalUrl);
    return {
      id: updated.id,
      status: "READY",
      videoUrl: updated.videoUrl,
    };
  } catch (e: any) {
    console.error("[SocialReel] generation failed:", e?.message || e);
    await (db.socialReel as any).update({
      where: { id: reel.id } as any,
      data: { status: "FAILED" as any, prompt: e?.message?.slice(0,500) || String(e) },
    });
    return {
      id: reel.id,
      status: "FAILED",
      error: e?.message || String(e),
    };
  }
}

/** Build share links for each platform given a reel video URL + listing title. */
export function buildShareLinks(opts: {
  videoUrl: string;
  title: string;
  siteUrl?: string;
}): Record<string, string> {
  const { videoUrl, title, siteUrl = "" } = opts;
  const absoluteUrl = videoUrl.startsWith("http")
    ? videoUrl
    : `${siteUrl}${videoUrl}`;
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(absoluteUrl);
  return {
    instagram: `https://www.instagram.com/`,
    tiktok: `https://www.tiktok.com/upload`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    download: absoluteUrl,
  };
}
