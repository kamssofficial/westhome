"use client";

import { useState, useRef, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const GOOGLE_MAPS_URL =
  "https://share.google.com/ODd8DypNkU7MrL9QE";

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
}

/*
 * ──────────────────────────────────────────────
 *  REAL REVIEWS — paste verified Google reviews
 *  below. Do NOT invent or rewrite any text.
 * ──────────────────────────────────────────────
 */
const reviews: Review[] = [
  {
    id: "r1",
    name: "Murshi",
    rating: 5,
    text: "I recently purchased some home decor products and frames from westhome, and I am absolutely thrilled with my experience. They have a wonderful collection with unique designs that I have honestly never seen anywhere else. The quality of the products is excellent, and it's the perfect place to find standout pieces to style your space. Highly recommended!",
  },
  {
    id: "r2",
    name: "Mohammed Abdullah alhasany",
    rating: 5,
    text: "The store is beautiful and luxurious in every detail, but its true beauty lay in the respect and refined taste of the staff. Their approach was so welcoming and made you feel happy when you shopped. It's rare to find places that care about their customers like this. Thank you from the bottom of my heart",
  },
  {
    id: "r3",
    name: "Farhan Paru",
    rating: 5,
    text: "I had a great experience over there. They have lots of unique collections. If you are looking for home decor products, must visit!",
  },
  {
    id: "r4",
    name: "Husain Faris",
    rating: 5,
    text: "Great service from a specialist group of westhome distributors! Constant and clear communication and an earlier than planned completion! Thank you Sanooj and team BM Distributors.",
  },
  {
    id: "r5",
    name: "Fayas Faya",
    rating: 5,
    text: "I had been to Westhome, and their collections were exceptionally unique and impressive, with their service being the highlight.",
  },
];


const GoogleIcon = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  /* ── swipe on mobile ── */
  const touchStart = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setCurrent((p) =>
        diff > 0
          ? Math.min(p + 1, reviews.length - 1)
          : Math.max(p - 1, 0)
      );
    }
  };

  /* ── keyboard ── */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setCurrent((p) => Math.max(p - 1, 0));
      if (e.key === "ArrowRight")
        setCurrent((p) => Math.min(p + 1, reviews.length - 1));
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  const avgRating = (
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  ).toFixed(1);

  return (
    <section className="bg-[#f8f6f1] py-20 md:py-28" aria-label="Customer reviews">
      <div className="container-shop">
        {/* ── header ── */}
        <div className="mb-12 text-center md:mb-16">
          <p className="font-label mb-3 text-[9px] tracking-[0.18em] text-accent">
            Loved by Our Customers
          </p>
          <h2 className="font-display text-3xl leading-[.96] md:text-5xl">
            What Our Customers Say
          </h2>

          {/* overall rating */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.floor(Number(avgRating))
                      ? "fill-amber-400 text-amber-400"
                      : "text-stone-300"
                  }
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-primary">
              {avgRating}
            </span>
            <span className="text-xs text-text-muted">
              Verified Google Reviews
            </span>
          </div>
        </div>

        {/* ── cards ── */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* desktop grid */}
          <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {/* mobile carousel */}
          <div className="md:hidden">
            <div className="overflow-hidden" ref={trackRef}>
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${current * 100}%)` }}
              >
                {reviews.map((review) => (
                  <div key={review.id} className="w-full flex-shrink-0 px-1">
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>

            {/* mobile nav */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrent((p) => Math.max(p - 1, 0))}
                disabled={current === 0}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-30"
                aria-label="Previous review"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-text-muted">
                {current + 1} / {reviews.length}
              </span>
              <button
                onClick={() =>
                  setCurrent((p) => Math.min(p + 1, reviews.length - 1))
                }
                disabled={current === reviews.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-30"
                aria-label="Next review"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Google CTA ── */}
        <div className="mt-12 text-center md:mt-16">
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-medium text-primary transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[.97]"
          >
            {/* Google "G" icon */}
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            View All Google Reviews
            <span aria-hidden="true">↗</span>
          </a>
          <p className="mt-3 text-[11px] text-text-muted">
            Reviews sourced from Google &middot; West Home by BM Distributors
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── single review card ── */
function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <Quote
        size={20}
        className="mb-3 text-accent/40" aria-hidden="true" />
      <div className="mb-3 flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={13} className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"} aria-hidden="true" />
        ))}
      </div>
      <p className="flex-1 text-sm leading-6 text-text-secondary">&ldquo;{review.text}&rdquo;</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
        <span className="text-xs font-medium text-primary">{review.name}</span>
        <GoogleIcon size={14} />
      </div>
    </article>
  );
}
