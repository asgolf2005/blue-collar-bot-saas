import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>

      {/* Week View */}
      <div className="space-y-6">
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div key={dayIndex} className="glass-card p-5">
            {/* Day Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            {/* Jobs for this day */}
            {dayIndex % 2 === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: dayIndex === 0 ? 3 : 2 }).map((_, jobIndex) => (
                  <div key={jobIndex} className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
                    <div className="flex items-start gap-4">
                      {/* Time */}
                      <div className="min-w-[60px]">
                        <Skeleton className="h-5 w-14 mb-1" />
                        <Skeleton className="h-3 w-10" />
                      </div>

                      {/* Job Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-64 mb-2" />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3 rounded" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3 rounded" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 rounded-full mx-auto mb-3" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
