import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import ZAI from "z-ai-web-dev-sdk";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

/* ============================================================
   POST /api/admin/categories/[id]/generate-image
   AI arm for Category — generates an industrial image for the
   category using the z-ai-web-dev-sdk image generation API.
   Saves the PNG under /public/uploads/categories/<slug>-<rand>.png
   and updates the category's imageUrl field.

   Body (optional): { prompt?: string }
   If no prompt is provided, one is built from the category's
   name + nameEn + description (English, descriptive, industrial).

   Returns: { ok: true, imageUrl, prompt }
   On AI failure: { error } with status 500 (no crash).

   P0-RBAC: requires `taxonomy.write`. The task brief referenced
   `/api/admin/taxonomy/categories` (POST) which does not exist in
   this codebase — this is the only category-mutating endpoint, so
   the permission is enforced here. See worklog P0-RBAC for details.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // Authorization: legacy admin-cookie path OR user session with `taxonomy.write`.
  // The admin-cookie path is legacy (see src/app/admin/layout.tsx) and bypasses RBAC.
  const adminCookieOk = await isAuthenticated();
  const sessionUser = adminCookieOk ? null : await getCurrentUser();
  if (!adminCookieOk && !sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser && !(await hasPermission(sessionUser.id, "taxonomy.write"))) {
    return NextResponse.json(
      { error: "Forbidden: missing permission 'taxonomy.write'" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  let category: any = null;
  try {
    category = await db.category.findUnique({ where: { id } });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DB lookup failed: " + (e?.message ?? "unknown") },
      { status: 500 },
    );
  }

  if (!category) {
    return NextResponse.json(
      { error: "دسته‌بندی یافت نشد." },
      { status: 404 },
    );
  }

  // Parse body — ignore JSON errors (allow empty body)
  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const userPrompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  const prompt =
    userPrompt ||
    buildCategoryPrompt({
      name: category.name,
      nameEn: category.nameEn,
      description: category.description,
      domain: category.domain,
    });

  // Generate the image via SDK
  let base64: string | null = null;
  try {
    const zai = await ZAI.create();
    const resp = await zai.images.generations.create({
      prompt,
      size: "1344x768", // landscape, suitable for category hero
    });
    base64 = resp?.data?.[0]?.base64 ?? null;
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          "سرویس هوش مصنوعی در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید یا تصویر را به‌صورت دستی بارگذاری کنید.",
        detail: e?.message ?? "unknown",
      },
      { status: 502 },
    );
  }

  if (!base64) {
    return NextResponse.json(
      { error: "پاسخ خالی از سرویس تصویرسازی." },
      { status: 502 },
    );
  }

  // Persist under /public/uploads/categories/<slug>-<rand>.png
  const slugPart = (category.slug || "category")
    .toString()
    .replace(/[^\w\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "category";
  const rand = crypto.randomBytes(4).toString("hex");
  const filename = `${slugPart}-${rand}.png`;
  const dirAbs = path.join(process.cwd(), "public", "uploads", "categories");
  await fs.mkdir(dirAbs, { recursive: true });
  await fs.writeFile(path.join(dirAbs, filename), Buffer.from(base64, "base64"));

  const imageUrl = `/uploads/categories/${filename}`;

  try {
    await db.category.update({
      where: { id },
      data: { imageUrl },
    });
  } catch (e: any) {
    // The image is saved but DB update failed — still return the URL so
    // the admin can set it manually if needed.
    return NextResponse.json(
      {
        ok: true,
        imageUrl,
        prompt,
        warning: "تصویر ساخته شد اما به‌روزرسانی دیتابیس ناموفق بود.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, imageUrl, prompt });
}

/* Build a descriptive English prompt for industrial photography. */
function buildCategoryPrompt(c: {
  name: string;
  nameEn: string | null;
  description: string | null;
  domain: string | null;
}): string {
  const subject = c.nameEn?.trim() || c.name?.trim() || "industrial machinery";
  const desc = (c.description ?? "").trim();

  // Domain-aware scene hints
  const domainHint = (() => {
    switch ((c.domain ?? "").toUpperCase()) {
      case "MACHINE":
        return "heavy machinery on a construction site";
      case "VEHICLE":
        return "commercial truck or off-highway vehicle";
      case "PART":
        return "industrial spare part, macro product photography";
      case "ATTACHMENT":
        return "industrial attachment accessory for heavy equipment";
      case "MINERAL":
        return "mined mineral raw material, geological close-up";
      case "MATERIAL":
        return "bulk industrial material on site";
      default:
        return "heavy industrial equipment at work";
    }
  })();

  const base = `Professional industrial photography of ${subject}, ${domainHint}`;
  const tail = ", golden hour lighting, sharp focus, high detail, clean composition, professional commercial photograph, wide angle, no text, no watermark";

  if (desc) {
    // Trim description to keep prompt focused
    const d = desc.replace(/\s+/g, " ").slice(0, 180);
    return `${base}. Context: ${d}.${tail}`;
  }
  return `${base}.${tail}`;
}
