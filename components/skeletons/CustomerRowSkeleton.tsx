import { Skeleton } from '@/components/ui/Skeleton'

export function CustomerRowSkeleton() {
  return (
    <tr className="border-b border-surface-200 dark:border-surface-700">
      {/* Checkbox */}
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-4 rounded" />
      </td>

      {/* Name */}
      <td className="px-4 py-4">
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-3 w-32" />
      </td>

      {/* Contact */}
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-36 mb-1" />
        <Skeleton className="h-4 w-28" />
      </td>

      {/* Address */}
      <td className="px-4 py-4">
        <Skeleton className="h-4 w-48" />
      </td>

      {/* Jobs Count */}
      <td className="px-4 py-4">
        <Skeleton className="h-6 w-12 rounded-full mx-auto" />
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </td>
    </tr>
  )
}

export function CustomerTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-50 dark:bg-surface-800">
          <tr>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-4 rounded" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-16" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="px-4 py-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            <th className="px-4 py-3 text-center">
              <Skeleton className="h-4 w-12 mx-auto" />
            </th>
            <th className="px-4 py-3 text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <CustomerRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
