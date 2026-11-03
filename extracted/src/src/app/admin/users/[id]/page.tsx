import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toFa, faDate, formatCompactPrice } from "@/lib/format";
import {
  ArrowRight,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Pencil,
  Megaphone,
  ShoppingCart,
  Wallet,
  Bell,
  Calendar,
  LogIn,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "مدیر",
  SELLER: "فروشنده",
  BUYER: "خریدار",
  INDIVIDUAL: "فرد",
};

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  SELLER: "bg-amber-100 text-amber-700",
  BUYER: "bg-blue-100 text-blue-700",
  INDIVIDUAL: "bg-zinc-100 text-zinc-600",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  PENDING: "در انتظار",
  BLOCKED: "مسدود",
  REJECTED: "ردشده",
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  BLOCKED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
};

const LISTING_STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "منتشرشده",
  PENDING: "در انتظار",
  DRAFT: "پیش‌نویس",
  REJECTED: "ردشده",
  SOLD: "فروخته‌شده",
  PAUSED: "متوقف‌شده",
};

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  ACCEPTED: "پذیرفته‌شده",
  REJECTED: "ردشده",
  COUNTERED: "پیشنهاد متقابل",
  EXPIRED: "منقضی",
};

/* Verification deadline = createdAt + 7 days (per FIX 7). */
function verificationDeadline(iso: Date): Date {
  return new Date(iso.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function faDateTime(d: Date | null): string {
  if (!d) return "—";
  try {
    return d.toLocaleString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function AdminUserDetailPage({ params }: Args) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      listings: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true, icon: true } },
          _count: { select: { favorites: true, leads: true } },
        },
      },
      requests: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      offers: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          listing: { select: { id: true, title: true, slug: true } },
        },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, createdAt: true, expiresAt: true },
      },
      _count: {
        select: {
          listings: true,
          offers: true,
          requests: true,
          favorites: true,
          follows: true,
          notifications: true,
        },
      },
    },
  });

  if (!user) notFound();

  const deadline = verificationDeadline(user.createdAt);
  const isDeadlineExpired = !user.emailVerified && deadline.getTime() < Date.now();
  const daysLeft = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const sectionCard = "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm";
  const labelCls = "mb-1.5 block text-xs font-bold text-zinc-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#F58220] hover:text-[#F58220]"
            title="بازگشت"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-zinc-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-xs text-zinc-500" dir="ltr">
              {user.email} · {user.mobile}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/users?_=${Date.now()}`}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition hover:border-[#F58220] hover:text-[#F58220]"
        >
          <Pencil className="h-3.5 w-3.5" />
          ویرایش از فهرست کاربران
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="آگهی" value={user._count.listings} icon={<Megaphone className="h-4 w-4" />} color="text-amber-700 bg-amber-100" />
        <StatCard label="پیشنهادها" value={user._count.offers} icon={<Wallet className="h-4 w-4" />} color="text-blue-700 bg-blue-100" />
        <StatCard label="درخواست‌ها" value={user._count.requests} icon={<ShoppingCart className="h-4 w-4" />} color="text-purple-700 bg-purple-100" />
        <StatCard label="علاقه‌مندی" value={user._count.favorites} icon={<Star className="h-4 w-4" />} color="text-amber-700 bg-amber-100" />
        <StatCard label="دنبال‌شده" value={user._count.follows} icon={<CheckCircle2 className="h-4 w-4" />} color="text-teal-700 bg-teal-100" />
        <StatCard label="اعلان‌ها" value={user._count.notifications} icon={<Bell className="h-4 w-4" />} color="text-zinc-700 bg-zinc-100" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="space-y-6 lg:col-span-1">
          <section className={sectionCard}>
            <h2 className="mb-4 text-sm font-black text-zinc-900">پروفایل کاربر</h2>
            <div className="space-y-3 text-sm">
              <ProfileRow icon={<Mail className="h-4 w-4" />} label="ایمیل" value={user.email} ltr />
              <ProfileRow icon={<Phone className="h-4 w-4" />} label="موبایل" value={user.mobile} ltr />
              {user.companyName && (
                <ProfileRow icon={<Building2 className="h-4 w-4" />} label="شرکت" value={user.companyName} />
              )}
              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-xs text-zinc-500">نقش</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ROLE_CLS[user.userType] ?? "bg-zinc-100 text-zinc-600"}`}>
                  {ROLE_LABEL[user.userType] ?? user.userType}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">وضعیت</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CLS[user.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                  {STATUS_LABEL[user.status] ?? user.status}
                </span>
              </div>
            </div>
          </section>

          {/* Verification */}
          <section className={sectionCard}>
            <h2 className="mb-4 text-sm font-black text-zinc-900">وضعیت تأیید</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">تأیید ایمیل</span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> تأییدشده
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    <ShieldX className="h-3.5 w-3.5" /> تأییدنشده
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">تأیید موبایل</span>
                {user.mobileVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> تأییدشده
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    <XCircle className="h-3.5 w-3.5" /> تأییدنشده
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                <div className="mb-1 flex items-center gap-2 text-zinc-600">
                  <Clock className="h-3.5 w-3.5" />
                  مهلت تأیید ایمیل
                </div>
                {user.emailVerified ? (
                  <p className="font-bold text-emerald-700">تأییدشده — مهلت رعایت شد</p>
                ) : isDeadlineExpired ? (
                  <p className="font-bold text-red-700">منقضی ({faDate(deadline)})</p>
                ) : (
                  <p className={`font-bold ${daysLeft <= 2 ? "text-red-600" : daysLeft <= 5 ? "text-amber-600" : "text-zinc-700"}`}>
                    {toFa(daysLeft)} روز مانده ({faDate(deadline)})
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className={sectionCard}>
            <h2 className="mb-4 text-sm font-black text-zinc-900">خط زمانی</h2>
            <div className="space-y-3 text-sm">
              <TimelineRow icon={<Calendar className="h-4 w-4 text-zinc-400" />} label="ثبت‌نام" value={faDateTime(user.createdAt)} />
              <TimelineRow icon={<LogIn className="h-4 w-4 text-zinc-400" />} label="آخرین ورود" value={faDateTime(user.lastLoginAt)} />
              <TimelineRow icon={<Calendar className="h-4 w-4 text-zinc-400" />} label="به‌روزرسانی" value={faDateTime(user.updatedAt)} />
            </div>
            {/* Sessions */}
            {user.sessions.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <p className="mb-2 text-xs font-bold text-zinc-500">نشست‌های فعال / اخیر</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-zinc-500">
                  {user.sessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 rounded bg-zinc-50 px-2 py-1">
                      <span>ایجاد: {faDateTime(s.createdAt)}</span>
                      <span>انقضا: {faDateTime(s.expiresAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Listings / offers / requests */}
        <div className="space-y-6 lg:col-span-2">
          {/* Listings */}
          <section className={sectionCard}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-900">
              <Megaphone className="h-4 w-4 text-[#F58220]" />
              آگهی‌ها ({toFa(user.listings.length)})
            </h2>
            {user.listings.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">این کاربر هنوز آگهی ثبت نکرده است.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white text-zinc-500">
                    <tr>
                      <th className="px-2 py-2 text-right font-bold">عنوان</th>
                      <th className="px-2 py-2 text-right font-bold">دسته</th>
                      <th className="px-2 py-2 text-right font-bold">قیمت</th>
                      <th className="px-2 py-2 text-center font-bold">بازدید</th>
                      <th className="px-2 py-2 text-center font-bold">وضعیت</th>
                      <th className="px-2 py-2 text-center font-bold">تاریخ</th>
                      <th className="px-2 py-2 text-center font-bold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {user.listings.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-50">
                        <td className="px-2 py-2">
                          <p className="truncate font-bold text-zinc-800">{l.title}</p>
                          <p className="text-[10px] text-zinc-400">{l.brand?.name ?? "—"}</p>
                        </td>
                        <td className="px-2 py-2 text-zinc-600">
                          {l.category ? `${l.category.icon ?? ""} ${l.category.name}` : "—"}
                        </td>
                        <td className="px-2 py-2 font-bold text-zinc-700">
                          {l.price ? formatCompactPrice(l.price) : "—"}
                        </td>
                        <td className="px-2 py-2 text-center text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {toFa(l.viewCount)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">
                            {LISTING_STATUS_LABEL[l.status] ?? l.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center text-[10px] text-zinc-400">{faDate(l.createdAt)}</td>
                        <td className="px-2 py-2 text-center">
                          <Link
                            href={`/admin/listings/${l.id}/edit`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:bg-[#F58220]/10 hover:text-[#F58220]"
                            title="ویرایش آگهی"
                          >
                            <Pencil className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Offers */}
          <section className={sectionCard}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-900">
              <Wallet className="h-4 w-4 text-blue-500" />
              پیشنهادها ({toFa(user.offers.length)})
            </h2>
            {user.offers.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">پیشنهادی ثبت نکرده است.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white text-zinc-500">
                    <tr>
                      <th className="px-2 py-2 text-right font-bold">آگهی</th>
                      <th className="px-2 py-2 text-right font-bold">مبلغ پیشنهاد</th>
                      <th className="px-2 py-2 text-center font-bold">وضعیت</th>
                      <th className="px-2 py-2 text-center font-bold">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {user.offers.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50">
                        <td className="px-2 py-2">
                          {o.listing ? (
                            <Link href={`/listings/${o.listing.slug}`} className="truncate font-bold text-zinc-800 hover:text-[#F58220]" target="_blank">
                              {o.listing.title}
                            </Link>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 font-bold text-zinc-700">
                          {o.offerAmount ? formatCompactPrice(o.offerAmount) : "—"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">
                            {OFFER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center text-[10px] text-zinc-400">{faDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Requests */}
          <section className={sectionCard}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-900">
              <ShoppingCart className="h-4 w-4 text-purple-500" />
              درخواست‌های خرید ({toFa(user.requests.length)})
            </h2>
            {user.requests.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">درخواستی ثبت نکرده است.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <ul className="divide-y divide-zinc-100">
                  {user.requests.map((r) => (
                    <li key={r.id} className="py-2">
                      <p className="text-xs font-bold text-zinc-800">{r.title}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {r.category ?? "—"} · {faDate(r.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Recent notifications */}
          <section className={sectionCard}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-zinc-900">
              <Bell className="h-4 w-4 text-zinc-500" />
              اعلان‌های اخیر ({toFa(user.notifications.length)})
            </h2>
            {user.notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400">اعلانی موجود نیست.</p>
            ) : (
              <ul className="max-h-60 space-y-1 overflow-y-auto">
                {user.notifications.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-2 rounded bg-zinc-50 px-2 py-1.5 text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-zinc-700">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-zinc-400">{faDate(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <p className="text-xl font-black text-zinc-900">{value.toLocaleString("fa-IR")}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </span>
      <span className="truncate font-bold text-zinc-800" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

function TimelineRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </span>
      <span className="text-xs font-bold text-zinc-800">{value}</span>
    </div>
  );
}
