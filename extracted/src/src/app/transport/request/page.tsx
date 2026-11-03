import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { VEHICLE_TYPE_LABELS } from "@/lib/inspection-checklists";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TransportRequestForm from "./TransportRequestForm";
import { Truck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const VEHICLE_OPTIONS = Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default async function TransportRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; dealRoomId?: string }>;
}) {
  const sp = await searchParams;
  const listingId = sp.listingId ?? null;
  const dealRoomId = sp.dealRoomId ?? null;

  // Auth optional but recommended — anonymous users may submit, but if logged in
  // we attach the user id automatically and prefill contact details.
  const [user, headerCats, listing] = await Promise.all([
    getCurrentUser(),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
    listingId
      ? db.listing.findUnique({
          where: { id: listingId },
          select: {
            id: true,
            slug: true,
            title: true,
            province: true,
            city: true,
            sellerPhone: true,
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        })
      : null,
  ]);

  // If a listingId was provided but no listing exists, redirect to the form.
  if (listingId && !listing) {
    redirect("/transport/request");
  }

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-3xl px-4 pb-16 lg:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">
              خانه
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="text-white/70">درخواست حمل ماشین‌آلات</span>
          </nav>

          <div className="mb-6">
            <h1 className="flex items-center gap-3 text-2xl font-black text-white lg:text-3xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F58220]/15 text-[#F58220]">
                <Truck className="h-5 w-5" />
              </span>
              درخواست حمل ماشین‌آلات
            </h1>
            <p className="mt-2 text-sm leading-7 text-white/55">
              با تکمیل فرم زیر، درخواست حمل دستگاه خود را ثبت کنید. کارشناسان
              حمل هویکس پس از بررسی، بهترین قیمت و مناسب‌ترین وسیله نقلیه را به
              شما پیشنهاد می‌دهند.
            </p>
          </div>

          {/* Linked listing card */}
          {listing && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {listing.images[0]?.url ? (
                  <img src={listing.images[0].url} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🚜</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/listings/${listing.slug}`}
                  className="block truncate text-sm font-bold text-white transition hover:text-[#F58220]"
                >
                  {listing.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-white/45">
                  {listing.province ?? "—"}، {listing.city ?? "—"}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                مرتبط با آگهی
              </span>
            </div>
          )}

          {!user && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              <span>برای پیگیری درخواست خود، پیشنهاد می‌شود ابتدا وارد شوید.</span>
              <Link href="/login" className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white">
                ورود
              </Link>
            </div>
          )}

          <TransportRequestForm
            listingId={listingId}
            dealRoomId={dealRoomId}
            vehicleOptions={VEHICLE_OPTIONS}
            isAuthed={!!user}
          />

          {/* How it works */}
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-bold text-white">فرآیند حمل هویکس</h2>
            <ol className="space-y-3 text-xs text-white/55">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-[11px] font-bold text-[#F58220]">
                  {toFa(1)}
                </span>
                <p>فرم درخواست را با ذکر مبدا، مقصد و مشخصات بار تکمیل می‌کنید.</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-[11px] font-bold text-[#F58220]">
                  {toFa(2)}
                </span>
                <p>کارشناسان هویکس درخواست را بررسی کرده و قیمت و باربر پیشنهاد می‌کنند.</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-[11px] font-bold text-[#F58220]">
                  {toFa(3)}
                </span>
                <p>پس از تأیید، باربر در تاریخ مقرر برای بارگیری به مبدا اعزام می‌شود.</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F58220]/15 text-[11px] font-bold text-[#F58220]">
                  {toFa(4)}
                </span>
                <p>تا تحویل بار در مقصد، وضعیت حمل را با کد رهگیری پیگیری می‌کنید.</p>
              </li>
            </ol>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
