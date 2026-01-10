export default function StatsCardSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>

      {/* Value */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>

      {/* Change indicator */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
    </div>
  )
}
