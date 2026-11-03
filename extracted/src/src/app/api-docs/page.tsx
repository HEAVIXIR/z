"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronLeft,
  Terminal,
  BookOpen,
  ExternalLink,
  Filter,
} from "lucide-react";

/* ============================================================
   /api-docs — Public API documentation page (dark, RTL).
   ------------------------------------------------------------
   • Lists all public endpoints grouped by category
     (Catalog, Marketplace, Pricing, Compare, Search, Auth, Locations).
   • Per-endpoint: method, path, description, params, response shape.
   • Search/filter bar (text + tag filter chips).
   • curl example per endpoint (copy-to-clipboard).
   • Spec is fetched from /api/openapi (single source of truth).
   ============================================================ */

type Param = {
  name: string;
  in: "query" | "path" | "header";
  required?: boolean;
  description: string;
  schema: { type: string; example?: string | number };
};

type EndpointDoc = {
  method: string;
  path: string;
  summary: string;
  description: string;
  params?: Param[];
  requestBody?: {
    description: string;
    required?: boolean;
    content: Record<string, { schema: Record<string, unknown> }>;
  };
  responses: Record<
    string,
    {
      description: string;
      content?: Record<string, { schema: Record<string, unknown>; example?: unknown }>;
    }
  >;
  tags?: string[];
};

type Spec = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: { name: string; email: string; url: string };
  };
  tags: { name: string; description: string }[];
  paths: Record<string, Record<string, EndpointDoc>>;
};

const METHOD_CLS: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  post: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  put: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  patch: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  delete: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TAG_CLS: Record<string, string> = {
  Catalog: "bg-[#F58220]/15 text-[#F58220] border-[#F58220]/30",
  Marketplace: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Pricing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Compare: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Search: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Auth: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Locations: "bg-teal-500/15 text-teal-400 border-teal-500/30",
};

function exampleToText(ex: unknown): string {
  if (ex === undefined || ex === null) return "";
  try {
    return JSON.stringify(ex, null, 2);
  } catch {
    return String(ex);
  }
}

function buildCurl(ep: EndpointDoc): string {
  const base = ""; // same-origin relative
  let url = `${base}${ep.path}`;
  const queryParams = (ep.params ?? []).filter((p) => p.in === "query");
  if (queryParams.length > 0) {
    const qs = queryParams
      .map((p) => {
        const val = p.schema.example ?? `<${p.name}>`;
        return `${encodeURIComponent(p.name)}=${encodeURIComponent(String(val))}`;
      })
      .join("&");
    url += `?${qs}`;
  }

  const method = ep.method.toUpperCase();
  const hasBody = ep.method === "post" || ep.method === "put" || ep.method === "patch";
  let bodyExample = "";
  if (hasBody && ep.requestBody?.content?.["application/json"]?.schema) {
    const schema = ep.requestBody.content["application/json"].schema as {
      properties?: Record<string, unknown>;
    };
    const sample: Record<string, unknown> = {};
    if (schema?.properties) {
      for (const [k, v] of Object.entries(schema.properties)) {
        const sv = v as { type?: string; example?: unknown };
        if (sv.example !== undefined) sample[k] = sv.example;
        else if (sv.type === "string") sample[k] = `<${k}>`;
        else if (sv.type === "integer") sample[k] = 0;
        else if (sv.type === "boolean") sample[k] = false;
      }
    }
    bodyExample = JSON.stringify(sample, null, 2);
  }

  const lines = [`curl -X ${method} '${url}'`];
  lines.push(`  -H 'Accept: application/json'`);
  if (hasBody) {
    lines.push(`  -H 'Content-Type: application/json'`);
    lines.push(`  -d '${bodyExample.replace(/'/g, "'\\''")}'`);
  }
  return lines.join(" \\\n");
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/openapi");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Spec;
        if (!alive) return;
        setSpec(json);
        // Open the first endpoint by default so the page isn't empty.
        const firstPath = Object.keys(json.paths)[0] ?? null;
        if (firstPath) {
          const firstMethod = Object.keys(json.paths[firstPath])[0] ?? null;
          if (firstMethod) setOpenPath(`${firstPath}::${firstMethod}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "خطای ناشناخته";
        setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allEndpoints = useMemo(() => {
    if (!spec) return [] as { ep: EndpointDoc; tag: string }[];
    const out: { ep: EndpointDoc; tag: string }[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, ep] of Object.entries(methods)) {
        out.push({ ep: { ...ep, method, path }, tag: ep.tags?.[0] ?? "Catalog" });
      }
    }
    return out.sort((a, b) => a.tag.localeCompare(b.tag) || a.ep.path.localeCompare(b.ep.path));
  }, [spec]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEndpoints.filter(({ ep, tag }) => {
      if (activeTag && tag !== activeTag) return false;
      if (!q) return true;
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        (ep.params ?? []).some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [allEndpoints, query, activeTag]);

  const grouped = useMemo(() => {
    const g: Record<string, { ep: EndpointDoc; tag: string }[]> = {};
    for (const item of filtered) {
      (g[item.tag] ??= []).push(item);
    }
    return g;
  }, [filtered]);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="site-theme min-h-screen bg-[#0b0b0b] text-white" dir="rtl">
      {/* Sticky top search */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b0b0b]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-4 lg:px-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F58220]/15">
            <BookOpen className="h-5 w-5 text-[#F58220]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-white">مستندات API توسعه‌دهندگان</h1>
            <p className="truncate text-[11px] text-white/45">
              {spec ? `${spec.info.title} · نسخه ${spec.info.version}` : "در حال بارگذاری..."}
            </p>
          </div>
          <a
            href="/api/openapi"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/60 transition hover:border-[#F58220]/40 hover:text-[#F58220] md:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            JSON Spec
          </a>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی endpoint..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pr-9 pl-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#F58220]/60"
            />
          </div>
        </div>

        {/* Tag chips */}
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto px-6 pb-3 lg:px-10">
          <Filter className="h-3.5 w-3.5 shrink-0 text-white/40" />
          <button
            onClick={() => setActiveTag(null)}
            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              activeTag === null
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            همه
          </button>
          {(spec?.tags ?? []).map((t) => (
            <button
              key={t.name}
              onClick={() => setActiveTag((cur) => (cur === t.name ? null : t.name))}
              title={t.description}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                activeTag === t.name
                  ? TAG_CLS[t.name] ?? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
        {/* Intro */}
        <div className="mb-8 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-[#161616] to-[#0c0c0c] p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-white lg:text-3xl">
                API مارکت‌پلیس هویکس
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
                تمام endpointهای عمومی هویکس به‌صورت JSON با مسیرهای نسبی روی همان دامنه قابل دسترسی‌اند.
                برای فراخوانی احراز هویت‌شده، کوکی نشست را ارسال کنید (همان-Origin، SameSite=Lax).
                توضیحات فارسی + مثال curl برای هر endpoint در ادامه آمده است.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Terminal className="h-5 w-5 text-[#F58220]" />
              <div className="text-[11px] leading-5 text-white/55">
                <p className="font-bold text-white">Base URL</p>
                <p dir="ltr" className="font-mono text-white/70">https://heavix.ir/api</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-white/55">OpenAPI 3.0.3</span>
            <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-white/55">JSON</span>
            <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-white/55">Cookie-based Auth</span>
            <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-white/55">RTL · فارسی</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#F58220]" />
            <p className="mt-4 text-sm">در حال بارگذاری مستندات...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/[0.05] p-8 text-center">
            <p className="text-sm font-bold text-red-400">خطا در بارگذاری مستندات</p>
            <p className="mt-1 text-xs text-red-400/70" dir="ltr">{error}</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
            <Search className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="text-sm">هیچ endpointی با این فیلتر یافت نشد.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([tag, items]) => {
              const tagMeta = spec?.tags.find((t) => t.name === tag);
              return (
                <section key={tag}>
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-black ${TAG_CLS[tag] ?? "border-white/20 bg-white/10 text-white"}`}
                    >
                      {tag}
                    </span>
                    <h3 className="text-sm font-black text-white">{tagMeta?.description ?? tag}</h3>
                    <span className="text-[11px] text-white/35">{toFa(items.length)} endpoint</span>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0f0f0f]">
                    <ul className="divide-y divide-white/[0.04]">
                      {items.map(({ ep }) => {
                        const key = `${ep.path}::${ep.method}`;
                        const isOpen = openPath === key;
                        const curl = buildCurl(ep);
                        const okResp =
                          ep.responses["200"] ?? Object.values(ep.responses)[0] ?? null;
                        const example = okResp?.content?.["application/json"]?.example;
                        return (
                          <li key={key}>
                            <button
                              onClick={() => setOpenPath((cur) => (cur === key ? null : key))}
                              className="flex w-full items-center gap-3 px-4 py-3 text-right transition hover:bg-white/[0.02] lg:px-5"
                            >
                              <span
                                className={`inline-flex h-7 w-16 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black ${METHOD_CLS[ep.method] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"}`}
                              >
                                {ep.method.toUpperCase()}
                              </span>
                              <code
                                dir="ltr"
                                className="min-w-0 flex-1 truncate text-left font-mono text-[13px] text-white/80"
                              >
                                {ep.path}
                              </code>
                              <span className="hidden min-w-0 max-w-[40%] flex-1 truncate text-xs text-white/45 md:block">
                                {ep.summary}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                            </button>

                            {isOpen && (
                              <div className="border-t border-white/[0.04] bg-black/20 px-4 py-5 lg:px-5">
                                <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                                  {/* Left: description + params */}
                                  <div className="space-y-5">
                                    <div>
                                      <p className="text-sm font-black text-white">{ep.summary}</p>
                                      <p className="mt-1 text-xs leading-6 text-white/55">
                                        {ep.description}
                                      </p>
                                    </div>

                                    {ep.params && ep.params.length > 0 && (
                                      <div>
                                        <p className="mb-2 text-[11px] font-black text-white/60">
                                          پارامترها
                                        </p>
                                        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                                          <table className="w-full text-[11px]">
                                            <thead className="bg-white/[0.02] text-white/50">
                                              <tr>
                                                <th className="px-3 py-2 text-right font-bold">نام</th>
                                                <th className="px-3 py-2 text-right font-bold">نوع</th>
                                                <th className="px-3 py-2 text-right font-bold">محل</th>
                                                <th className="px-3 py-2 text-right font-bold">توضیح</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.04]">
                                              {ep.params.map((p) => (
                                                <tr key={`${p.name}-${p.in}`}>
                                                  <td className="px-3 py-2">
                                                    <code dir="ltr" className="font-mono text-[#F58220]">
                                                      {p.name}
                                                    </code>
                                                    {p.required && (
                                                      <span className="mr-1 text-red-400">*</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2 text-white/60">{p.schema.type}</td>
                                                  <td className="px-3 py-2">
                                                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/50">
                                                      {p.in}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-white/55">{p.description}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {ep.requestBody && (
                                      <div>
                                        <p className="mb-2 text-[11px] font-black text-white/60">
                                          بدنه درخواست
                                        </p>
                                        <p className="text-xs leading-6 text-white/55">
                                          {ep.requestBody.description}
                                        </p>
                                        <pre
                                          dir="ltr"
                                          className="mt-2 max-h-72 overflow-auto rounded-xl border border-white/[0.06] bg-black/40 p-3 text-left text-[11px] text-emerald-300/90"
                                        >
                                          {JSON.stringify(
                                            ep.requestBody.content?.["application/json"]?.schema ?? {},
                                            null,
                                            2,
                                          )}
                                        </pre>
                                      </div>
                                    )}

                                    {example !== undefined && (
                                      <div>
                                        <p className="mb-2 text-[11px] font-black text-white/60">
                                          نمونه پاسخ
                                        </p>
                                        <pre
                                          dir="ltr"
                                          className="max-h-80 overflow-auto rounded-xl border border-white/[0.06] bg-black/40 p-3 text-left text-[11px] text-white/75"
                                        >
                                          {exampleToText(example)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right: curl */}
                                  <div>
                                    <div className="mb-2 flex items-center justify-between">
                                      <p className="flex items-center gap-1.5 text-[11px] font-black text-white/60">
                                        <Code2 className="h-3.5 w-3.5" />
                                        مثال curl
                                      </p>
                                      <button
                                        onClick={() => copy(key, curl)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/60 transition hover:border-[#F58220]/40 hover:text-[#F58220]"
                                      >
                                        {copied === key ? (
                                          <>
                                            <Check className="h-3 w-3" /> کپی شد
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3 w-3" /> کپی
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre
                                      dir="ltr"
                                      className="max-h-[420px] overflow-auto rounded-xl border border-white/[0.06] bg-black/60 p-3 text-left text-[11px] leading-5 text-emerald-300/90"
                                    >
                                      {curl}
                                    </pre>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {Object.keys(ep.responses).map((code) => (
                                        <span
                                          key={code}
                                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                            code.startsWith("2")
                                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                              : code.startsWith("4")
                                                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                                : "border-red-500/30 bg-red-500/10 text-red-400"
                                          }`}
                                        >
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-10 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40 transition hover:text-[#F58220]"
          >
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
            بازگشت به خانه
          </Link>
          <a
            href="/api/openapi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40 transition hover:text-[#F58220]"
          >
            مشاهده spec خام (JSON)
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
}

/* ── Persian digit helper (avoid pulling server-only format.ts into client bundle) ── */
function toFa(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}
