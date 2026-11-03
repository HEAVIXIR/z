import Image from "next/image";

/* ============================================================
   AdaptiveLogo — displays a brand logo that adapts to the
   background: white on dark backgrounds, black on light
   backgrounds. The orange accent is preserved in both variants.

   Uses pre-processed PNGs in /public/logos/:
     - <name>-white.png  (white tint, orange preserved) → for dark bg
     - <name>-black.png  (black tint, orange preserved) → for light bg

   The component accepts a `theme` prop ("dark" | "light"). If not
   specified, it defaults to "dark" (the HEAVIX site theme).
   ============================================================ */

type AdaptiveLogoProps = {
  brand: "heavix" | "mekanix";
  theme?: "dark" | "light";
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export default function AdaptiveLogo({
  brand,
  theme = "dark",
  width = 140,
  height = 48,
  className = "",
  priority = false,
}: AdaptiveLogoProps) {
  const variant = theme === "dark" ? "white" : "black";
  const src = `/logos/${brand}-logo-${variant}.png`;

  return (
    <Image
      src={src}
      alt={brand === "heavix" ? "هویکس" : "مکانیکس"}
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}
