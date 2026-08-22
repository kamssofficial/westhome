import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton", className)} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-[1.35rem] overflow-hidden border border-foreground/[.08]">
      <div className="aspect-product bg-surface-muted" />
      <div className="p-4 md:p-5 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-20 mt-2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-50 px-3 pt-3 md:px-5 md:pt-5">
      <div className="material mx-auto max-w-[1400px] rounded-[1.35rem]">
        <div className="flex h-[4.25rem] items-center justify-between px-4 md:h-[4.75rem] md:px-6">
          <Skeleton className="h-6 w-24 rounded-full" />
          <div className="hidden md:flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="container-shop relative mt-5 overflow-hidden rounded-[2rem] bg-[#1f2521]">
      <div className="flex min-h-[400px] items-center p-7 md:p-16">
        <div className="space-y-4">
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="h-12 w-80 rounded-lg" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-11 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[145px] md:w-auto">
      <Skeleton className="aspect-[.82] rounded-[1.35rem]" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
