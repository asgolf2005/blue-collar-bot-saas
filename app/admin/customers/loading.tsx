import { CustomerTableSkeleton } from '@/components/skeletons'
import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      {/* Customer Table */}
      <CustomerTableSkeleton rows={8} />
    </div>
  )
}
