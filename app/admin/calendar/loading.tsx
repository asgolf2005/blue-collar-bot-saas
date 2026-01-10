import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Calendar Controls */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Calendar Header - Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="text-center p-2">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar Grid - 5 weeks */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[100px] p-2 rounded-lg border border-surface-200 dark:border-surface-700">
              <Skeleton className="h-5 w-5 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                {i % 3 === 0 && <Skeleton className="h-3 w-full" />}
                {i % 5 === 0 && <Skeleton className="h-3 w-full" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Jobs Summary */}
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
              <Skeleton className="h-4 w-16" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
