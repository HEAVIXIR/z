import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   /api/company/partners
   GET    — list partners of a company (accepted + pending)
   POST   — send a partnership request

   Auth: caller must be
     (a) an authenticated user whose `companyId` matches the
         target company, OR
     (b) an admin (legacy admin cookie) — admin can manage
         partnerships on behalf of any company (the admin UI
         on /admin/companies/[id] uses this path).

   Query/body param: `companyId` — the company whose partners
   are being managed. For user mode it MUST match the caller's
   own `companyId`; for admin mode it can be any company.
   ============================================================ */

async function resolveCompany(req: Request, body?: any): Promise<{ companyId: string; mode: "USER" | "ADMIN"; user?: any } | { error: NextResponse }> {
  const url = new URL(req.url);
  const companyId = (body?.companyId ?? url.searchParams.get("companyId") ?? "").trim();
  if (!companyId) {
    return { error: NextResponse.json({ error: "companyId is required" }, { status: 400 }) };
  }

  // Check admin cookie first.
  const adminOk = await isAuthenticated();
  if (adminOk) {
    const exists = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!exists) {
      return { error: NextResponse.json({ error: "Company not found" }, { status: 404 }) };
    }
    return { companyId, mode: "ADMIN" as const };
  }

  // Otherwise user must be authed and belong to this company.
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!user.companyId || user.companyId !== companyId) {
    return { error: NextResponse.json({ error: "شما به این شرکت دسترسی ندارید" }, { status: 403 }) };
  }
  return { companyId, mode: "USER" as const, user };
}

export async function GET(req: Request) {
  const resolved = await resolveCompany(req);
  if ("error" in resolved) return resolved.error;
  const { companyId } = resolved;

  try {
    // Partners this company has invited (outgoing) + partners who invited this company (incoming).
    const [outgoing, incoming] = await Promise.all([
      db.companyPartner.findMany({
        where: { companyId },
        include: {
          partner: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, city: true, province: true, verified: true,
              _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      }),
      db.companyPartner.findMany({
        where: { partnerId: companyId },
        include: {
          company: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, city: true, province: true, verified: true,
              _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      outgoing: outgoing.map((p) => ({
        id: p.id,
        status: p.status,
        requestedAt: p.requestedAt.toISOString(),
        acceptedAt: p.acceptedAt ? p.acceptedAt.toISOString() : null,
        notes: p.notes,
        direction: "OUTGOING" as const,
        partner: p.partner,
      })),
      incoming: incoming.map((p) => ({
        id: p.id,
        status: p.status,
        requestedAt: p.requestedAt.toISOString(),
        acceptedAt: p.acceptedAt ? p.acceptedAt.toISOString() : null,
        notes: p.notes,
        direction: "INCOMING" as const,
        partner: p.company,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const resolved = await resolveCompany(req, body);
  if ("error" in resolved) return resolved.error;
  const { companyId, mode, user } = resolved;

  try {
    const partnerId = String(body.partnerId ?? "").trim();
    if (!partnerId) {
      return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    }
    if (partnerId === companyId) {
      return NextResponse.json({ error: "یک شرکت نمی‌تواند با خودش همکاری ثبت کند" }, { status: 400 });
    }

    const partner = await db.company.findUnique({ where: { id: partnerId }, select: { id: true, status: true, name: true } });
    if (!partner || partner.status === "ARCHIVED") {
      return NextResponse.json({ error: "شرکت همکار یافت نشد" }, { status: 404 });
    }

    // Idempotent: if there's an existing row (in either direction), update its status.
    const existing = await db.companyPartner.findFirst({
      where: {
        OR: [
          { companyId, partnerId },
          { companyId: partnerId, partnerId: companyId },
        ],
      },
    });
    if (existing) {
      // If already accepted, no-op.
      if (existing.status === "ACCEPTED") {
        return NextResponse.json({ ok: true, already: true, id: existing.id });
      }
      // If rejected, re-arm as PENDING (a fresh invite).
      const updated = await db.companyPartner.update({
        where: { id: existing.id },
        data: { status: "PENDING", requestedAt: new Date(), acceptedAt: null },
      });
      await logAudit({
        actorType: mode === "ADMIN" ? "ADMIN" : "USER",
        actorId: user?.id,
        action: "company.partner.request",
        entityType: "CompanyPartner",
        entityId: updated.id,
        before: existing,
        after: updated,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        reason: `Partnership re-requested between ${companyId} and ${partnerId}`,
      });
      return NextResponse.json({ ok: true, id: updated.id });
    }

    const created = await db.companyPartner.create({
      data: { companyId, partnerId, status: "PENDING" },
    });

    await logAudit({
      actorType: mode === "ADMIN" ? "ADMIN" : "USER",
      actorId: user?.id,
      action: "company.partner.request",
      entityType: "CompanyPartner",
      entityId: created.id,
      after: created,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: `Partnership requested between ${companyId} and ${partnerId}`,
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
