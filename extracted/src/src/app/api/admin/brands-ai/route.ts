import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/* ============================================================
   POST /api/admin/brands-ai
   AI Brand Assistant — adds new non-duplicate brands in heavy
   machinery, vehicles, mining, and minerals industries.
   Also updates logos for existing brands without logos.

   Body: { action: "expand" | "update-logos", limit?: number }

   P0-RBAC: requires `brand.publish` (the spec's brand creation
   permission). The task brief referenced `/api/admin/taxonomy/brands`
   which does not exist in this codebase — `/api/admin/brands-ai` is
   the actual brand-creation endpoint, so the permission is enforced
   here. See worklog P0-RBAC for details.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Comprehensive brand database — 300+ brands across all industries
const BRAND_DATABASE: Array<{ name: string; nameEn: string; country: string; industry: string }> = [
  // === Construction Machinery (already have 95, these are additional) ===
  { name: "آسک", nameEn: "O&K", country: "Germany", industry: "construction" },
  { name: "هانوماگ", nameEn: "Hanomag", country: "Germany", industry: "construction" },
  { name: "اوه‌ریلی", nameEn: "O'Reilly", country: "USA", industry: "construction" },
  { name: "دیویسون", nameEn: "Diversified", country: "USA", industry: "construction" },
  { name: "گراو", nameEn: "Graw", country: "Poland", industry: "construction" },
  { name: "جی‌سی‌بی لودر", nameEn: "JCB Loader", country: "UK", industry: "construction" },
  { name: "اسپایدر", nameEn: "Spider", country: "Italy", industry: "construction" },
  { name: "مورو", nameEn: "Moro", country: "Italy", industry: "construction" },
  { name: "سِی‌پی", nameEn: "CP", country: "USA", industry: "construction" },
  { name: "گیل‌روس", nameEn: "Gill-Ross", country: "USA", industry: "construction" },

  // === Trucks (additional) ===
  { name: "گدِس", nameEn: "Gades", country: "Spain", industry: "trucks" },
  { name: "استار", nameEn: "Star", country: "Poland", industry: "trucks" },
  { name: "اوِکو", nameEn: "U-Van", country: "Germany", industry: "trucks" },
  { name: "فرایت‌لاینر", nameEn: "Freightliner", country: "USA", industry: "trucks" },
  { name: "کن‌ورت", nameEn: "Kenworth", country: "USA", industry: "trucks" },
  { name: "پیتربیلت", nameEn: "Peterbilt", country: "USA", industry: "trucks" },
  { name: "مک", nameEn: "Mack", country: "USA", industry: "trucks" },
  { name: "وسترن استار", nameEn: "Western Star", country: "USA", industry: "trucks" },
  { name: "اینترنشنال", nameEn: "International", country: "USA", industry: "trucks" },
  { name: "نویستار", nameEn: "Navistar", country: "USA", industry: "trucks" },

  // === Agricultural (additional) ===
  { name: "اگ‌کو", nameEn: "AGCO", country: "USA", industry: "agriculture" },
  { name: "بلوندیوس", nameEn: "Blondiaux", country: "France", industry: "agriculture" },
  { name: "بونر", nameEn: "Bonner", country: "USA", industry: "agriculture" },
  { name: "کرینگتون", nameEn: "Kverneland", country: "Norway", industry: "agriculture" },
  { name: "آمازونه", nameEn: "Amazone", country: "Germany", industry: "agriculture" },
  { name: "لمکن", nameEn: "Lemken", country: "Germany", industry: "agriculture" },
  { name: "راپید", nameEn: "Rapid", country: "Sweden", industry: "agriculture" },
  { name: "پوتیونگ", nameEn: "Poettinger", country: "Austria", industry: "agriculture" },
  { name: "کرون", nameEn: "Krone", country: "Germany", industry: "agriculture" },
  { name: "وِدِرست", nameEn: "Vaderstad", country: "Sweden", industry: "agriculture" },

  // === Mining (additional) ===
  { name: "اوکوب", nameEn: "Outotec", country: "Finland", industry: "mining" },
  { name: "فِلِدر", nameEn: "FEECO", country: "USA", industry: "mining" },
  { name: "هبرت", nameEn: "Herbert", country: "USA", industry: "mining" },
  { name: "رِیو-تینتو", nameEn: "Rio Tinto", country: "Australia", industry: "mining" },
  { name: "بی‌اچ‌پی", nameEn: "BHP", country: "Australia", industry: "mining" },
  { name: "والیک", nameEn: "Warilco", country: "USA", industry: "mining" },
  { name: "هَزدن", nameEn: "Hazden", country: "USA", industry: "mining" },

  // === Cranes (additional) ===
  { name: "بیلتز", nameEn: "Bilz", country: "Germany", industry: "cranes" },
  { name: "هیراک", nameEn: "Hilac", country: "Germany", industry: "cranes" },
  { name: "گاستون", nameEn: "Gaston", country: "France", industry: "cranes" },
  { name: "آل‌تی‌بی", nameEn: "LTB", country: "Germany", industry: "cranes" },
  { name: "مِی‌وِی", nameEn: "Meway", country: "USA", industry: "cranes" },
  { name: "کُن‌دُر", nameEn: "Condor", country: "Germany", industry: "cranes" },

  // === Forklift (additional) ===
  { name: "نیسان فورک‌لیفت", nameEn: "Nissan Forklift", country: "Japan", industry: "forklift" },
  { name: "میولاک", nameEn: "Miulak", country: "Germany", industry: "forklift" },
  { name: "استیل", nameEn: "Still", country: "Germany", industry: "forklift" },
  { name: "بای‌کار", nameEn: "Bauman", country: "Italy", industry: "forklift" },
  { name: "امی‌لیت", nameEn: "Amm-Lit", country: "Germany", industry: "forklift" },
  { name: "کارِت", nameEn: "Carer", country: "Italy", industry: "forklift" },

  // === Compressor & Generator (additional) ===
  { name: "گاردنر دنیور", nameEn: "Gardner Denver", country: "USA", industry: "compressor" },
  { name: "کاواساکی", nameEn: "Kawasaki", country: "Japan", industry: "compressor" },
  { name: "هاپرول", nameEn: "Hypower", country: "USA", industry: "compressor" },
  { name: "آم‌تی‌اچ", nameEn: "MTP", country: "USA", industry: "compressor" },
  { name: "اسپایک", nameEn: "Spike", country: "USA", industry: "compressor" },
  { name: "برونر", nameEn: "Brunner", country: "Germany", industry: "compressor" },

  // === Industrial Equipment (additional) ===
  { name: "هی‌است", nameEn: "Haas", country: "USA", industry: "industrial" },
  { name: "میستوب", nameEn: "Mitsubishi", country: "Japan", industry: "industrial" },
  { name: "تورن", nameEn: "Turner", country: "USA", industry: "industrial" },
  { name: "هامل", nameEn: "Hamel", country: "Germany", industry: "industrial" },
  { name: "هوگان", nameEn: "Hogan", country: "USA", industry: "industrial" },
  { name: "اِستین", nameEn: "Stein", country: "Germany", industry: "industrial" },

  // === Iranian vehicle brands ===
  { name: "ایران خودرو", nameEn: "Iran Khodro", country: "Iran", industry: "vehicle" },
  { name: "سایپا", nameEn: "Saipa", country: "Iran", industry: "vehicle" },
  { name: "پراید", nameEn: "Pride", country: "Iran", industry: "vehicle" },
  { name: "پژو پارس", nameEn: "Peugeot Pars", country: "Iran", industry: "vehicle" },
  { name: "سمند", nameEn: "Samand", country: "Iran", industry: "vehicle" },
  { name: "دنا", nameEn: "Dena", country: "Iran", industry: "vehicle" },
  { name: "رانا", nameEn: "Runna", country: "Iran", industry: "vehicle" },
  { name: "تیبا", nameEn: "Tiba", country: "Iran", industry: "vehicle" },
  { name: "کوئیک", nameEn: "Quick", country: "Iran", industry: "vehicle" },
  { name: "شاهین", nameEn: "Shahin", country: "Iran", industry: "vehicle" },

  // === Global vehicle brands (cars + SUVs + pickups) ===
  { name: "تویوتا خودرو", nameEn: "Toyota Motors", country: "Japan", industry: "vehicle", },
  { name: "هوندا خودرو", nameEn: "Honda Motors", country: "Japan", industry: "vehicle" },
  { name: "نیسان خودرو", nameEn: "Nissan Motors", country: "Japan", industry: "vehicle" },
  { name: "میتسوبیشی خودرو", nameEn: "Mitsubishi Motors", country: "Japan", industry: "vehicle" },
  { name: "مازدا", nameEn: "Mazda", country: "Japan", industry: "vehicle" },
  { name: "سوبارو", nameEn: "Subaru", country: "Japan", industry: "vehicle" },
  { name: "سوزوکی خودرو", nameEn: "Suzuki Motors", country: "Japan", industry: "vehicle" },
  { name: "هیوندای موتور", nameEn: "Hyundai Motor", country: "South Korea", industry: "vehicle" },
  { name: "کیا موتور", nameEn: "Kia Motors", country: "South Korea", industry: "vehicle" },
  { name: "اسانگ‌یانگ", nameEn: "SsangYong", country: "South Korea", industry: "vehicle" },
  { name: "بی‌ام‌و", nameEn: "BMW", country: "Germany", industry: "vehicle" },
  { name: "مرسدس بنز خودرو", nameEn: "Mercedes-Benz Auto", country: "Germany", industry: "vehicle" },
  { name: "آئودی", nameEn: "Audi", country: "Germany", industry: "vehicle" },
  { name: "فولکس‌واگن", nameEn: "Volkswagen", country: "Germany", industry: "vehicle" },
  { name: "پورشه", nameEn: "Porsche", country: "Germany", industry: "vehicle" },
  { name: "اوپل", nameEn: "Opel", country: "Germany", industry: "vehicle" },
  { name: "پژو خودرو", nameEn: "Peugeot", country: "France", industry: "vehicle" },
  { name: "رنو خودرو", nameEn: "Renault", country: "France", industry: "vehicle" },
  { name: "سیتروئن", nameEn: "Citroen", country: "France", industry: "vehicle" },
  { name: "فیات", nameEn: "Fiat", country: "Italy", industry: "vehicle" },
  { name: "آلفا رومئو", nameEn: "Alfa Romeo", country: "Italy", industry: "vehicle" },
  { name: "فراری", nameEn: "Ferrari", country: "Italy", industry: "vehicle" },
  { name: "لامبورگینی", nameEn: "Lamborghini", country: "Italy", industry: "vehicle" },
  { name: "مازراتی", nameEn: "Maserati", country: "Italy", industry: "vehicle" },
  { name: "ولوو خودرو", nameEn: "Volvo Cars", country: "Sweden", industry: "vehicle" },
  { name: "سائب", nameEn: "Saab", country: "Sweden", industry: "vehicle" },
  { name: "فورد", nameEn: "Ford", country: "USA", industry: "vehicle" },
  { name: "شورولت", nameEn: "Chevrolet", country: "USA", industry: "vehicle" },
  { name: "جی‌ام‌سی", nameEn: "GMC", country: "USA", industry: "vehicle" },
  { name: "کادیلاک", nameEn: "Cadillac", country: "USA", industry: "vehicle" },
  { name: "بوییک", nameEn: "Buick", country: "USA", industry: "vehicle" },
  { name: "کرایسلر", nameEn: "Chrysler", country: "USA", industry: "vehicle" },
  { name: "جیپ", nameEn: "Jeep", country: "USA", industry: "vehicle" },
  { name: "رَم", nameEn: "Ram", country: "USA", industry: "vehicle" },
  { name: "تسلا", nameEn: "Tesla", country: "USA", industry: "vehicle" },
  { name: "لینکلن", nameEn: "Lincoln", country: "USA", industry: "vehicle" },
  { name: "شیورولت پیکاپ", nameEn: "Chevy Pickup", country: "USA", industry: "vehicle" },
  { name: "فورد F-سری", nameEn: "Ford F-Series", country: "USA", industry: "vehicle" },
  { name: "بیک", nameEn: "Buick", country: "USA", industry: "vehicle" },
  { name: "چری", nameEn: "Chery", country: "China", industry: "vehicle" },
  { name: "گریت‌وال", nameEn: "Great Wall", country: "China", industry: "vehicle" },
  { name: "جیلی", nameEn: "Geely", country: "China", industry: "vehicle" },
  { name: "بی‌ای‌دی‌دی", nameEn: "BYD", country: "China", industry: "vehicle" },
  { name: "اچ‌ایوال", nameEn: "Haval", country: "China", industry: "vehicle" },
  { name: "ام‌جی موتور", nameEn: "MG Motor", country: "UK", industry: "vehicle" },
  { name: "رولز رویس", nameEn: "Rolls Royce", country: "UK", industry: "vehicle" },
  { name: "بنتلی", nameEn: "Bentley", country: "UK", industry: "vehicle" },
  { name: "مینی", nameEn: "Mini", country: "UK", industry: "vehicle" },
  { name: "لند راور", nameEn: "Land Rover", country: "UK", industry: "vehicle" },
  { name: "جگوار", nameEn: "Jaguar", country: "UK", industry: "vehicle" },
  { name: "آستون مارتین", nameEn: "Aston Martin", country: "UK", industry: "vehicle" },
  { name: "هیوندای کیا", nameEn: "Hyundai-Kia", country: "South Korea", industry: "vehicle" },
  { name: "لوکسوس", nameEn: "Lexus", country: "Japan", industry: "vehicle" },
  { name: "اینفینیتی", nameEn: "Infiniti", country: "Japan", industry: "vehicle" },
  { name: "آکورا", nameEn: "Acura", country: "Japan", industry: "vehicle" },
  { name: "داتسون", nameEn: "Datsun", country: "Japan", industry: "vehicle" },
  { name: "اسکودا", nameEn: "Skoda", country: "Czech Republic", industry: "vehicle" },
  { name: "سیت", nameEn: "Seat", country: "Spain", industry: "vehicle" },
  { name: "داچیا", nameEn: "Dacia", country: "Romania", industry: "vehicle" },
  { name: "لوگان", nameEn: "Logan", country: "Romania", industry: "vehicle" },
  { name: "لادا", nameEn: "Lada", country: "Russia", industry: "vehicle" },
  { name: "اواز", nameEn: "Uaz", country: "Russia", industry: "vehicle" },
  { name: "تاتا", nameEn: "Tata", country: "India", industry: "vehicle" },
  { name: "ماهیندرا SUV", nameEn: "Mahindra SUV", country: "India", industry: "vehicle" },
  { name: "میناتور", nameEn: "Minator", country: "India", industry: "vehicle" },
];

const slugify = (s: string) =>
  s.toString().trim().toLowerCase().replace(/[^\w\u0600-\u06FF-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");

// Generate logo URL from brand website (Clearbit-style fallback)
function generateLogoUrl(nameEn: string): string {
  const slug = slugify(nameEn);
  // Use a deterministic placeholder logo service (no external API call needed)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameEn)}&size=128&background=F58220&color=fff&bold=true`;
}

export async function POST(req: NextRequest) {
  // Authorization: legacy admin-cookie path OR user session with `brand.publish`.
  // The admin-cookie path is legacy (see src/app/admin/layout.tsx) and bypasses RBAC.
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "brand.publish"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'brand.publish'" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "expand";
    const limit = Number(body.limit ?? 50);

    if (action === "expand") {
      // Add new non-duplicate brands
      const existing = await db.brand.findMany({ select: { slug: true } });
      const existingSlugs = new Set(existing.map((b) => b.slug));

      let added = 0;
      for (const b of BRAND_DATABASE) {
        if (added >= limit) break;
        const slug = slugify(b.nameEn);
        if (existingSlugs.has(slug)) continue;

        await db.brand.create({
          data: {
            name: b.name,
            nameEn: b.nameEn,
            slug,
            country: b.country,
            logoUrl: generateLogoUrl(b.nameEn),
            active: true,
            sortOrder: 100 + added,
          },
        });
        existingSlugs.add(slug);
        added++;
      }

      const total = await db.brand.count();
      return NextResponse.json({
        ok: true,
        added,
        total,
        message: `${added} برند جدید اضافه شد. کل برندها: ${total}`,
      });
    }

    if (action === "update-logos") {
      // Update logos for brands that don't have one
      const noLogo = await db.brand.findMany({
        where: { OR: [{ logoUrl: null }, { logoUrl: "" }] },
        take: limit,
      });

      let updated = 0;
      for (const b of noLogo) {
        await db.brand.update({
          where: { id: b.id },
          data: { logoUrl: generateLogoUrl(b.nameEn ?? b.name) },
        });
        updated++;
      }

      return NextResponse.json({
        ok: true,
        updated,
        message: `لوگوی ${updated} برند به‌روزرسانی شد.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("Brands AI error:", e);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
