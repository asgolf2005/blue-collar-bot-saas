import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-2xl glass-card">
            <Skeleton className="h-9 w-9 rounded-xl mb-3" />
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Progress Card */}
        <div className="col-span-1 p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="col-span-1 p-4 rounded-2xl glass-card space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>

        {/* Shift Window */}
        <div className="col-span-2 p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="text-right">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Next Job Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl glass-card">
              <div className="flex items-start gap-4">
                {/* Time */}
                <div className="text-center min-w-[50px]">
                  <Skeleton className="h-6 w-12 mb-1 mx-auto" />
                  <Skeleton className="h-3 w-8 mx-auto" />
                </div>

                {/* Timeline Indicator */}
                <div className="flex flex-col items-center py-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  {i < 3 && <Skeleton className="w-0.5 h-10 mt-2" />}
                </div>

                {/* Job Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-1" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="h-3.5 w-3.5 rounded" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>

                {/* Arrow */}
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
