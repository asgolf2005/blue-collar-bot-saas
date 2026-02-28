'use client'

import { useJobCounts } from '@/hooks/useJobCounts'
import { Skeleton } from '@/components/ui/Skeleton'

interface JobCountDisplayProps {
  businessId: string
  variant?: 'simple' | 'detailed'
  className?: string
}

export function JobCountDisplay({ 
  businessId, 
  variant = 'simple',
  className = '' 
}: JobCountDisplayProps) {
  const { counts, loading, error } = useJobCounts({ businessId })

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-8 w-20" />
      </div>
    )
  }

  if (error || !counts) {
    return (
      <div className={className}>
        <span className="text-sm text-slate-500">-</span>
      </div>
    )
  }

  if (variant === 'simple') {
    return (
      <span className={className}>
        {counts.total.toLocaleString()}
      </span>
    )
  }

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div className="bg-cyan-50 dark:bg-cyan-400/10 rounded-lg p-3">
        <p className="text-xs text-cyan-600 dark:text-cyan-400 uppercase">Total Jobs</p>
        <p className="text-2xl font-display text-cyan-600 dark:text-cyan-400">
          {counts.total.toLocaleString()}
        </p>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-400/10 rounded-lg p-3">
        <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase">Completed</p>
        <p className="text-2xl font-display text-emerald-600 dark:text-emerald-400">
          {counts.completed.toLocaleString()}
        </p>
      </div>
      <div className="bg-amber-50 dark:bg-amber-400/10 rounded-lg p-3">
        <p className="text-xs text-amber-600 dark:text-amber-400 uppercase">Active</p>
        <p className="text-2xl font-display text-amber-600 dark:text-amber-400">
          {counts.active.toLocaleString()}
        </p>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
        <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Scheduled</p>
        <p className="text-2xl font-display text-slate-600 dark:text-slate-400">
          {counts.scheduled.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// Server component version for static displays
interface ServerJobCountProps {
  total: number
  className?: string
}

export function ServerJobCount({ total, className = '' }: ServerJobCountProps) {
  return (
    <span className={className}>
      {total.toLocaleString()}
    </span>
  )
}
