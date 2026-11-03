import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { slugify, parseBig } from "@/lib/api-helpers";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIVAR_HOSTS = ["divar.ir", "divar.com"];
const SHEYPOOR_HOSTS = ["sheypoor.com"];

interface ScrapeResult {
  url: string;
  title?: string;
  description?: string;
  price?: string | null;
  images: string[];
  phone?: string | null;
  location?: string | null;
  brand?: string | null;
  category?: string | null;
  year?: number | null;
  hours?: number | null;
  condition?: string | null;
}

/** Extract phone numbers (Iran mobile/landline patterns) from text. */
function extractPhones(text: string): string[] {
  const matches = text.match(/0\d{10}|\+98\d{10}|09\d{9}/g) || [];
  return Array.from(new Set(matches));
}

/** Extract image URLs from raw HTML. */
function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (!src || src.startsWith("data:")) continue;
    if (/\.(jpg|jpeg|png|webp|gif|avif)/i.test(src) || src.includes("image")) {
      let url = src;
      if (url.startsWith("//")) url = "https:" + url;
      else if (url.startsWith("/")) {
        try {
          const u = new URL(baseUrl);
          url = `${u.origin}${url}`;
        } catch {
          /* skip */
        }
      }
      if (!seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  }
  // Also parse srcset
  const reSrcset = /srcset=["']([^"']+)["']/gi;
  while ((m = reSrcset.exec(html))) {
    const parts = m[1].split(",").map((p) => p.trim().split(/\s+/)[0]);
    for (const p of parts) {
      if (p && !p.startsWith("data:") && /\.(jpg|jpeg|png|webp)/i.test(p) && !seen.has(p)) {
        seen.add(p);
        out.push(p.startsWith("//") ? "https:" + p : p);
      }
    }
  }
  return out.slice(0, 20);
}

function extractPrice(text: string): string | null {
  const m =
    text.match(/(\d[\d٬,.\s]*)\s*(?:تومان|ریال|Toman|Rial|IR|R)/i) ||
    text.match(/قیمت[:\s]*(\d[\d٬,.\s]*)/i) ||
    text.match(/(\d{6,})/);
  if (!m) return null;
  return m[1].replace(/[٬,\s]/g, "");
}

/** Run LLM extraction with structured prompt. */
async function llmExtract(
  zai: any,
  pageText: string,
  url: string,
): Promise<Partial<ScrapeResult>> {
  const sys = `You are HEAVIX listing extractor. Given raw HTML / page text from a Persian classified ad (Divar/Sheypoor), extract structured JSON with these keys:
{
  "title": string,
  "description": string (Persian, 200-600 chars),
  "price": string (digits only, Toman) or null,
  "phone": string (Iran mobile like 09xxxxxxxxx) or null,
  "location": string (province/city) or null,
  "brand": string (Persian brand name) or null,
  "category": string (machine type) or null,
  "year": number or null,
  "hours": number or null,
  "condition": "NEW" | "USED" | "REFURBISHED" | "FOR_PARTS" | null
}
Return ONLY the JSON object, no markdown, no explanation.`;
  const truncated = pageText.slice(0, 12000);
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `URL: ${url}\n\nPAGE:\n${truncated}` },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion?.choices?.[0]?.message?.content || "";
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start === -1 || end === -1) return {};
    return JSON.parse(jsonStr.slice(start, end + 1));
  } catch {
    return {};
  }
}

/** Use web_search to find ad URLs for a query. */
async function searchAdUrls(zai: any, query: string, num = 5): Promise<string[]> {
  try {
    const r = await zai.functions.invoke("web_search", {
      query: `${query} site:divar.ir OR site:sheypoor.com`,
      num,
    });
    if (Array.isArray(r)) return r.map((x: any) => x.url || x.link).filter(Boolean);
    if (r?.results) return r.results.map((x: any) => x.url).filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

async function scrapeUrl(zai: any, url: string): Promise<ScrapeResult> {
  const base: ScrapeResult = { url, images: [] };
  try {
    const result = await zai.functions.invoke("page_reader", { url });
    const data = result?.data || result || {};
    const html = data.html || "";
    const title = data.title || "";
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const images = extractImagesFromHtml(html, url);
    const phones = extractPhones(html + " " + text);

    const llm = await llmExtract(zai, text || html, url);

    return {
      url,
      title: llm.title || title || undefined,
      description: llm.description || text.slice(0, 600) || undefined,
      price: llm.price || extractPrice(text),
      images,
      phone: llm.phone || phones[0] || null,
      location: llm.location || null,
      brand: llm.brand || null,
      category: llm.category || null,
      year: llm.year ?? null,
      hours: llm.hours ?? null,
      condition: llm.condition || null,
    };
  } catch (err: any) {
    return { ...base, description: `Error scraping: ${err?.message}` };
  }
}

async function getZai() {
  return await ZAI.create();
}

/** Convert a scraped result into a HEAVIX listing draft in DB. */
async function importListing(s: ScrapeResult) {
  const title = s.title || "بدون عنوان";
  let slug = slugify(title);
  let i = 1;
  while (await db.listing.findUnique({ where: { slug } })) {
    slug = `${slugify(title)}-${i++}`;
  }

  // Match brand
  let brandId: string | null = null;
  if (s.brand) {
    const b = await db.brand.findFirst({
      where: {
        OR: [
          { name: { contains: s.brand } },
          { nameEn: { contains: s.brand } },
        ],
      },
    });
    if (b) brandId = b.id;
  }

  // Match category
  let categoryId: string | null = null;
  if (s.category) {
    const c = await db.category.findFirst({
      where: {
        OR: [
          { name: { contains: s.category } },
          { nameEn: { contains: s.category } },
        ],
      },
    });
    if (c) categoryId = c.id;
  }

  const url2 = (() => {
    try {
      return new URL(s.url).hostname;
    } catch {
      return s.url;
    }
  })();

  const listing = await db.listing.create({
    data: {
      slug,
      title,
      description: s.description,
      shortDesc: s.description?.slice(0, 150),
      price: parseBig(s.price),
      priceType: s.price ? "FIXED" : "NEGOTIABLE",
      condition: s.condition || "USED",
      year: s.year ?? null,
      workingHours: s.hours ?? null,
      province: s.location || null,
      sellerName: null,
      sellerPhone: s.phone || null,
      sourceUrl: s.url,
      sourceSite: DIVAR_HOSTS.some((h) => url2.includes(h))
        ? "DIVAR"
        : SHEYPOOR_HOSTS.some((h) => url2.includes(h))
          ? "SHEYPOOR"
          : url2,
      brandId,
      categoryId,
      status: "PENDING",
      verified: false,
      featured: false,
    },
  });

  // Attach images — if the scraped listing has real images from Divar/Sheypoor, use those.
  // If NO real images were scraped, generate an AI image matching the exact machine type + brand.
  let imgs = s.images;
  if (imgs.length === 0) {
    const brandName = s.brand || undefined;
    const aiImg = await generateAIListingImage(title, brandName);
    if (aiImg) imgs = [aiImg];
  }
  if (imgs.length > 0) {
    await db.listingImage.createMany({
      data: imgs.slice(0, 10).map((url, idx) => ({
        listingId: listing.id,
        url,
        isPrimary: idx === 0,
        sortOrder: idx,
      })),
    });
  }

  return listing;
}

/**
 * Generate an AI image that matches the EXACT subject of the listing.
 * Uses the listing title + brand + model to build a precise prompt.
 * e.g. "غلطک بوماگ BW213" → "BOMAG road roller BW213, professional industrial photography"
 * Falls back to keyword-based static image if AI generation fails.
 */
async function generateAIListingImage(title: string, brand?: string): Promise<string | null> {
  try {
    // Translate Persian machine terms to English for better image search
    // ORDER MATTERS — more specific terms first (e.g. "بیل مکانیکی" before "بیل")
    const termMap: [string, string][] = [
      // Specific machines first
      ["بیل مکانیکی", "excavator"], ["بیل", "excavator"],
      ["مینی بیل", "mini excavator"], ["مینی‌بیل", "mini excavator"],
      ["لودر", "wheel loader"], ["بلدوزر", "bulldozer"],
      ["گریدر", "motor grader"], ["بکهو", "backhoe loader"],
      ["غلطک", "road roller"], ["رولر", "road roller"],
      ["اسکریپر", "scraper"],
      // Mining
      ["دامپ تراک", "mining dump truck"], ["دامپ‌تراک", "mining dump truck"], ["دامپتراک", "mining dump truck"],
      ["شاول", "mining shovel"],
      // Cranes
      ["جرثقیل برجی", "tower crane"], ["جرثقیل چرخ‌دار", "mobile crane"], ["جرثقیل زنجیری", "crawler crane"], ["جرثقیل", "crane"],
      // Material handling
      ["لیفتراک", "forklift"], ["تله‌هندل", "telehandler"], ["تله هندل", "telehandler"],
      ["ریچ تراک", "reach truck"], ["سکوی بلندبر", "aerial work platform"], ["سکو بلندبر", "aerial work platform"],
      // Trucks
      ["کامیون", "truck"], ["کشنده", "semi truck"], ["کمپرسی", "dump truck"],
      ["بنز", "Mercedes Benz truck"], ["اسکانیا", "Scania truck"], ["ولوو", "Volvo truck"],
      // Agriculture
      ["تراکتور", "farm tractor"], ["کمباین", "combine harvester"],
      ["بذرکار", "seed drill"], ["دیسک", "disc harrow"],
      // Concrete/Asphalt
      ["میکسر بتن", "concrete mixer truck"], ["پمپ بتن", "concrete pump truck"], ["بتن‌پمپ", "concrete pump truck"],
      ["بتن پمپ", "concrete pump truck"], ["فینیشر", "asphalt paver"], ["آسفالت", "asphalt paver"],
      // Crushing/Screening
      ["سنگ‌شکن", "stone crusher"], ["سنگ شکن", "stone crusher"], ["سرند", "screening machine"],
      ["نوار نقاله", "conveyor belt"],
      // Drilling
      ["حفاری", "drilling rig"], ["دریل", "drill rig"],
      // Power/Equipment
      ["ژنراتور", "generator"], ["کمپرسور", "air compressor"], ["پمپ", "water pump"],
      // Parts
      ["قطعه", "machinery spare part"], ["بکت", "excavator bucket"], ["چکش هیدرولیکی", "hydraulic breaker hammer"],
      // Minerals
      ["هماتیت", "hematite iron ore"], ["سنگ آهن", "iron ore"], ["مس", "copper ore"],
      ["باریت", "barite mineral"], ["سیلیس", "silica sand"], ["بنتونیت", "bentonite clay"],
    ];
    let englishSubject = "heavy machinery";
    const lowerTitle = (title || "").toLowerCase();
    for (const [fa, en] of termMap) {
      if (lowerTitle.includes(fa.toLowerCase())) { englishSubject = en; break; }
    }
    // Extract model number from title (e.g. "BW213", "PC220", "320", "966H", "CR8.90", "ZX210LC-5G", "Axor 1844")
    const modelMatch = (title || "").match(/\b[A-Z]{0,3}[\d]{2,4}[A-Z]{0,4}(?:[-.]?\d{1,4})?[A-Z]{0,3}\b/i);
    const modelPart = modelMatch ? ` ${modelMatch[0]}` : "";
    // Clean brand name for prompt
    const brandPart = brand ? ` ${brand}` : "";

    // Build search query — brand + machine type + model
    const searchQuery = `${brandPart} ${englishSubject}${modelPart}`.trim();
    console.log(`[AI Image] Searching real image for: "${title}" → query: "${searchQuery}"`);

    // Step 1: Search for REAL images of this exact machine (web image search)
    const zai = await ZAI.create();
    try {
      const searchResp = await zai.images.search.create({
        query: searchQuery,
        count: 3,
        rank: true,
      });
      const results = Array.isArray(searchResp?.results) ? searchResp.results : [];
      if (results.length > 0 && results[0].original_url) {
        // Download the top-ranked real image and save locally
        const imgUrl = results[0].original_url;
        console.log(`[AI Image] Found real image: ${imgUrl.slice(0, 80)}`);
        try {
          const resp = await fetch(imgUrl);
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer());
            const fs = await import("fs/promises");
            const path = await import("path");
            const dir = path.join(process.cwd(), "public", "uploads", "ai-generated");
            await fs.mkdir(dir, { recursive: true });
            const filename = `real-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
            const filepath = path.join(dir, filename);
            await fs.writeFile(filepath, buffer);
            return `/uploads/ai-generated/${filename}`;
          }
        } catch (dlErr) {
          console.log(`[AI Image] Download failed, trying next method: ${dlErr}`);
        }
      }
    } catch (searchErr: any) {
      console.log(`[AI Image] Image search failed: ${searchErr?.message?.slice(0, 100)}`);
    }

    // Step 2: If image search failed, try AI image generation (with delay to avoid 429)
    const genPrompt = `Professional industrial photography of a${brandPart} ${englishSubject}${modelPart}, clean background, high quality, detailed, realistic, commercial product photo`;
    console.log(`[AI Image] Falling back to generation: "${genPrompt.slice(0, 80)}"`);
    try {
      await new Promise(r => setTimeout(r, 1000)); // small delay to avoid rate limit
      const res = await zai.images.generations.create({
        prompt: genPrompt,
        size: "1280x720",
      });
      const b64 = res.data?.[0]?.base64;
      if (b64) {
        const fs = await import("fs/promises");
        const path = await import("path");
        const dir = path.join(process.cwd(), "public", "uploads", "ai-generated");
        await fs.mkdir(dir, { recursive: true });
        const filename = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        const filepath = path.join(dir, filename);
        await fs.writeFile(filepath, Buffer.from(b64, "base64"));
        return `/uploads/ai-generated/${filename}`;
      }
    } catch (genErr: any) {
      console.log(`[AI Image] Generation also failed: ${genErr?.message?.slice(0, 100)}`);
    }

    return null;
  } catch (e) {
    return null;
  }
}

/* POST /api/admin/ai-scraper
   Supports two interfaces:
   
   A) Frontend "action" format:
   { action: "scrape", limit, categoryFilter } → LLM generates realistic suggestions
   { action: "import", suggestion }            → creates a listing from a suggestion
   { action: "bulk-import", suggestions: [] }  → creates multiple listings
   
   B) Direct "mode" format (for programmatic use):
   { mode: "search", query, num? }    → web search + scrape
   { mode: "scrape", url }            → scrape a single URL
   { mode: "import", scraped }        → import a scraped result
   { mode: "bulk-import", urls: [] }  → scrape + import all
*/
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const mode = String(body.mode ?? "");

    // ════════════════════════════════════════════════
    // A) FRONTEND "action" FORMAT
    // ════════════════════════════════════════════════

    // ── Generate suggestions via LLM ──
    if (action === "scrape") {
      const limit = Math.min(Number(body.limit ?? 8) || 8, 20);
      const categoryFilter = body.categoryFilter ?? null;
      const zai = await getZai();

      // Fetch brands + ALL categories (not just roots — include L1/L2/L3) from DB
      const [brands, allCategories] = await Promise.all([
        db.brand.findMany({ where: { active: true, status: { not: "ARCHIVED" } }, select: { id: true, name: true, nameEn: true, type: true }, take: 200 }),
        db.category.findMany({ where: { active: true }, select: { id: true, name: true, slug: true, parentId: true, level: true } }),
      ]);

      if (brands.length === 0 || allCategories.length === 0) {
        return NextResponse.json({ ok: true, suggestions: [], totalFound: 0, message: "برند یا دسته‌ای در دیتابیس موجود نیست." });
      }

      // Build category list grouped by parent for the LLM — include L1 groups + L2 families
      const rootCats = allCategories.filter(c => !c.parentId);
      const l1Cats = allCategories.filter(c => c.level === 1);
      const l2Cats = allCategories.filter(c => c.level === 2);
      // Build "parent > child" pairs for L2 families (most specific useful level)
      const catPairs: string[] = [];
      for (const l2 of l2Cats) {
        const parent = allCategories.find(c => c.id === l2.parentId);
        if (parent) catPairs.push(`${parent.name} > ${l2.name}`);
      }
      // Also include L1 groups for variety
      const l1Names = l1Cats.map(c => c.name);
      const rootNames = rootCats.map(c => c.name);

      const brandList = brands.map((b) => `${b.name} (${b.nameEn || "—"})`).slice(0, 80).join("، ");
      const catList = [...rootNames, ...l1Names, ...catPairs].slice(0, 100).join("، ");

      let focusHint = "";
      if (categoryFilter) {
        const fc = allCategories.find((c) => c.id === categoryFilter);
        if (fc) {
          // Include the category + its children for deeper focus
          const children = allCategories.filter(c => c.parentId === fc.id).map(c => c.name);
          focusHint = `تمرکز روی دسته: ${fc.name}${children.length > 0 ? ` (شامل: ${children.join("، ")})` : ""}. `;
        }
      }

      // LLM prompt for realistic listing generation — covers ALL categories, not just machinery
      const prompt = `تو دستیار هوش مصنوعی مارکت‌پلیس صنعتی هویکس هستی.
وظیفه: ${limit} آگهی واقع‌گرایانه، متنوع و غیرتکراری برای بازار ایران تولید کنی.

برندهای موجود در هویکس: ${brandList}

دسته‌های موجود در هویکس (شامل همه حوزه‌ها — نه فقط ماشین‌آلات):
${catList}
${focusHint}
هر آگهی باید شامل این فیلدها باشد:
- title: عنوان کامل فارسی (شامل نوع دستگاه + برند + مدل + حالت)
- brand: نام برند از لیست بالا (دقیقاً مطابق)
- model: مدل دستگاه (مثل PC220, 320D, 966H, BW213, R924)
- category: نام دسته از لیست بالا (دقیقاً مطابق — می‌تواند دسته فرعی باشد)
- price: عدد قیمت به تومان (متناسب با نوع دستگاه — از ۵۰ میلیون تا ۱۵ میلیارد)
- year: سال ساخت میلادی (بین ۲۰۰۸ تا ۲۰۲۴)
- hours: ساعت کارکرد (بین ۵۰۰ تا ۱۵۰۰۰ — برای قطعات و مواد معدنی ۰ بگذار)
- city: شهر ایران
- condition: "نو" یا "صفر کارکرد" یا "کارکرده" یا "کم‌کارکرد"
- description: توضیحات کامل فارسی ۳-۴ جمله‌ای (شامل مشخصات فنی، وضعیت، و مزایا)

قوانین بسیار مهم:
۱. تنوع شدید: هر آگهی باید از دسته و برند متفاوتی باشد — تکرار ممنوع
۲. از تمام دسته‌ها استفاده کن: ماشین‌آلات، خودرو، قطعات، متعلقات، مواد معدنی، تجهیزات صنعتی، کشاورزی
۳. قیمت‌ها واقعی و متناسب با نوع دستگاه (یک ژنراتور ۲۰۰ کاوا با بیل مکانیکی قیمت یکسان ندارد)
۴. مدل‌ها واقعی و متناسب با برند (کوماتسو: PC210/PC220/PC300، کاترپیلار: 320/330/966، بوماگ: BW213/BW120)
۵. توضیحات طبیعی، متقاعدکننده و شامل جزئیات فنی
۶. شهرهای متنوع از سراسر ایران

فقط JSON برگردان:
{"suggestions":[{...}, ...]}`;

      let parsed: any[] = [];
      try {
        const llmRes = await zai.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `لطفاً ${limit} آگهی تولید کن.` },
          ],
          thinking: { type: "disabled" },
        });
        const content = llmRes.choices?.[0]?.message?.content ?? "";
        const m = content.match(/\{[\s\S]*\}/);
        if (m) {
          const obj = JSON.parse(m[0]);
          parsed = Array.isArray(obj.suggestions) ? obj.suggestions : Array.isArray(obj) ? obj : [];
        }
      } catch (e) {
        console.error("LLM suggestion generation failed:", e);
        // Deterministic fallback — covers MULTIPLE categories, not just machinery
        const cities = ["تهران", "اصفهان", "مشهد", "کرمان", "یزد", "اهواز", "شیراز", "تبریز", "رشت", "کرمانشاه"];
        const tmpl = [
          { t: "بیل مکانیکی ${b} PC220", m: "PC220", h: 5500, p: 4200000000, cat: "بیل مکانیکی" },
          { t: "لودر ${b} 966H", m: "966H", h: 7200, p: 3500000000, cat: "لودر" },
          { t: "بلدوزر ${b} D85A", m: "D85A", h: 8800, p: 5800000000, cat: "بولدوزر" },
          { t: "گریدر ${b} GD825A", m: "GD825A", h: 4100, p: 4900000000, cat: "گریدر" },
          { t: "غلطک ${b} BW213", m: "BW213", h: 3200, p: 2100000000, cat: "غلتک" },
          { t: "جرثقیل ${b} LT1000", m: "LT1000", h: 6500, p: 8500000000, cat: "جرثقیل" },
          { t: "لیفتراک ${b} 5تن", m: "FD50", h: 4800, p: 1200000000, cat: "لیفتراک" },
          { t: "ژنراتور ${b} 250 کاوا", m: "C250", h: 0, p: 3500000000, cat: "ژنراتور" },
          { t: "کمپرسور ${b} 1000 CFM", m: "XHP1070", h: 5200, p: 1800000000, cat: "کمپرسور" },
          { t: "تراکتور ${b} 6155", m: "6155", h: 3800, p: 2200000000, cat: "تراکتور" },
          { t: "کمباین ${b} ۵۰۷۰", m: "5070", h: 2100, p: 4500000000, cat: "کمباین" },
          { t: "پمپ بتن ${b} 37متر", m: "BSF37", h: 4600, p: 3200000000, cat: "پمپ بتن" },
        ];
        for (let i = 0; i < limit; i++) {
          const brand = brands[(i * 7) % Math.max(1, brands.length)]; // spread across brands
          const t = tmpl[i % tmpl.length];
          const city = cities[(i * 3) % cities.length];
          const year = 2012 + (i % 11);
          const cond = i % 4 === 0 ? "نو" : i % 4 === 1 ? "صفر کارکرد" : i % 4 === 2 ? "کارکرده" : "کم‌کارکرد";
          parsed.push({
            title: t.t.replace("${b}", brand.name),
            brand: brand.name,
            model: t.m,
            category: t.cat,
            price: String(t.p + i * 300000000),
            year: String(year),
            hours: String(t.h + i * 200),
            city,
            condition: cond,
            description: `${t.t.replace("${b}", brand.name)} مدل ${t.m}، سال ${year}، ${t.h + i * 200} ساعت کارکرد، وضعیت ${cond}، شهر ${city}. دستگاه سالم و آماده کار.`,
          });
        }
      }

      // Post-process: attach brand/category matches, phone, image
      // Comprehensive keyword→image mapping covering ALL machine types in the taxonomy
      const IMAGE_RULES: { keywords: string[]; img: string }[] = [
        // Road construction
        { keywords: ["بیل", "excavator", "خاکبردار"], img: "/images/machinery/excavator.png" },
        { keywords: ["لودر", "loader"], img: "/images/machinery/loader.png" },
        { keywords: ["بلدوزر", "bulldozer"], img: "/images/machinery/excavator.png" },
        { keywords: ["گریدر", "grader"], img: "/images/machinery/grader.png" },
        { keywords: ["بکهو", "backhoe"], img: "/images/machinery/loader.png" },
        { keywords: ["اسکریپر", "scraper"], img: "/images/sections/services.png" },
        { keywords: ["غلطک", "رولر", "roller", "road roller"], img: "/images/machinery/road-roller.png" },
        { keywords: ["فینیشر", "paver", "آسفالت"], img: "/images/sections/services.png" },
        { keywords: ["بتن", "concrete", "میکسر"], img: "/images/sections/services.png" },
        // Mining
        { keywords: ["دامپ", "dump truck", "معدن"], img: "/images/machinery/dump-truck.png" },
        { keywords: ["شاول", "shovel"], img: "/images/machinery/excavator.png" },
        { keywords: ["LHD"], img: "/images/sections/mining.png" },
        // Drilling
        { keywords: ["حفاری", "drill", "دریل"], img: "/images/sections/mining.png" },
        // Crushing
        { keywords: ["سنگ‌شکن", "crusher", "سرند", "نوار نقاله"], img: "/images/sections/mining.png" },
        // Cranes
        { keywords: ["جرثقیل", "crane", "بالابر"], img: "/images/sections/services.png" },
        // Forklift
        { keywords: ["لیفتراک", "forklift"], img: "/images/sections/services.png" },
        // Transport
        { keywords: ["کامیون", "تراک", "truck", "کشنده"], img: "/images/sections/services.png" },
        // Agriculture
        { keywords: ["تراکتور", "کمباین", "کشاورزی", "tractor", "combine"], img: "/images/sections/agriculture.png" },
        // Parts
        { keywords: ["قطعه", "part", "یدکی"], img: "/images/sections/parts.png" },
        // Attachments
        { keywords: ["بکت", "bucket", "چکش", "hammer", "ریپر"], img: "/images/sections/parts.png" },
        // Services
        { keywords: ["خدمات", "service"], img: "/images/sections/services.png" },
      ];
      const DEFAULT_IMG = "/images/sections/services.png";
      const MOBILE_PREFIXES = ["0912","0913","0914","0915","0916","0917","0918","0919","0901","0902","0930","0933","0935","0936","0937","0938","0939"];
      function pickImage(title: string): string {
        const lower = (title || "").toLowerCase();
        for (const r of IMAGE_RULES) { if (r.keywords.some((k) => lower.includes(k.toLowerCase()))) return r.img; }
        return DEFAULT_IMG;
      }

      function randomPhone(): string {
        return MOBILE_PREFIXES[Math.floor(Math.random() * MOBILE_PREFIXES.length)] + String(Math.floor(1000000 + Math.random() * 8999999));
      }

      const suggestions = parsed.slice(0, limit).map((s: any) => {
        // Match brand
        let brandMatch: string | undefined;
        let brandName: string | undefined;
        if (s.brand) {
          const bLower = String(s.brand).toLowerCase();
          const matched = brands.find((b) => b.name.toLowerCase() === bLower || b.nameEn?.toLowerCase() === bLower || b.name.toLowerCase().includes(bLower) || bLower.includes(b.name.toLowerCase()) || (b.nameEn && (b.nameEn.toLowerCase().includes(bLower) || bLower.includes(b.nameEn.toLowerCase()))));
          if (matched) { brandMatch = matched.id; brandName = matched.name; }
        }
        // Match category — try the LLM-suggested category first, then fall back to title matching
        let categoryMatch: string | undefined;
        if (s.category) {
          const catLower = String(s.category).toLowerCase();
          const matched = allCategories.find((c) => c.name.toLowerCase() === catLower || c.name.toLowerCase().includes(catLower) || catLower.includes(c.name.toLowerCase()));
          if (matched) categoryMatch = matched.id;
        }
        if (!categoryMatch) {
          const titleLower = (s.title + " " + (s.description || "")).toLowerCase();
          for (const c of allCategories) { if (c.name && titleLower.includes(c.name.toLowerCase())) { categoryMatch = c.id; break; } }
        }
        if (!categoryMatch && allCategories.length > 0) {
          // Default to machinery root, not first category
          const machinery = allCategories.find(c => c.slug === "machinery");
          categoryMatch = machinery?.id || allCategories[0].id;
        }

        return {
          title: s.title,
          brand: brandName ?? s.brand,
          model: s.model,
          category: s.category,
          price: s.price,
          year: s.year,
          hours: s.hours,
          city: s.city,
          condition: s.condition,
          description: s.description,
          phone: randomPhone(),
          images: [], // NO static images — AI image will be generated on import
          sourceSite: "تولید هوش مصنوعی",
          sourceUrl: "",
          brandMatch,
          categoryMatch,
        };
      });

      // Generate AI images for each suggestion SEQUENTIALLY (not parallel — avoids 429 rate limit).
      // For each listing: first search for a REAL image of the exact machine, then fall back to AI generation.
      // This is the ONLY source of images for AI-generated listings — NO static fallback images.
      for (const s of suggestions) {
        try {
          const aiImg = await generateAIListingImage(s.title, s.brand);
          if (aiImg) {
            s.images = [aiImg];
          } else {
            // Both image search AND AI generation failed — use a TEXT-ONLY placeholder (no misleading image)
            s.images = [];
          }
        } catch {
          s.images = [];
        }
      }
      const suggestionsWithImages = suggestions;

      return NextResponse.json({
        ok: true,
        suggestions: suggestionsWithImages,
        totalFound: suggestionsWithImages.length,
        webFound: 0,
        aiGenerated: suggestionsWithImages.length,
        autoImported: 0,
      });
    }

    // ── Import a single suggestion ──
    if (action === "import") {
      const s = body.suggestion;
      if (!s || !s.title) return NextResponse.json({ error: "suggestion.title required" }, { status: 400 });

      const title = String(s.title);
      let slug = slugify(title);
      let i = 1;
      while (await db.listing.findUnique({ where: { slug } })) { slug = `${slug}-${i++}`; }

      const listing = await db.listing.create({
        data: {
          slug,
          title,
          shortDesc: s.description?.slice(0, 200) || null,
          description: s.description || null,
          price: parseBig(s.price),
          priceType: s.price ? "NEGOTIABLE" : "CALL_FOR_PRICE",
          listingType: "SALE",
          condition: s.condition?.includes("نو") ? "NEW" : "USED",
          city: s.city || null,
          province: s.city || null,
          year: s.year ? Number(String(s.year).replace(/[^\d]/g, "")) || null : null,
          workingHours: s.hours ? Number(String(s.hours).replace(/[^\d]/g, "")) || null : null,
          status: "PUBLISHED",
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          brandId: s.brandMatch || null,
          categoryId: s.categoryMatch || null,
          sellerPhone: s.phone || null,
          sellerName: "وارد شده توسط هوش مصنوعی",
          sourceUrl: s.sourceUrl || null,
          sourceSite: s.sourceSite || null,
        },
      });

      // Save images — use the AI-generated image from the suggestion (already generated during scrape).
      // If somehow missing, generate one now as fallback.
      let imgs: string[] = s.images && s.images.length > 0 ? s.images.filter((u: string) => u && !u.startsWith("/images/")) : [];
      if (imgs.length === 0) {
        const aiImage = await generateAIListingImage(title, s.brand || s.brandMatch || undefined);
        if (aiImage) imgs = [aiImage];
      }
      if (imgs.length === 0) imgs = []; // No misleading static fallback — listing will have no image if AI fails
      for (let idx = 0; idx < imgs.length; idx++) {
        await db.listingImage.create({ data: { listingId: listing.id, url: imgs[idx], isPrimary: idx === 0, sortOrder: idx } });
      }

      return NextResponse.json({ ok: true, slug: listing.slug, id: listing.id, message: "آگهی با موفقیت در هویکس ثبت شد." });
    }

    // ── Bulk import ──
    if (action === "bulk-import") {
      const items = Array.isArray(body.suggestions) ? body.suggestions : [];
      if (items.length === 0) return NextResponse.json({ error: "suggestions[] required" }, { status: 400 });

      const results: any[] = [];
      for (const s of items) {
        try {
          const title = String(s.title || "بدون عنوان");
          let slug = slugify(title);
          let i = 1;
          while (await db.listing.findUnique({ where: { slug } })) { slug = `${slug}-${i++}`; }

          const listing = await db.listing.create({
            data: {
              slug, title,
              shortDesc: s.description?.slice(0, 200) || null,
              description: s.description || null,
              price: parseBig(s.price),
              priceType: s.price ? "NEGOTIABLE" : "CALL_FOR_PRICE",
              condition: s.condition?.includes("نو") ? "NEW" : "USED",
              city: s.city || null, province: s.city || null,
              year: s.year ? Number(String(s.year).replace(/[^\d]/g, "")) || null : null,
              workingHours: s.hours ? Number(String(s.hours).replace(/[^\d]/g, "")) || null : null,
              status: "PUBLISHED", publishedAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              brandId: s.brandMatch || null, categoryId: s.categoryMatch || null,
              sellerPhone: s.phone || null, sellerName: "وارد شده توسط هوش مصنوعی",
              sourceSite: s.sourceSite || null,
            },
          });

          // Save images — use AI-generated image from suggestion (already generated during scrape).
          // Filter out static fallback images — only keep AI-generated or real scraped images.
          let imgs: string[] = s.images && s.images.length > 0 ? s.images.filter((u: string) => u && !u.startsWith("/images/")) : [];
          if (imgs.length === 0) {
            const aiImage = await generateAIListingImage(title, s.brand || s.brandMatch || undefined);
            if (aiImage) imgs = [aiImage];
          }
          if (imgs.length === 0) imgs = []; // No misleading static fallback — listing will have no image if AI fails
          for (let idx = 0; idx < imgs.length; idx++) {
            await db.listingImage.create({ data: { listingId: listing.id, url: imgs[idx], isPrimary: idx === 0, sortOrder: idx } });
          }
          results.push({ title, slug: listing.slug, ok: true });
        } catch (e: any) {
          results.push({ title: s.title, ok: false, error: e?.message ?? "خطا" });
        }
      }
      const ok = results.filter((r) => r.ok).length;
      return NextResponse.json({ ok: true, imported: ok, total: items.length, results });
    }

    // ════════════════════════════════════════════════
    // B) DIRECT "mode" FORMAT (programmatic)
    // ════════════════════════════════════════════════
    const zai = await getZai();

    if (mode === "search") {
      const query = String(body.query ?? "").trim();
      if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
      const num = Math.max(1, Math.min(10, Number(body.num) || 5));
      const urls = await searchAdUrls(zai, query, num);
      const results = await Promise.all(urls.slice(0, num).map((u) => scrapeUrl(zai, u)));
      return NextResponse.json({ ok: true, results });
    }

    if (mode === "scrape") {
      const url = String(body.url ?? "").trim();
      if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
      const result = await scrapeUrl(zai, url);
      return NextResponse.json({ ok: true, result });
    }

    if (mode === "import") {
      const scraped = body.scraped as ScrapeResult;
      if (!scraped || !scraped.url) return NextResponse.json({ error: "scraped is required" }, { status: 400 });
      const listing = await importListing(scraped);
      return NextResponse.json({ ok: true, id: listing.id, slug: listing.slug });
    }

    if (mode === "bulk-import") {
      const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
      if (urls.length === 0) return NextResponse.json({ error: "urls is required" }, { status: 400 });
      const scraped = await Promise.all(urls.map((u) => scrapeUrl(zai, u)));
      const imported: any[] = [];
      for (const s of scraped) {
        try { const l = await importListing(s); imported.push({ id: l.id, slug: l.slug, sourceUrl: s.url, ok: true }); }
        catch (err: any) { imported.push({ sourceUrl: s.url, ok: false, error: err?.message }); }
      }
      return NextResponse.json({ ok: true, count: imported.length, results: imported });
    }

    return NextResponse.json({ error: "Unknown action or mode" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
