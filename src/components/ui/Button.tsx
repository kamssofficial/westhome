"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Variants
          variant === "primary" &&
            "bg-primary text-white hover:bg-primary-hover focus:ring-primary/30 shadow-sm hover:shadow-md",
          variant === "secondary" &&
            "bg-secondary text-white hover:bg-secondary-hover focus:ring-secondary/30 shadow-sm hover:shadow-md",
          variant === "accent" &&
            "bg-accent text-white hover:bg-accent-hover focus:ring-accent/30 shadow-sm hover:shadow-md",
          variant === "outline" &&
            "border border-border bg-white text-foreground hover:bg-surface-muted focus:ring-primary/20",
          variant === "ghost" &&
            "text-text-secondary hover:text-foreground hover:bg-surface-muted focus:ring-primary/10",
          // Sizes
          size === "sm" && "h-8 px-3 text-xs gap-1.5",
          size === "md" && "h-10 px-5 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-2",
          // Full width
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
