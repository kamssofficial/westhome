"use client";

import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";

/**
 * Google review prompt shown after a successful order.
 *
 * Points at the store's official Google profile (share.google link resolves to
 * the business's Maps listing). For a one-tap "write a review" flow, replace
 * with the link Google Business Profile gives under "Ask for reviews"
 * (search.google.com/local/writereview?placeid=...) once the Place ID is known.
 * The QR code is rendered via the free api.qrserver.com endpoint.
 */
const GOOGLE_REVIEW_URL = "https://share.google.com/ODd8DypNkU7MrL9QE";

export default function GoogleReviewPrompt() {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(GOOGLE_REVIEW_URL)}`;

  return (
    <div className="mt-6 rounded-[1.35rem] border border-foreground/[.08] bg-surface p-5 shadow-sm text-left">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
        ))}
        <span className="ml-1.5 text-xs font-semibold text-primary">Enjoyed your order?</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-secondary">
        Your review helps other families in Kerala find quality decor they can
        trust. It takes under a minute and means the world to our small team.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <Image
          src={qrSrc}
          alt="QR code to leave a Google review for WEST HOME by BM Distributors"
          width={88}
          height={88}
          className="rounded-lg border border-foreground/[.08]"
          unoptimized
        />
        <div className="flex-1">
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Leave a Google review <ExternalLink size={12} />
          </a>
          <p className="mt-2 text-[11px] text-text-muted">
            Scan the QR or tap the button — opens straight to our Google profile.
          </p>
        </div>
      </div>
    </div>
  );
}