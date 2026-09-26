import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WestHomeLogoProps {
  className?: string;
  /** Visual variant — determines which asset and colors to use */
  variant?: "default" | "inverse" | "compact";
  /** Size preset */
  size?: "sm" | "md" | "lg" | "xl";
  /** If provided, wraps in a Link */
  href?: string;
  /** Override alt text */
  alt?: string;
  /** Render as plain image without wrapper (for Footer etc.) */
  plain?: boolean;
}

const SIZES = {
  sm: { width: 110, height: 26 },
  md: { width: 140, height: 33 },
  lg: { width: 170, height: 40 },
  xl: { width: 220, height: 52 },
} as const;

export default function WestHomeLogo({
  className,
  variant = "default",
  size = "md",
  href = "/",
  alt = "WEST HOME by BM Distributors",
  plain = false,
}: WestHomeLogoProps) {
  const s = SIZES[size];

  // Select the correct asset based on variant
  const src =
    variant === "inverse"
      ? "/images/logo/westhome-logo-white.png"
      : "/images/logo/westhome-logo-transparent.png";

  const logo = (
    <Image
      src={src}
      alt={alt}
      width={s.width}
      height={s.height}
      priority
      className={cn("h-auto w-auto object-contain", className)}
      style={{ width: s.width, height: s.height }}
    />
  );

  if (plain) return logo;

  return (
    <Link href={href} className="shrink-0" aria-label="WEST HOME home">
      {logo}
    </Link>
  );
}
