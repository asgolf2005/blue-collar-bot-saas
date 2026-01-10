export default function CustomerRowSkeleton() {
  return (
    <tr className="animate-pulse">
      {/* Checkbox */}
      <td className="px-6 py-4">
        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </td>
      {/* Name */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </td>
      {/* Email */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
      </td>
      {/* Phone */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </td>
      {/* Address */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-56"></div>
      </td>
      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </td>
    </tr>
  )
}
