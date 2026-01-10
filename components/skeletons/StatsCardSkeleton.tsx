import { Skeleton } from '@/components/ui/Skeleton'

export function StatsCardSkeleton({ large = false }: { large?: boolean }) {
  if (large) {
    return (
      <div className="glass-card p-6 col-span-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-48 mb-1" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-16 w-16 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <StatsCardSkeleton large />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="w-full" height={height} />
    </div>
  )
}
