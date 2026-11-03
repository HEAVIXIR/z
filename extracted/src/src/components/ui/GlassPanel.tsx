import { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
};

/** Frosted dark glass card — the visual DNA of the HEAVIX site. */
export default function GlassPanel({
  children,
  className = "",
}: GlassPanelProps) {
  return (
    <div
      className={
        "rounded-[30px] border border-white/10 bg-black/45 backdrop-blur-2xl shadow-[0_35px_90px_rgba(0,0,0,.45)] " +
        className
      }
    >
      {children}
    </div>
  );
}
