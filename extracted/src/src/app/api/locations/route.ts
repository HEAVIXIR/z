import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   GET /api/locations — unified public location endpoint.

   Cascading usage:
   - GET /api/locations                       → list countries
   - GET /api/locations?country=<code|id>     → list provinces of that country
   - GET /api/locations?province=<id>         → list cities of that province
   - GET /api/locations?country=IR&provinces=1 → countries + provinces for IR (optional convenience)

   Returns:
   - countries: [{ id, name, nameEn, code }]
   - provinces: [{ id, name, nameEn, code, countryId }]
   - cities:    [{ id, name, nameEn, provinceId, latitude, longitude }]
   ============================================================ */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const country = (url.searchParams.get("country") ?? "").trim();
    const province = (url.searchParams.get("province") ?? "").trim();

    // Resolve a country identifier (ISO code like "IR" or a record id)
    // to a single Country row.
    const resolveCountry = async (raw: string) => {
      if (!raw) return null;
      return db.country.findFirst({
        where: {
          OR: [{ code: raw }, { id: raw }, { name: raw }],
        },
        select: { id: true },
      });
    };

    const resolveProvince = async (raw: string) => {
      if (!raw) return null;
      return db.province.findFirst({
        where: { OR: [{ id: raw }, { name: raw }] },
        select: { id: true },
      });
    };

    // Province list (filter by country code/id)
    if (country) {
      const c = await resolveCountry(country);
      if (!c) {
        return NextResponse.json({ provinces: [], country: null });
      }
      const provinces = await db.province.findMany({
        where: { countryId: c.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          nameEn: true,
          code: true,
          countryId: true,
          sortOrder: true,
        },
      });
      return NextResponse.json({ country: c, provinces });
    }

    // City list (filter by province id)
    if (province) {
      const p = await resolveProvince(province);
      if (!p) {
        return NextResponse.json({ cities: [], province: null });
      }
      const cities = await db.city.findMany({
        where: { provinceId: p.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          nameEn: true,
          provinceId: true,
          latitude: true,
          longitude: true,
        },
      });
      return NextResponse.json({ province: p, cities });
    }

    // Default: list all countries
    const countries = await db.country.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        code: true,
        phoneCode: true,
        sortOrder: true,
      },
    });
    return NextResponse.json({ countries });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

/* POST /api/locations — admin create country/province/city.
   Body: { level: "country" | "province" | "city", ...fields }
*/
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const level = String(body.level ?? "country").toLowerCase();

    if (level === "country") {
      if (!body.name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      const country = await db.country.create({
        data: {
          name: String(body.name),
          nameEn: body.nameEn ?? null,
          code: body.code ? String(body.code).toUpperCase() : null,
          phoneCode: body.phoneCode ?? null,
          sortOrder: Number(body.sortOrder) || 0,
        },
      });
      return NextResponse.json({ ok: true, country });
    }

    if (level === "province") {
      if (!body.name || !body.countryId) {
        return NextResponse.json(
          { error: "name and countryId are required" },
          { status: 400 },
        );
      }
      const province = await db.province.create({
        data: {
          name: String(body.name),
          nameEn: body.nameEn ?? null,
          code: body.code ?? null,
          countryId: String(body.countryId),
          sortOrder: Number(body.sortOrder) || 0,
        },
      });
      return NextResponse.json({ ok: true, province });
    }

    if (level === "city") {
      if (!body.name || !body.provinceId) {
        return NextResponse.json(
          { error: "name and provinceId are required" },
          { status: 400 },
        );
      }
      const city = await db.city.create({
        data: {
          name: String(body.name),
          nameEn: body.nameEn ?? null,
          provinceId: String(body.provinceId),
          latitude: body.latitude != null ? Number(body.latitude) : null,
          longitude: body.longitude != null ? Number(body.longitude) : null,
          sortOrder: Number(body.sortOrder) || 0,
        },
      });
      return NextResponse.json({ ok: true, city });
    }

    return NextResponse.json(
      { error: "level must be country | province | city" },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
