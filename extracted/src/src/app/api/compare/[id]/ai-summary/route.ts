import { NextResponse } from "next/server";
import { generateAISummary } from "@/lib/compare-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   POST /api/compare/[id]/ai-summary — generate (and cache) a
   Persian AI summary of the comparison. No winner declaration.
   Returns: { summary: string }
   ============================================================ */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const summary = await generateAISummary(id);
    return NextResponse.json({ summary });
  } catch (err: any) {
    const msg = err?.message ?? "Server error";
    const status = msg.includes("not found") ? 404 : msg.includes("حداقل") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
