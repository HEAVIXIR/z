/** Reusable Tailwind class strings — ported from Aria MJ design system. */
export const DESIGN = {
  container: "mx-auto max-w-7xl px-6",
  section: "py-24",
  card: "rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl",
  cardHover:
    "transition-all duration-300 hover:-translate-y-2 hover:border-[#F58220]/40 hover:shadow-[0_0_35px_rgba(245,130,32,.18)]",
  grid: "grid gap-8 xl:gap-10",
  title: "text-5xl font-black text-white",
  subtitle: "text-[#F58220] uppercase tracking-[4px] text-sm",
  text: "text-gray-300 leading-8",
} as const;

export const BRAND = {
  name: "HEAVIX",
  fullName: "هویکس",
  motherBrand: "آریا ماشین جم",
  motherBrandEn: "ARIA MACHINE JAM",
  sisterBrand: "MEKANIX",
  slogan: "Industrial Marketplace",
  primary: "#F58220",
  dark: "#0b0b0b",
  gray: "#3A3A3A",
  font: "Vazirmatn",
} as const;
