'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type StatusType = 'paid' | 'overdue' | 'sent' | 'draft' | 'cancelled'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType
  pulse?: boolean
}

/**
 * StatusBadge - Neon glow status indicator
 * Industrial Futurism design with neon colors and optional pulse animation
 */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, pulse = false, ...props }, ref) => {
    const styles: Record<StatusType, { 
      base: string
      glow: string
      dot: string 
    }> = {
      paid: {
        base: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        glow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]',
        dot: 'bg-emerald-400',
      },
      overdue: {
        base: 'bg-red-500/10 text-red-400 border-red-500/30',
        glow: 'shadow-[0_0_12px_rgba(248,113,113,0.5)]',
        dot: 'bg-red-400',
      },
      sent: {
        base: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        glow: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]',
        dot: 'bg-cyan-400',
      },
      draft: {
        base: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        glow: '',
        dot: 'bg-slate-400',
      },
      cancelled: {
        base: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
        glow: '',
        dot: 'bg-gray-400',
      },
    }

    const style = styles[status]
    const label = status.charAt(0).toUpperCase() + status.slice(1)

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
          style.base,
          pulse && status === 'overdue' && 'animate-pulse',
          style.glow && pulse && style.glow,
          className
        )}
        {...props}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
        {label}
      </span>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'

export default StatusBadge
