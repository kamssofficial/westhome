import { cn } from "@/lib/utils";

interface WestHomeLogoProps {
  className?: string;
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: { width: 110, mainSize: 18, subSize: 6.5, subY: 20, gap: 1.5 },
  md: { width: 150, mainSize: 23, subSize: 8.5, subY: 26, gap: 1.8 },
  lg: { width: 180, mainSize: 27, subSize: 10, subY: 31, gap: 2.2 },
  xl: { width: 240, mainSize: 35, subSize: 13, subY: 41, gap: 3 },
};

export default function WestHomeLogo({ className, variant = "dark", size = "md" }: WestHomeLogoProps) {
  const s = SIZES[size];
  const color = variant === "dark" ? "#1C1917" : "#FAF9F6";
  const height = s.subY + s.subSize + 2;

  return (
    <svg
      viewBox={`0 0 ${s.width} ${height}`}
      width={s.width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="West Home"
      role="img"
    >
      {/* "west home" — main wordmark */}
      <text
        x="0"
        y={s.mainSize * 0.82}
        fontFamily="'DM Sans', 'Helvetica Neue', Arial, sans-serif"
        fontSize={s.mainSize}
        fontWeight="600"
        letterSpacing="-0.03em"
        fill={color}
      >
        west home
      </text>

      {/* "by BM Distributors" — tagline, right-aligned under "home" */}
      <text
        x={s.width}
        y={s.subY + s.subSize * 0.8}
        fontFamily="'DM Sans', 'Helvetica Neue', Arial, sans-serif"
        fontSize={s.subSize}
        fontWeight="400"
        letterSpacing="0.01em"
        textAnchor="end"
        fill={color}
        opacity="0.55"
      >
        by BM Distributors
      </text>
    </svg>
  );
}
