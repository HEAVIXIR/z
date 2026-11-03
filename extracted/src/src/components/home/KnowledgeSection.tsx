"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Eye } from "lucide-react";
import { toFa } from "@/lib/format";

/* ============================================================
   KnowledgeSection — "هویکس دانش"
   
   Animated split-card carousel (jitter.video style).
   Each article is displayed in a split-screen card:
   - Left: image (wipes in)
   - Right: badge + title (typing effect) + excerpt (fade-up)
   
   Articles auto-rotate every ~6 seconds with a smooth
   transition. The typing effect reveals the title character
   by character, then the excerpt fades in below.
   ============================================================ */

export type KnowledgeCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  coverImage: string | null;
  viewCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  GUIDE: "راهنما", COMPARISON: "مقایسه", REVIEW: "نقد و بررسی",
  NEWS: "اخبار", TUTORIAL: "آموزش",
};
const CATEGORY_COLORS: Record<string, string> = {
  GUIDE: "bg-[#F58220]/15 text-[#F58220]",
  COMPARISON: "bg-blue-500/15 text-blue-400",
  REVIEW: "bg-teal-500/15 text-teal-400",
  NEWS: "bg-purple-500/15 text-purple-400",
  TUTORIAL: "bg-emerald-500/15 text-emerald-400",
};

type CmsConfig = { title?: string; subtitle?: string; description?: string };

export default function KnowledgeSection({
  articles,
  cmsConfig,
}: {
  articles: KnowledgeCard[];
  cmsConfig?: CmsConfig;
}) {
  if (articles.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(245,130,32,0.06),transparent_70%)]" />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#F58220]">
            {cmsConfig?.subtitle || "HEAVIX KNOWLEDGE"}
          </span>
          <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            {cmsConfig?.title || "هویکس دانش"}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
            {cmsConfig?.description || "راهنماها، مقایسه‌ها و آموزش‌های تخصصی ماشین‌آلات سنگین"}
          </p>
        </div>

        {/* Animated split-card carousel */}
        <AnimatedKnowledgeCarousel articles={articles} />

        {/* Footer */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/knowledge"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition hover:border-[#F58220]/30 hover:bg-white/10"
          >
            مشاهده همه مقالات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ===================== Animated Carousel ===================== */
function AnimatedKnowledgeCarousel({ articles }: { articles: KnowledgeCard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = articles[currentIndex];

  const goToNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
      setIsTransitioning(false);
    }, 400);
  };

  const goToIndex = (index: number) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 400);
  };

  // Auto-advance every 6 seconds (enough time for typing + reading)
  useEffect(() => {
    if (articles.length <= 1) return;
    timerRef.current = setTimeout(goToNext, 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIndex, articles.length]);

  if (!current) return null;

  return (
    <div>
      {/* Split card */}
      <div
        className={`relative mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-white/10 bg-[#111] shadow-[0_20px_60px_rgba(0,0,0,.4)] transition-all duration-400 ${
          isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
        }`}
      >
        <div className="grid md:grid-cols-2">
          {/* Left: Image */}
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[380px]">
            {current.coverImage ? (
              <img
                src={current.coverImage}
                alt={current.title}
                className="h-full w-full object-cover"
                style={{
                  animation: isTransitioning ? "none" : "imgWipeIn 700ms cubic-bezier(0.25,0.46,0.45,0.94) both",
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                <BookOpen className="h-12 w-12 text-white/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-black/20" />
          </div>

          {/* Right: Content */}
          <div className="flex flex-col justify-center p-8 lg:p-10">
            {/* Badge */}
            <span
              className={`mb-4 inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-bold ${
                CATEGORY_COLORS[current.category] || "bg-white/10 text-white/60"
              }`}
              style={{
                animation: isTransitioning ? "none" : "badgeSlideIn 400ms 300ms both",
              }}
            >
              {CATEGORY_LABELS[current.category] || current.category}
            </span>

            {/* Title with typing effect */}
            <h3 className="text-xl font-bold leading-7 text-white lg:text-2xl lg:leading-8">
              <TypingText text={current.title} play={!isTransitioning} />
            </h3>

            {/* Excerpt — fades in after title is typed */}
            {current.excerpt && (
              <p
                className="mt-4 line-clamp-3 text-sm leading-6 text-white/50"
                style={{
                  animation: isTransitioning ? "none" : "excerptFadeUp 500ms both",
                  animationDelay: `${300 + current.title.length * 45 + 200}ms`,
                }}
              >
                {current.excerpt}
              </p>
            )}

            {/* Meta row */}
            <div
              className="mt-5 flex items-center gap-4"
              style={{
                animation: isTransitioning ? "none" : "excerptFadeUp 500ms both",
                animationDelay: `${300 + current.title.length * 45 + 400}ms`,
              }}
            >
              <Link
                href={`/knowledge/${current.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff8c38]"
              >
                مطالعه مقاله <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1 text-xs text-white/40">
                <Eye className="h-3.5 w-3.5" /> {toFa(current.viewCount)} بازدید
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {articles.length > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {articles.map((_, i) => (
            <button
              key={i}
              onClick={() => goToIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-8 bg-[#F58220]" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`مقاله ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* CSS keyframes */}
      <style jsx>{`
        @keyframes imgWipeIn {
          from {
            clip-path: inset(0 100% 0 0);
            transform: scale(1.05);
          }
          to {
            clip-path: inset(0 0 0 0);
            transform: scale(1);
          }
        }
        @keyframes badgeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes excerptFadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ===================== Typing Text Component ===================== */
function TypingText({ text, play }: { text: string; play: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!play) {
      setDisplayed("");
      setDone(false);
      return;
    }

    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
      }
    }, 45); // 45ms per character — matches the video

    return () => clearInterval(interval);
  }, [text, play]);

  return (
    <span>
      {displayed}
      {!done && play && (
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: "1em",
            background: "#F58220",
            marginLeft: "2px",
            verticalAlign: "text-bottom",
            animation: "cursorBlink 0.8s infinite",
          }}
        />
      )}
    </span>
  );
}
