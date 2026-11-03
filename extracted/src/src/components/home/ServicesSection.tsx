"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import SectionTitle from "@/components/ui/SectionTitle";

/* ============================================================
   ServicesSection — FIX-ANIMATIONS-BRANDS (FIX 3)

   Client component. Fetches the active HEAVIX services from
   /api/services (public) and renders them as a compact
   horizontal row ticker (continuous marquee). Each service is
   a small card (icon + name + optional short desc). The whole
   row pauses on hover. Dark theme (bg #0b0b0b, orange #F58220).

   If the API call fails or returns no services, we fall back to
   a 4-card placeholder so the section is never empty.
   ============================================================ */

type Service = {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  featured: boolean;
};

const FALLBACK: Service[] = [
  {
    id: "fb-1",
    key: "inspection",
    nameFa: "کارشناسی و بازرسی",
    nameEn: "Inspection",
    description: "کارشناسی فنی و بررسی سلامت دستگاه قبل از معامله",
    icon: "🔍",
    imageUrl: null,
    sortOrder: 1,
    featured: true,
  },
  {
    id: "fb-2",
    key: "transport",
    nameFa: "حمل و نقل",
    nameEn: "Transport",
    description: "انتقال امن ماشین‌آلات سنگین به سراسر کشور",
    icon: "🚚",
    imageUrl: null,
    sortOrder: 2,
    featured: false,
  },
  {
    id: "fb-3",
    key: "financing",
    nameFa: "تسهیلات مالی",
    nameEn: "Financing",
    description: "مشاوره و تسهیلات برای خرید ماشین‌آلات",
    icon: "🏦",
    imageUrl: null,
    sortOrder: 3,
    featured: false,
  },
  {
    id: "fb-4",
    key: "repair",
    nameFa: "تعمیر و نگهداری",
    nameEn: "Repair",
    description: "سرویس دوره‌ای و تعمیرات تخصصی ماشین‌آلات",
    icon: "🛠️",
    imageUrl: null,
    sortOrder: 4,
    featured: false,
  },
];

export default function ServicesSection({
  cmsConfig,
}: {
  cmsConfig?: { title?: string; subtitle?: string; description?: string };
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/services?limit=50", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && Array.isArray(json?.services) && json.services.length > 0) {
          setServices(json.services);
        } else if (!cancelled) {
          setServices(FALLBACK);
        }
      } catch {
        if (!cancelled) setServices(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = services.length > 0 ? services : FALLBACK;

  // Duplicate the list so the marquee scrolls seamlessly. Need at
  // least ~6 items in the loop for a smooth visual.
  const loop =
    items.length >= 6 ? [...items, ...items] : [...items, ...items, ...items];

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#0b0b0b] py-20 lg:py-24"
      aria-label="خدمات هویکس"
    >
      {/* Subtle orange glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-[100%] bg-[#F58220]/5 blur-3xl" />

      <div className="relative mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionTitle
          align="center"
          subtitle={cmsConfig?.subtitle || "HEAVIX SERVICES"}
          title={cmsConfig?.title || "خدمات هویکس"}
          description={
            cmsConfig?.description ||
            "خدمات تخصصی ماشین‌آلات سنگین — از کارشناسی و بازرسی تا حمل‌ونقل، تعمیرات و تأمین مالی"
          }
        />
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#F58220]" />
        </div>
      ) : (
        <Ticker items={loop} />
      )}

      {/* CTA */}
      <div className="relative mt-10 flex justify-center">
        <Link
          href="/listings?transaction=SERVICE_REQUEST"
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition-all duration-300 hover:border-[#F58220]/40 hover:bg-[#F58220]/10 hover:text-[#F58220]"
        >
          درخواست خدمت
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */

function Ticker({ items }: { items: Service[] }) {
  // dir="ltr" so the marquee scrolls visually left; cards are RTL.
  // The whole track pauses on hover via .marquee-scroll:hover.
  return (
    <div
      dir="ltr"
      className="group relative mt-10 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)",
      }}
    >
      <div className="marquee-scroll flex w-max items-stretch gap-4 px-4 py-2 transition-[animation-play-state] duration-300 group-hover:[animation-play-state:paused]">
        {items.map((s, i) => (
          <ServiceChip key={`${s.id}-${i}`} service={s} />
        ))}
      </div>
    </div>
  );
}

function ServiceChip({ service }: { service: Service }) {
  return (
    <Link
      href={`/listings?transaction=SERVICE_REQUEST&q=${encodeURIComponent(service.nameFa)}`}
      className="group/chip relative flex h-32 w-60 shrink-0 items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#141414] to-[#0c0c0c] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/50 hover:shadow-[0_15px_35px_-10px_rgba(245,130,32,0.35)]"
      dir="rtl"
    >
      {/* Top accent bar */}
      <span className="absolute inset-x-0 top-0 h-0.5 origin-right scale-x-0 bg-[#F58220] transition-transform duration-300 group-hover/chip:scale-x-100" />

      {/* Featured badge */}
      {service.featured && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[#F58220]/15 px-2 py-0.5 text-[9px] font-black text-[#F58220]">
          ویژه
        </span>
      )}

      {/* Icon */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] text-3xl transition-transform duration-300 group-hover/chip:scale-110">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.nameFa}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{service.icon ?? "⚙️"}</span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-sm font-black leading-6 text-white transition-colors group-hover/chip:text-[#F58220]">
          {service.nameFa}
        </h3>
        {service.nameEn && (
          <p className="mt-0.5 truncate text-[10px] text-white/30" dir="ltr">
            {service.nameEn}
          </p>
        )}
        {service.description && (
          <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/45">
            {service.description}
          </p>
        )}
      </div>
    </Link>
  );
}
