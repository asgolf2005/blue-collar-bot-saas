import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form - Left Side */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6">
            <Skeleton className="h-6 w-48 mb-6" />

            {/* Form Fields */}
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-24" />
            </div>
          </div>
        </div>

        {/* Account Stats - Right Side */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Summary Card */}
          <div className="glass-card p-6">
            <Skeleton className="h-6 w-40 mb-4" />

            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-9 w-16" />
              </div>
              <div>
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          </div>

          {/* Need Service Card */}
          <div className="glass-card p-6 bg-primary-50/50 dark:bg-primary-900/20">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
