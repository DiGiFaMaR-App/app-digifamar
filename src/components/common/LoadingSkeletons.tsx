import { Skeleton } from "@/components/ui/skeleton";

/** Card-shaped skeleton for product/farm grids. */
export function ProductCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-3">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card/40 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
