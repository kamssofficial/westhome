"use client";

import Image from "next/image";
import { useImageRetry } from "@/lib/useImageRetry";
import { reportImageError } from "@/lib/reportImageError";

/** Small (80px) cart/wishlist thumbnail with silent retry on transient
 *  image-proxy failures before falling back to reporting. */
export default function RetryImage({
  src,
  alt,
  productId,
  productName,
}: {
  src: string;
  alt: string;
  productId?: string;
  productName?: string;
}) {
  const [retrySrc, handleImgError] = useImageRetry(src, () =>
    reportImageError({ url: src, productId, productName }),
  );
  return (
    <Image
      src={retrySrc || src}
      alt={alt}
      fill
      className="object-cover"
      sizes="80px"
      onError={handleImgError}
    />
  );
}
