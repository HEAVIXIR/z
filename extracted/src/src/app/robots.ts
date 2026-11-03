import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/* ============================================================
   HEAVIX — robots.ts (P2-28)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md P2-28
   ------------------------------------------------------------
   Next.js metadata-route robots.txt.
   Allow all, point to the sitemap.
   ============================================================ */

export const revalidate = 3600; // 1 hour
export const runtime = "nodejs";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://havix.ir";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow admin + API + auth routes — they're not for indexing.
        disallow: ["/admin/", "/api/", "/dashboard/", "/seller/", "/login", "/register"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: base,
  };
}
