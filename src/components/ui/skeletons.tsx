// SPEC: design-improvements.md
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic card skeleton — mirrors the shadcn Card's shape (rounded-xl, ring-1,
 * bg-card, py-4 px-4) so the transition from loading→content is seamless.
 */
export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 py-4 px-4 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/**
 * Stat card skeleton — matches StatCard's layout (border-t accent, label row,
 * value row, sub-label row) so there is no layout shift on load.
 */
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 border-t-[3px] border-t-muted py-4 px-4 space-y-2">
      {/* label — matches CardTitle xs uppercase tracking */}
      <Skeleton className="h-3 w-24" />
      {/* value — matches text-3xl font-bold */}
      <Skeleton className="h-8 w-16" />
      {/* sub-label */}
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 px-4 py-2 flex gap-4 border-b">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-b last:border-b-0">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
