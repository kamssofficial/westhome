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
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out touch-target",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[.965] disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "bg-primary text-white shadow-[0_8px_22px_rgba(31,33,31,.16)] hover:bg-primary-hover hover:shadow-[0_14px_32px_rgba(31,33,31,.22)]",
        variant === "secondary" &&
          "bg-secondary text-white shadow-sm hover:bg-secondary-hover",
        variant === "accent" &&
          "bg-accent text-white shadow-[0_8px_22px_rgba(181,108,69,.2)] hover:bg-accent-hover hover:shadow-[0_14px_32px_rgba(181,108,69,.28)]",
        variant === "outline" &&
          "border border-foreground/15 bg-surface/60 text-foreground hover:border-foreground/30 hover:bg-surface",
        variant === "ghost" &&
          "text-text-secondary hover:bg-foreground/[.06] hover:text-foreground",
        size === "sm" && "h-9 px-4 text-xs",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-[3.25rem] px-6 text-[0.9rem]",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2
          size={size === "sm" ? 14 : 16}
          className="animate-spin"
        />
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";
export default Button;
