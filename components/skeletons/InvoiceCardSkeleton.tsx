import { Skeleton } from '@/components/ui/Skeleton'

export function InvoiceCardSkeleton() {
  return (
    <div className="glass-card p-6">
      {/* Header - Invoice number and status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Amount */}
      <div className="mb-4">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-9 ml-auto rounded-lg" />
      </div>
    </div>
  )
}

export function InvoiceCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <InvoiceCardSkeleton key={i} />
      ))}
    </div>
  )
}
