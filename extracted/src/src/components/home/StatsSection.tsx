import { toFa } from "@/lib/format";

/* ============================================================
   StatsSection — gradient panel, live counts from DB.
   FIX-STATS: values are now admin-configured via SiteStat rows
   and arrive pre-formatted (Persian digits). The `value` field
   may already contain a formatted string (preferred) or a raw
   number (legacy fallback).

   FIX-ADMIN-EDITABILITY — accepts an optional `cmsConfig`
   (title/subtitle/description) and renders a section header
   above the stats panel when any of them are set. Managed from
   /admin/homepage-layout.
   ============================================================ */

export type StatItem = { value: string | number; label: string; suffix?: string };

type CmsConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
};

export default function StatsSection({
  items,
  cmsConfig,
}: {
  items: StatItem[];
  cmsConfig?: CmsConfig;
}) {
  if (items.length === 0) return null;

  const showHeader =
    !!cmsConfig &&
    !!(cmsConfig.title || cmsConfig.subtitle || cmsConfig.description);

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        {showHeader && (
          <div className="mb-10 flex max-w-3xl flex-col items-center text-center mx-auto">
            {cmsConfig!.subtitle && (
              <div className="text-xs font-black tracking-[0.3em] text-[#F58220]">
                {cmsConfig!.subtitle}
              </div>
            )}
            {cmsConfig!.title && (
              <h2 className="mt-3 text-3xl font-black text-white lg:text-4xl">
                {cmsConfig!.title}
              </h2>
            )}
            {cmsConfig!.description && (
              <p className="mt-3 text-sm leading-7 text-white/55 lg:text-base">
                {cmsConfig!.description}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-10 rounded-3xl border border-white/10 bg-gradient-to-l from-[#F58220]/10 via-[#141414] to-[#141414] p-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((s) => {
            const display =
              typeof s.value === "number"
                ? `${toFa(s.value.toLocaleString("en-US"))}${s.suffix ?? ""}`
                : s.value;
            return (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-black text-[#F58220] lg:text-5xl">
                  {display}
                </div>
                <div className="mt-3 text-sm text-white/60">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

