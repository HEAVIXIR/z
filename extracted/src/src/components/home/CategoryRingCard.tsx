"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { RingCategory } from "./CategoryRing";

function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0 || v.startsWith("blob:")) return false;
  return v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://");
}

function isEmojiOrText(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.length > 0 && !isImageUrl(v);
}

export default function CategoryRingCard({ category }: { category: RingCategory }) {
  const iconIsImage = isImageUrl(category.icon);
  const iconIsEmoji = !iconIsImage && isEmojiOrText(category.icon);
  const hasImage = isImageUrl(category.imageUrl);
  const count = category.listingCount ?? 0;

  return (
    <Link
      href={`/listings?category=${category.slug}`}
      aria-label={`مشاهده ماشین‌آلات دستهٔ ${category.name}`}
      className="group/card block h-full w-full focus:outline-none"
      tabIndex={-1}
    >
      <article className="relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#141414] transition-[border-color,box-shadow] duration-300 group-hover/card:border-[#F58220]/70 group-hover/card:shadow-[0_20px_50px_-12px_rgba(245,130,32,0.35)]">
        <span className="absolute inset-x-0 top-0 z-20 h-0.5 bg-gradient-to-r from-transparent via-[#F58220] to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

        {category.featured && (
          <span className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-md bg-[#F58220] px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
            <Star className="h-3 w-3 fill-current" />
            ویژه
          </span>
        )}

        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1c1c1c]">
          {hasImage ? (
             
            <img
              src={category.imageUrl!}
              alt={category.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110"
            />
          ) : iconIsImage ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1f1f1f] to-[#101215]">
              { }
              <img
                src={category.icon!}
                alt={category.name}
                className="h-24 w-24 object-contain opacity-90"
              />
            </div>
          ) : iconIsEmoji ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1f1f1f] to-[#101215]">
              <span className="select-none text-6xl leading-none">{category.icon}</span>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F58220]/15 to-[#101215]">
              <span className="text-6xl">🚜</span>
            </div>
          )}

          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/55 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="truncate text-center text-base font-bold leading-tight text-white">
              {category.name}
            </h3>
            <p className="mt-1 text-center text-xs font-bold text-[#F58220]">
              {count > 0 ? `${count.toLocaleString("fa-IR")} آگهی` : "بدون آگهی"}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
