import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MENU = [
  { title: "خانه", href: "/", icon: "home", order: 0 },
  { title: "آگهی‌ها", href: "/listings", icon: "list", order: 1 },
  { title: "درخواست خرید", href: "/requests/new", icon: "shopping-cart", order: 2 },
  { title: "برندها", href: "/listings", icon: "tag", order: 3 },
  { title: "دسته‌بندی‌ها", href: "/listings", icon: "grid", order: 4 },
  { title: "بلاگ", href: "/knowledge", icon: "book", order: 5 },
  { title: "درباره ما", href: "/#about", icon: "info", order: 6 },
  { title: "تماس با ما", href: "/#contact", icon: "phone", order: 7 },
];

/* GET /api/menu — public menu items, auto-seeds defaults if empty. */
export async function GET() {
  try {
    let items = await db.menuItem.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    if (items.length === 0) {
      await db.menuItem.createMany({ data: DEFAULT_MENU });
      items = await db.menuItem.findMany({
        where: { active: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
    }
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
