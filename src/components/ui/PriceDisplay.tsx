import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  regularPrice: number | null | undefined;
  salePrice?: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Price display rules:
 * 1. If ONLY Sale Price exists → show Sale Price only
 * 2. If both exist AND same → show Sale Price only
 * 3. If Regular > Sale → show Sale + strikethrough Regular
 * 4. If ONLY Regular Price exists → show Regular Price only
 * 5. If Sale Price is 0/null/undefined → treat as no sale price
 * 6. If Regular is 0/null/undefined but Sale is valid → show Sale only
 * 7. Never show duplicate prices or ₹0
 */
export default function PriceDisplay({ regularPrice, salePrice, size = "md", className }: PriceDisplayProps) {
  const reg = Number(regularPrice) || 0;
  const sale = Number(salePrice) || 0;

  const hasReg = reg > 0;
  const hasSale = sale > 0;
  const isDiscount = hasReg && hasSale && reg > sale;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  };

  const strikeClasses = {
    sm: "text-[10px]",
    md: "text-[11px]",
    lg: "text-sm",
  };

  if (isDiscount) {
    // Regular > Sale → show sale price + strikethrough regular
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <span className={cn("font-semibold text-primary", sizeClasses[size])}>
          {formatPrice(sale)}
        </span>
        <span className={cn("text-text-muted line-through", strikeClasses[size])}>
          {formatPrice(reg)}
        </span>
      </div>
    );
  }

  // Show only the valid price (sale if available, otherwise regular)
  const displayPrice = hasSale ? sale : reg;
  if (!displayPrice) return null;

  return (
    <span className={cn("font-semibold text-primary", sizeClasses[size], className)}>
      {formatPrice(displayPrice)}
    </span>
  );
}
