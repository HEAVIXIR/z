import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuctionDetailClient from "./AuctionDetailClient";
import { ArrowLeft, ArrowRight, Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

interface Args {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "مزایده ماشین‌آلات — هویکس" };

/* /auctions/[id] — public auction detail page.
   Server component: fetches auction + listing + bids once and hands
   to a client component for the countdown + bid form. */
export default async function AuctionDetailPage({ params }: Args) {
  const { id } = await params;

  const [auction, headerCats] = await Promise.all([
    db.auction.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDesc: true,
            description: true,
            condition: true,
            year: true,
            workingHours: true,
            city: true,
            province: true,
            price: true,
            brand: { select: { name: true } },
            category: { select: { name: true, icon: true } },
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          },
        },
        bids: {
          orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            bidderName: true,
            amount: true,
            createdAt: true,
            isWinning: true,
          },
        },
        _count: { select: { bids: true } },
      },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, parentId: true, icon: true },
    }),
  ]);

  if (!auction || auction.status === "CANCELLED") notFound();

  const now = new Date();
  const liveStatus =
    auction.status === "ENDED"
      ? "ENDED"
      : now < auction.startDate
        ? "UPCOMING"
        : now > auction.endDate
          ? "ENDED"
          : "LIVE";

  const highestBid = auction.bids[0]?.amount ?? null;
  const currentBid = highestBid ?? auction.startPrice;
  const minimumNextBid = currentBid + auction.minIncrement;

  // Mask bidder names in history (except for the leading bid).
  const bidsMasked = auction.bids.map((b, idx) => ({
    id: b.id,
    bidderName:
      idx === 0 || liveStatus === "ENDED"
        ? b.bidderName
        : maskName(b.bidderName),
    amount: b.amount.toString(),
    createdAt: b.createdAt.toISOString(),
    isWinning: b.isWinning,
    isLeading: idx === 0 && liveStatus === "LIVE",
  }));

  const initial = {
    id: auction.id,
    title: auction.title,
    description: auction.description,
    startPrice: auction.startPrice.toString(),
    reservePrice: auction.reservePrice ? auction.reservePrice.toString() : null,
    minIncrement: auction.minIncrement.toString(),
    startDate: auction.startDate.toISOString(),
    endDate: auction.endDate.toISOString(),
    status: auction.status,
    liveStatus,
    winningBid: auction.winningBid ? auction.winningBid.toString() : null,
    winnerName: auction.winnerName,
    inspectionReport: auction.inspectionReport,
    currentBid: currentBid.toString(),
    minimumNextBid: minimumNextBid.toString(),
    bidCount: auction._count.bids,
    bids: bidsMasked,
    listing: {
      ...auction.listing,
      price: auction.listing.price ? auction.listing.price.toString() : null,
      images: auction.listing.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
      })),
    },
  };

  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={headerCats} />

      <main className="flex-1 pt-32">
        <div className="mx-auto max-w-[1280px] px-6 pb-16 lg:px-10">
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/" className="hover:text-[#F58220]">خانه</Link>
            <ArrowLeft className="h-3 w-3" />
            <Link href="/auctions" className="hover:text-[#F58220]">مزایده‌ها</Link>
            <ArrowLeft className="h-3 w-3" />
            <span className="line-clamp-1 text-white/70">{auction.title}</span>
          </nav>

          <Link
            href="/auctions"
            className="mb-5 inline-flex items-center gap-1.5 text-xs text-white/60 transition hover:text-[#F58220]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            بازگشت به فهرست مزایده‌ها
          </Link>

          <div className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#F58220]">
            <Gavel className="h-3.5 w-3.5" />
            HEAVIX AUCTION · مزایده ماشین‌آلات
          </div>

          <AuctionDetailClient initial={initial} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function maskName(name: string): string {
  if (!name) return "ناشناس";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2) + "****";
  }
  return `${parts[0]} ${parts[1][0]}.`;
}
