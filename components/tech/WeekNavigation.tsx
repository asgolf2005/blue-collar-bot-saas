'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
      <button type="button"
        onClick={() => navigateWeek(-1)}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-xs font-mono text-slate-600 shadow-sm transition-colors hover:border-cyan-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-cyan-500/40 dark:hover:text-white"
      >
        Previous
      </button>

      {!isCurrentWeek() && (
        <button type="button"
          onClick={goToThisWeek}
          className="inline-flex items-center rounded-full border border-cyan-300/70 bg-cyan-50 px-3.5 py-1.5 text-xs font-mono text-cyan-700 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_0_18px_rgba(34,211,238,0.16)] transition-colors hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-300 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_20px_rgba(34,211,238,0.24)] dark:hover:bg-cyan-500/20"
        >
          This Week
        </button>
      )}

      <button type="button"
        onClick={() => navigateWeek(1)}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-xs font-mono text-slate-600 shadow-sm transition-colors hover:border-cyan-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-cyan-500/40 dark:hover:text-white"
      >
        Next
      </button>
    </div>
  )
}
