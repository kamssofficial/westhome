import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { blogArticles } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return blogArticles.map((a) => ({ slug: a.slug }));
}

// All articles are statically generated above — any other slug is genuinely
// unknown. Without this, an unmatched slug renders the 404 UI under HTTP 200
// (a soft-404 that wastes crawl budget); this makes Next return a real 404.
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) return { title: "Article Not Found" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Organization",
      name: "WESTHOME by BM Distributors",
    },
    publisher: {
      "@type": "Organization",
      name: "WESTHOME by BM Distributors",
      url: "https://www.westhome.in/",
    },
    mainEntityOfPage: `https://www.westhome.in/blog/${article.slug}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.westhome.in/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.westhome.in/blog" },
      { "@type": "ListItem", position: 3, name: article.title, item: `https://www.westhome.in/blog/${article.slug}` },
    ],
  };

  return (
    <div className="animate-fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="container-shop pt-8 pb-20 md:pb-28 max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft size={13} /> All articles
        </Link>

        <div className="mt-6 flex items-center gap-3 text-[11px] font-medium text-text-muted">
          <span className="rounded-full bg-foreground/[.06] px-2.5 py-1">{article.category}</span>
          <span>
            {new Date(article.date + "T00:00:00").toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span>· {article.readMinutes} min read</span>
        </div>

        <h1 className="mt-4 font-display text-3xl md:text-5xl leading-[1.05]">
          {article.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-text-secondary">{article.excerpt}</p>

        <div className="mt-8 space-y-5 border-t border-foreground/[.08] pt-8">
          {article.content.map((para, i) => (
            <p key={i} className="text-[15px] leading-7 text-foreground/85">
              {para}
            </p>
          ))}
        </div>

        <div className="mt-12 rounded-[1.35rem] bg-[#1f2521] px-7 py-8 text-white">
          <p className="font-display text-xl">Bring the ideas home.</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Explore our curated collection of wall clocks, cushion covers and
            storage pieces — chosen to last.
          </p>
          <Link
            href="/shop/all"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 active:scale-[.97]"
          >
            Shop the collection
          </Link>
        </div>
      </div>
    </div>
  );
}