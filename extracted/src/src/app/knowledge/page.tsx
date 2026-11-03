import Link from "next/link";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { BookOpen, ArrowLeft, Eye } from "lucide-react";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = { GUIDE: "راهنما", COMPARISON: "مقایسه", REVIEW: "نقد و بررسی", NEWS: "اخبار", TUTORIAL: "آموزش" };
const CATEGORY_COLORS: Record<string, string> = { GUIDE: "bg-[#F58220]/15 text-[#F58220]", COMPARISON: "bg-blue-500/15 text-blue-400", REVIEW: "bg-teal-500/15 text-teal-400", NEWS: "bg-purple-500/15 text-purple-400", TUTORIAL: "bg-emerald-500/15 text-emerald-400" };

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const category = sp.category || "";
  const [articles, categories] = await Promise.all([
    db.article.findMany({ where: { status: "PUBLISHED", ...(category ? { category } : {}) }, orderBy: { publishedAt: { sort: "desc", nulls: "last" } }, select: { id: true, slug: true, title: true, excerpt: true, category: true, tags: true, coverImage: true, viewCount: true, publishedAt: true } }),
    db.article.groupBy({ by: ["category"], where: { status: "PUBLISHED" }, _count: true }),
  ]);
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-12">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F58220]/15"><BookOpen className="h-7 w-7 text-[#F58220]" /></div>
            <h1 className="text-3xl font-black text-white lg:text-4xl">هویکس دانش</h1>
            <p className="mt-2 text-sm text-white/50">راهنماها، مقایسه‌ها و آموزش‌های تخصصی ماشین‌آلات سنگین</p>
          </div>
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            <Link href="/knowledge" className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${!category ? "bg-[#F58220] text-white" : "border border-white/10 bg-white/5 text-white/50 hover:text-[#F58220]"}`}>همه ({toFa(categories.reduce((s, c) => s + c._count, 0))})</Link>
            {categories.map((c) => <Link key={c.category} href={`/knowledge?category=${c.category}`} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${category === c.category ? "bg-[#F58220] text-white" : "border border-white/10 bg-white/5 text-white/50 hover:text-[#F58220]"}`}>{CATEGORY_LABELS[c.category] || c.category} ({toFa(c._count)})</Link>)}
          </div>
          {articles.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#111] p-16 text-center"><BookOpen className="mx-auto mb-4 h-12 w-12 text-white/20" /><p className="text-sm text-white/40">مقاله‌ای یافت نشد.</p></div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <Link key={a.id} href={`/knowledge/${a.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111] transition-all duration-300 hover:-translate-y-1 hover:border-[#F58220]/40">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1f1f1f] to-[#0c0c0c]">
                    {a.coverImage ? <img src={a.coverImage} alt={a.title} className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90" /> : <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-12 w-12 text-white/10" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[a.category] || "bg-white/10 text-white/60"}`}>{CATEGORY_LABELS[a.category] || a.category}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 min-h-[48px] text-base font-bold leading-6 text-white transition-colors group-hover:text-[#F58220]">{a.title}</h3>
                    {a.excerpt && <p className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-white/40">{a.excerpt}</p>}
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/30"><Eye className="h-3 w-3" />{toFa(a.viewCount)}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F58220] opacity-0 transition-opacity group-hover:opacity-100">مطالعه<ArrowLeft className="h-3 w-3" /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
