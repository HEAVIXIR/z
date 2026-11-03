import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Require admin auth; returns a 401 NextResponse if not authed. */
export async function requireAdmin(): Promise<true | NextResponse> {
  const ok = await isAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return true;
}

/** Helper to normalize a string field into a slug. */
export function slugify(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Generate a unique slug against a Prisma model. */
export async function uniqueSlug(
  model: { findUnique: (args: { where: { slug: string } }) => Promise<any> },
  base: string,
): Promise<string> {
  let slug = slugify(base) || `item-${Date.now()}`;
  let i = 1;
  while (await model.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${i++}`;
  }
  return slug;
}

/** Try to parse a BigInt-safe number from form/query input. */
export function parseBig(value: any): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    const n = typeof value === "string" ? value.replace(/[^\d-]/g, "") : String(value);
    if (n === "" || n === "-") return null;
    return BigInt(n);
  } catch {
    return null;
  }
}

export function parseBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (!v) return false;
  return ["1", "true", "yes", "on", "TRUE", "True"].includes(String(v));
}

export function parseNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
