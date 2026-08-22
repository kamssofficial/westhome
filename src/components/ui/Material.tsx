"use client";

import { cn } from "@/lib/utils";

interface MaterialProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "light" | "heavy";
  as?: keyof React.JSX.IntrinsicElements;
}

const variantStyles: Record<string, { bg: string; backdrop: string }> = {
  default: {
    bg: "rgba(247, 243, 234, 0.72)",
    backdrop: "blur(20px) saturate(180%)",
  },
  light: {
    bg: "rgba(255, 254, 249, 0.6)",
    backdrop: "blur(16px) saturate(160%)",
  },
  heavy: {
    bg: "rgba(247, 243, 234, 0.85)",
    backdrop: "blur(24px) saturate(200%)",
  },
};

export default function Material({
  children,
  className,
  variant = "default",
  as: Tag = "div",
}: MaterialProps) {
  const style = variantStyles[variant];
  return (
    <Tag
      className={cn(className)}
      style={{
        backgroundColor: style.bg,
        backdropFilter: style.backdrop,
        WebkitBackdropFilter: style.backdrop,
      }}
    >
      {children}
    </Tag>
  );
}
