import { ReactNode } from "react";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  description?: string;
  align?: "right" | "center";
  action?: ReactNode;
}

export default function SectionTitle({
  title,
  subtitle,
  description,
  align = "right",
  action,
}: SectionTitleProps) {
  const isCenter = align === "center";

  return (
    <div
      className={`mb-12 flex flex-col gap-4 ${
        isCenter
          ? "items-center text-center"
          : action
            ? "md:flex-row md:items-end md:justify-between"
            : ""
      }`}
    >
      <div
        className={`flex flex-col ${
          isCenter ? "items-center text-center" : "items-end text-right"
        }`}
      >
        {subtitle && (
          <span className="text-sm font-semibold uppercase tracking-[3px] text-[#F58220]">
            {subtitle}
          </span>
        )}

        <h2 className="mt-2 text-4xl font-black text-white lg:text-5xl">{title}</h2>

        {description && (
          <p
            className={`mt-4 max-w-2xl text-base leading-8 text-white/65 ${
              isCenter ? "mx-auto" : ""
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
