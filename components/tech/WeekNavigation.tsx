'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addWeeks, format, startOfWeek } from 'date-fns'

export default function WeekNavigation({ currentWeekStart }: { currentWeekStart: Date }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigateWeek = (offset: number) => {
    const newDate = addWeeks(currentWeekStart, offset)
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', newDate.toISOString())
    router.push(`?${params.toString()}`)
  }

  const goToThisWeek = () => {
    router.push('/tech/schedule')
  }

  const isCurrentWeek = () => {
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
    return format(currentWeekStart, 'yyyy-MM-dd') === format(thisWeek, 'yyyy-MM-dd')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigateWeek(-1)}
        className="glass-btn-secondary px-3 py-2 flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      {!isCurrentWeek() && (
        <button
          onClick={goToThisWeek}
          className="glass-btn-primary px-4 py-2 text-sm"
        >
          This Week
        </button>
      )}

      <button
        onClick={() => navigateWeek(1)}
        className="glass-btn-secondary px-3 py-2 flex items-center gap-1 text-sm"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
