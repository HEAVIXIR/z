"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, ShieldCheck, X, Sparkles } from "lucide-react";
import { formatCompactPrice, PRICE_TYPE_LABELS, toFa } from "@/lib/format";
import type { FeaturedListing } from "./FeaturedMachineCard";
import styles from "./VerifiedMachinesGallery.module.css";

/* ============================================================
   VerifiedMachinesGallery — "ماشین‌آلات تأییدشدهٔ هویکس"
   Adapted from AnimatedWebGallery pattern.
   Featured image + thumbnail grid + modal preview.
   ============================================================ */

type CmsConfig = { title?: string; subtitle?: string; description?: string };

export default function VerifiedMachinesGallery({
  listings,
  cmsConfig,
}: {
  listings: FeaturedListing[];
  cmsConfig?: CmsConfig;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<FeaturedListing | null>(null);

  const items = listings;
  const activeItem = items[activeIndex];

  const goNext = () => setActiveIndex((c) => (c + 1) % items.length);
  const goPrevious = () => setActiveIndex((c) => (c - 1 + items.length) % items.length);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length]);

  if (!items.length) return null;

  const priceLabel = (l: FeaturedListing) =>
    l.price != null ? formatCompactPrice(l.price) : PRICE_TYPE_LABELS[l.priceType] ?? "تماس بگیرید";

  return (
    <>
      <section className={styles.gallery} aria-label="ماشین‌آلات تأییدشدهٔ هویکس">
        <div className={styles.glow} />

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{cmsConfig?.subtitle || "HEAVIX VERIFIED"}</p>
            <h2>{cmsConfig?.title || "ماشین‌آلات تأییدشدهٔ هویکس"}</h2>
          </div>
          <p className={styles.subtitle}>
            {cmsConfig?.description ||
              "دستگاه‌های منتخب و کارشناسی‌شده — تأیید فنی، حقوقی و بدنه توسط تیم هویکس."}
          </p>
        </header>

        <div className={styles.featured}>
          <div
            className={styles.featuredImage}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(245,130,32,0.35), transparent 55%), url(${
                activeItem.image || "/images/sections/featured.png"
              })`,
            }}
          >
            <div className={styles.imageOverlay} />

            <div className={styles.featuredContent}>
              <p>{activeItem.brandName ?? "بدون برند"}</p>
              <h3>{activeItem.title}</h3>
              <div className={styles.featuredMeta}>
                <span className={styles.priceTag}>{priceLabel(activeItem)}</span>
                {activeItem.city && (
                  <span className={styles.metaChip}>
                    {activeItem.city}
                  </span>
                )}
                {activeItem.year && (
                  <span className={styles.metaChip}>
                    {toFa(activeItem.year)}
                  </span>
                )}
                {activeItem.workingHours != null && (
                  <span className={styles.metaChip}>
                    {toFa(activeItem.workingHours)} ساعت
                  </span>
                )}
              </div>
              <Link
                href={`/listings/${activeItem.slug}`}
                className={styles.viewButton}
              >
                مشاهده جزئیات <ArrowLeft size={16} />
              </Link>
            </div>

            {activeItem.verified && (
              <div className={styles.verifiedBadge}>
                <ShieldCheck size={14} />
                تأییدشده
              </div>
            )}

            <div className={styles.counter}>
              <span>{toFa(activeIndex + 1).padStart(2, "۰")}</span>
              <i />
              <span>{toFa(items.length).padStart(2, "۰")}</span>
            </div>
          </div>

          <div className={styles.controls}>
            <button type="button" onClick={goPrevious} aria-label="قبلی">
              <ArrowRight size={20} />
            </button>
            <button type="button" onClick={goNext} aria-label="بعدی">
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>

        <div className={styles.thumbnailGrid}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.thumbnail} ${
                index === activeIndex ? styles.activeThumbnail : ""
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={item.title}
            >
              <img
                src={item.image || "/images/sections/featured.png"}
                alt={item.title}
              />
              <span>{item.title}</span>
              {item.verified && (
                <span className={styles.thumbVerified}>
                  <ShieldCheck size={10} />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          <Link
            href="/listings?verified=true"
            className={styles.viewAllButton}
          >
            مشاهده همه ماشین‌آلات تأییدشده
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      {selectedItem && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setSelectedItem(null)}
        >
          <article
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={selectedItem.title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setSelectedItem(null)}
              aria-label="بستن"
            >
              <X size={22} />
            </button>

            <img
              src={selectedItem.image || "/images/sections/featured.png"}
              alt={selectedItem.title}
            />

            <div className={styles.modalContent}>
              <p>{selectedItem.brandName ?? "بدون برند"}</p>
              <h3>{selectedItem.title}</h3>
              {selectedItem.shortDesc && (
                <span>{selectedItem.shortDesc}</span>
              )}
              <div className={styles.modalMeta}>
                <span className={styles.priceTag}>{priceLabel(selectedItem)}</span>
                {selectedItem.city && (
                  <span className={styles.metaChip}>{selectedItem.city}</span>
                )}
                {selectedItem.year && (
                  <span className={styles.metaChip}>{toFa(selectedItem.year)}</span>
                )}
                {selectedItem.workingHours != null && (
                  <span className={styles.metaChip}>
                    {toFa(selectedItem.workingHours)} ساعت
                  </span>
                )}
                {selectedItem.viewCount != null && (
                  <span className={styles.metaChip}>
                    <Eye size={12} /> {toFa(selectedItem.viewCount)}
                  </span>
                )}
              </div>
              <Link
                href={`/listings/${selectedItem.slug}`}
                className={styles.viewButton}
              >
                مشاهده جزئیات کامل <ArrowLeft size={16} />
              </Link>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
