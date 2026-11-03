import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { BookOpen, ArrowRight, Eye, Tag, Calendar } from "lucide-react";
import { toFa, faDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = { GUIDE: "راهنما", COMPARISON: "مقایسه", REVIEW: "نقد و بررسی", NEWS: "اخبار", TUTORIAL: "آموزش" };

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, related] = await Promise.all([
    db.article.findUnique({ where: { slug } }),
    db.article.findMany({ where: { status: "PUBLISHED", slug: { not: slug } }, orderBy: { publishedAt: { sort: "desc", nulls: "last" } }, take: 3, select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, category: true } }),
  ]);
  if (!article || article.status !== "PUBLISHED") notFound();
  db.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  const tags = article.tags ? article.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    const flushList = () => { if (listItems.length > 0) { elements.push(<ul key={`ul-${elements.length}`} className="my-3 space-y-1.5 pr-5">{listItems.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm leading-7 text-white/70"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F58220]" /><span>{item.replace(/^-\s*/, "")}</span></li>)}</ul>); listItems = []; } };
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) { flushList(); elements.push(<h2 key={idx} className="mt-6 mb-3 text-lg font-bold text-white">{trimmed.slice(3)}</h2>); }
      else if (trimmed.startsWith("# ")) { flushList(); elements.push(<h1 key={idx} className="mb-4 text-2xl font-black text-white">{trimmed.slice(2)}</h1>); }
      else if (trimmed.startsWith("- ")) { listItems.push(trimmed); }
      else if (trimmed === "") { flushList(); }
      else { flushList(); elements.push(<p key={idx} className="my-3 text-sm leading-7 text-white/70">{trimmed}</p>); }
    });
    flushList();
    return elements;
  };
  return (
    <div className="site-theme flex min-h-screen flex-col bg-[#0b0b0b]">
      <Header categories={[]} />
      <main className="flex-1 pt-28">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <nav className="mb-6 flex items-center gap-2 text-xs text-white/40">
            <Link href="/knowledge" className="inline-flex items-center gap-1 transition hover:text-[#F58220]"><ArrowRight className="h-3 w-3" />هویکس دانش</Link>
          </nav>
          <div className="mb-8">
            <span className="inline-block rounded-full bg-[#F58220]/15 px-3 py-1 text-xs font-bold text-[#F58220]">{CATEGORY_LABELS[article.category] || article.category}</span>
            <h1 className="mt-4 text-3xl font-black leading-tight text-white lg:text-4xl">{article.title}</h1>
            {article.excerpt && <p className="mt-4 text-base leading-8 text-white/50">{article.excerpt}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/40">
              {article.publishedAt && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{faDate(article.publishedAt)}</span>}
              <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{toFa(article.viewCount)} بازدید</span>
            </div>
          </div>
          {article.coverImage && <div className="mb-8 overflow-hidden rounded-3xl border border-white/10"><img src={article.coverImage} alt={article.title} className="aspect-[16/9] w-full object-cover" /></div>}
          <article className="rounded-3xl border border-white/10 bg-[#111] p-6 lg:p-8">{renderContent(article.content)}</article>
          {tags.length > 0 && <div className="mt-6 flex flex-wrap items-center gap-2"><Tag className="h-4 w-4 text-white/30" />{tags.map((tag) => <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/50">{tag}</span>)}</div>}
          {related.length > 0 && <div className="mt-12"><h2 className="mb-4 text-lg font-black text-white">مقالات مرتبط</h2><div className="grid gap-4 sm:grid-cols-3">{related.map((r) => <Link key={r.id} href={`/knowledge/${r.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:border-[#F58220]/40"><h3 className="line-clamp-2 text-sm font-bold leading-6 text-white transition-colors group-hover:text-[#F58220]">{r.title}</h3>{r.excerpt && <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/40">{r.excerpt}</p>}</Link>)}</div></div>}
        </div>
      </main>
      <Footer settings={null} />
    </div>
  );
}
