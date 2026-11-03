import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/company/partners/[id]
   PATCH  — accept or reject a partnership request
            body: { action: "accept" | "reject" }
   DELETE — remove a partnership (either party)

   Auth: caller must be
     (a) an admin (legacy admin cookie), OR
     (b) a user whose `companyId` is either `companyId` or
         `partnerId` of the partnership row.
   ============================================================ */

interface Args {
  params: Promise<{ id: string }>;
}

async function authorize(partner: { companyId: string; partnerId: string }) {
  // Admin short-circuits.
  const adminOk = await isAuthenticated();
  if (adminOk) return { ok: true as const, mode: "ADMIN" as const };
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, mode: "USER" as const };
  if (!user.companyId) return { ok: false as const, mode: "USER" as const };
  if (user.companyId !== partner.companyId && user.companyId !== partner.partnerId) {
    return { ok: false as const, mode: "USER" as const };
  }
  return { ok: true as const, mode: "USER" as const, user };
}

export async function PATCH(req: Request, { params }: Args) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "").toLowerCase();

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
    }

    const existing = await db.companyPartner.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only the INVITED partner (partnerId's company) can accept/reject
    // a PENDING request. (The requester can cancel via DELETE.)
    const url = new URL(req.url);
    const overrideCompanyId = url.searchParams.get("companyId");

    // Admin override bypasses the ownership check.
    const adminOk = await isAuthenticated();
    if (!adminOk) {
      const user = await getCurrentUser();
      if (!user || !user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // If overrideCompanyId supplied (admin UI), the user's companyId
      // must match the partnerId of the row (the invitee).
      if (overrideCompanyId && overrideCompanyId !== existing.partnerId) {
        // The company the admin claims to act for is not the invitee —
        // only admins may do this. We already failed the adminOk check.
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (user.companyId !== existing.partnerId) {
        return NextResponse.json({ error: "فقط شرکت دعوت‌شده می‌تواند درخواست را بپذیرد یا رد کند" }, { status: 403 });
      }
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "این درخواست قبلاً پردازش شده است" }, { status: 400 });
    }

    const updated = await db.companyPartner.update({
      where: { id },
      data: {
        status: action === "accept" ? "ACCEPTED" : "REJECTED",
        acceptedAt: action === "accept" ? new Date() : null,
      },
    });

    await logAudit({
      actorType: adminOk ? "ADMIN" : "USER",
      actorId: adminOk ? undefined : (await getCurrentUser())?.id,
      action: action === "accept" ? "company.partner.accept" : "company.partner.reject",
      entityType: "CompanyPartner",
      entityId: id,
      before: existing,
      after: updated,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Partnership ${action}ed for ${existing.companyId} <-> ${existing.partnerId}`,
    });

    return NextResponse.json({ ok: true, partner: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: Args) {
  try {
    const { id } = await params;
    const existing = await db.companyPartner.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Either company can remove the partnership.
    const adminOk = await isAuthenticated();
    if (!adminOk) {
      const user = await getCurrentUser();
      if (!user || !user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (user.companyId !== existing.companyId && user.companyId !== existing.partnerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await db.companyPartner.delete({ where: { id } });

    await logAudit({
      actorType: adminOk ? "ADMIN" : "USER",
      actorId: adminOk ? undefined : (await getCurrentUser())?.id,
      action: "company.partner.remove",
      entityType: "CompanyPartner",
      entityId: id,
      before: existing,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Partnership removed between ${existing.companyId} and ${existing.partnerId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
