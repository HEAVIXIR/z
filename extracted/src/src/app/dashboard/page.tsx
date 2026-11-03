import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import { generateRecommendations, REASON_LABEL_FA, type RecommendationReason } from "@/lib/recommendations";
import EmailVerificationWarning from "./EmailVerificationWarning";
import DashboardRecommendations from "./DashboardRecommendations";
import DashboardNav from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";

/* =========================================================
   /dashboard — basic user dashboard (FIX 3)
   Shown for SELLER and BUYER roles after login. Admin-role
   users are redirected to /admin/dashboard by the LoginForm
   client logic, but they can also reach this page directly
   if they want — the layout is generic.
   Sections:
     • Welcome message + role badge
     • Email verification warning (if !emailVerified) with
       resend button + 7-day countdown
     • Profile card (name, email, mobile, status, dates)
     • User's listings (db.listing where sellerId = user.id)
========================================================= */

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "مدیر",
  SELLER: "فروشنده",
  BUYER: "خریدار",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  PENDING: "در انتظار تأیید",
  BLOCKED: "مسدود",
  REJECTED: "رد شده",
};

const LISTING_STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "منتشر شده",
  PENDING: "در انتظار بررسی",
  DRAFT: "پیش‌نویس",
  REJECTED: "رد شده",
  SOLD: "فروخته شده",
  EXPIRED: "منقضی",
};

function daysRemaining(deadline: Date | null): number | null {
  if (!deadline) return null;
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default async function UserDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = (user.role || "BUYER").toUpperCase();
  const roleLabel = ROLE_LABEL[role] ?? role;
  const statusLabel = STATUS_LABEL[user.status] ?? user.status;
  const daysLeft = daysRemaining(user.verificationDeadline);

  // Pull the user's listings — most recent first, limited to 50.
  const listings = await db.listing.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      status: true,
      province: true,
      city: true,
      createdAt: true,
      publishedAt: true,
      viewCount: true,
      _count: { select: { favorites: true } },
    },
  });

  // P2-24 — Recommendation Engine.
  // Generate (refresh) recommendations for this user, then load the
  // top 6 active (non-dismissed) recs joined with their Listing rows
  // for the "پیشنهادهای شما" dashboard section.
  await generateRecommendations(user.id, 12);
  const recommendationRows = await db.userRecommendation.findMany({
    where: { userId: user.id, dismissed: false },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 6,
    include: {
      listing: {
        select: {
          id: true,
          slug: true,
          title: true,
          shortDesc: true,
          price: true,
          priceType: true,
          province: true,
          city: true,
          year: true,
          workingHours: true,
          featured: true,
          verified: true,
          viewCount: true,
          condition: true,
          description: true,
          brand: { select: { id: true, name: true, nameEn: true, slug: true } },
          category: { select: { id: true, name: true, slug: true, icon: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        },
      },
    },
  });
  const recommendations = recommendationRows
    .filter((r) => r.listing)
    .map((r) => ({
      id: r.listing.id,
      slug: r.listing.slug,
      title: r.listing.title,
      shortDesc: r.listing.shortDesc,
      description: r.listing.description,
      price: r.listing.price ? r.listing.price.toString() : null,
      priceType: r.listing.priceType,
      province: r.listing.province,
      city: r.listing.city,
      year: r.listing.year,
      workingHours: r.listing.workingHours,
      featured: r.listing.featured,
      verified: r.listing.verified,
      viewCount: r.listing.viewCount,
      condition: r.listing.condition,
      brand: r.listing.brand,
      category: r.listing.category,
      image: r.listing.images?.[0]?.url ?? null,
      reason: r.reason as RecommendationReason,
      reasonLabel: REASON_LABEL_FA[r.reason as RecommendationReason] ?? r.reason,
      score: r.score,
      recommendationId: r.id,
    }));

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0b0b0b] text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,130,32,0.08), transparent 70%)",
      }}
    >
      {/* Top bar */}
      <DashboardNav />

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6 lg:py-12">
        {/* Welcome */}
        <section className="mb-8">
          <h1 className="text-3xl font-black text-white">
            سلام، {user.firstName} {user.lastName} 👋
          </h1>
          <p className="mt-2 text-sm text-white/55">
            به داشبورد کاربری هویکس خوش آمدید. از اینجا می‌توانید آگهی‌ها و
            اطلاعات حساب خود را مدیریت کنید.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F58220]/30 bg-[#F58220]/10 px-3 py-1 text-xs font-bold text-[#F58220]">
              نقش: {roleLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
              وضعیت: {statusLabel}
            </span>
            {user.emailVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                ایمیل تأیید شد ✓
              </span>
            )}
            {user.mobileVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                موبایل تأیید شد ✓
              </span>
            )}
          </div>
        </section>

        {/* Email verification warning */}
        {!user.emailVerified && (
          <EmailVerificationWarning
            email={user.email}
            userId={user.id}
            daysLeft={daysLeft}
          />
        )}

        {/* P2-24 — Personalized recommendations */}
        <DashboardRecommendations recommendations={recommendations} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-black text-white">اطلاعات حساب</h2>
            <p className="mt-1 text-xs text-white/40">پروفایل کاربری</p>
            <dl className="mt-5 space-y-3 text-sm">
              <ProfileRow label="نام" value={`${user.firstName} ${user.lastName}`} />
              <ProfileRow label="ایمیل" value={user.email} />
              <ProfileRow label="موبایل" value={toFa(user.mobile)} />
              {user.companyName && (
                <ProfileRow label="شرکت" value={user.companyName} />
              )}
              <ProfileRow label="نقش" value={roleLabel} />
              <ProfileRow label="وضعیت" value={statusLabel} />
              <ProfileRow
                label="تاریخ ثبت‌نام"
                value={faDate(user.createdAt)}
              />
              {user.lastLoginAt && (
                <ProfileRow
                  label="آخرین ورود"
                  value={faDate(user.lastLoginAt)}
                />
              )}
            </dl>
          </section>

          {/* Listings */}
          <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">آگهی‌های من</h2>
                <p className="mt-1 text-xs text-white/40">
                  {toFa(listings.length)} آگهی ثبت شده
                </p>
              </div>
              <Link
                href="/listings/new"
                className="rounded-full border border-[#F58220]/40 px-4 py-2 text-xs font-bold text-[#F58220] transition hover:bg-[#F58220]/10"
              >
                + آگهی جدید
              </Link>
            </div>

            <div className="mt-5">
              {listings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/30 px-6 py-12 text-center">
                  <p className="text-sm text-white/45">
                    هنوز آگهی ثبت نکرده‌اید.
                  </p>
                  <Link
                    href="/listings/new"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#F58220]"
                  >
                    اولین آگهی خود را ثبت کنید ←
                  </Link>
                </div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto pr-1">
                  <ul className="divide-y divide-white/5">
                    {listings.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/listings/${l.slug}`}
                            className="block truncate text-sm font-bold text-white transition hover:text-[#F58220]"
                          >
                            {l.title}
                          </Link>
                          <p className="mt-0.5 truncate text-[11px] text-white/45">
                            {l.province ?? "—"} · {l.city ?? "—"} ·{" "}
                            {faDate(l.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-xs font-bold text-[#F58220]">
                            {l.price
                              ? formatCompactPrice(l.price)
                              : "توافقی"}
                          </span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/listings/${l.id}/edit`}
                              className="rounded-lg border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/80 transition hover:border-[#F58220] hover:text-[#F58220]"
                            >
                              ویرایش
                            </Link>
                            <span className="text-[10px] text-white/40">
                              {LISTING_STATUS_LABEL[l.status] ?? l.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t border-white/10 py-6 text-center text-[11px] text-white/35">
        HEAVIX © {toFa(new Date().getFullYear())} — بازار ماشین‌آلات صنعتی
      </footer>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-white/45">{label}</dt>
      <dd className="truncate text-sm font-bold text-white/85">{value}</dd>
    </div>
  );
}
