import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { blogArticles } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Home Decor Blog & Styling Tips",
  description:
    "Styling tips, buying guides and organisation ideas for Indian homes — from wall clocks and cushion covers to laundry room storage.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "WEST HOME Journal — Home Decor Blog",
    description:
      "Styling tips, buying guides and organisation ideas for Indian homes — from wall clocks and cushion covers to laundry room storage.",
    type: "website",
    url: "/blog",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WEST HOME by BM Distributors" }],
  },
};

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "WEST HOME Journal",
    url: "https://www.westhome.in/blog",
    description: "Home decor styling tips and buying guides for Indian homes.",
    blogPost: blogArticles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      datePublished: a.date,
      url: `https://www.westhome.in/blog/${a.slug}`,
    })),
  };

  return (
    <div className="animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="container-shop pt-10 pb-6 md:pt-16 md:pb-10">
        <p className="font-label mb-3 text-[9px] text-accent">The Journal</p>
        <h1 className="font-display text-4xl md:text-6xl">Styling tips & guides.</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-text-secondary">
          Practical ideas for making Indian homes feel considered — without
          full renovations or designer budgets.
        </p>
      </section>

      {/* Article list */}
      <section className="container-shop pb-20 md:pb-28">
        <div className="grid gap-6 md:grid-cols-2">
          {blogArticles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group block rounded-[1.35rem] border border-foreground/[.08] bg-surface-muted p-6 transition-[transform,box-shadow,border-color] duration-500 ease-out group-hover:-translate-y-1 group-hover:border-foreground/[.16] group-hover:shadow-card-hover"
            >
              <div className="flex items-center gap-3 text-[11px] font-medium text-text-muted">
                <span className="rounded-full bg-foreground/[.06] px-2.5 py-1">
                  {a.category}
                </span>
                <span>
                  {new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span>· {a.readMinutes} min read</span>
              </div>
              <h2 className="mt-3 font-display text-xl leading-snug text-foreground group-hover:text-accent transition-colors">
                {a.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary line-clamp-3">
                {a.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                Read article <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}