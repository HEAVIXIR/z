import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isAuthenticated } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────
   GET /api/admin/media-library — list all uploaded files
   in /public/uploads/ (recursive). Returns array of:
     { url, filename, size, mtime, dir }
   Admin-only.
────────────────────────────────────────────────────────── */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"]);

async function walk(dir: string, base: string): Promise<Array<{
  url: string;
  filename: string;
  size: number;
  mtime: string;
  dir: string;
}>> {
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: Array<{ url: string; filename: string; size: number; mtime: string; dir: string }> = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, base)));
      continue;
    }
    const ext = path.extname(e.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    let stat;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    const rel = path.relative(base, full).split(path.sep).join("/");
    out.push({
      url: `/uploads/${rel}`,
      filename: e.name,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      dir: path.relative(base, dir).split(path.sep).join("/") || "/",
    });
  }
  out.sort((a, b) => (a.mtime < b.mtime ? 1 : a.mtime > b.mtime ? -1 : 0));
  return out;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const files = await walk(UPLOAD_ROOT, UPLOAD_ROOT);
    return NextResponse.json({ ok: true, files, count: files.length });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
