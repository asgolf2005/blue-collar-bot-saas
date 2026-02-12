'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { InvoiceStatus } from '@/lib/types'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface FuturistStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: InvoiceStatus | 'all'
  pulse?: boolean
}

const statusStyles: Record<string, { 
  bg: string
  text: string
  border: string
  glow: string
  label: string
}> = {
  paid: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
    glow: 'shadow-green-400/20',
    label: 'Paid',
  },
  sent: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-400/20',
    label: 'Sent',
  },
  draft: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-400/10',
    label: 'Draft',
  },
  overdue: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-red-400/30',
    label: 'Overdue',
  },
  cancelled: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    glow: 'shadow-gray-400/10',
    label: 'Cancelled',
  },
  all: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-400/20',
    label: 'All',
  },
}

export const FuturistStatusBadge = React.forwardRef<HTMLSpanElement, FuturistStatusBadgeProps>(
  ({ className, status, pulse = false, ...props }, ref) => {
    const styles = statusStyles[status] || statusStyles.draft
    const shouldPulse = pulse && status === 'overdue'

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full',
          'text-xs font-semibold uppercase tracking-wider',
          'border backdrop-blur-sm',
          'transition-all duration-300',
          styles.bg,
          styles.text,
          styles.border,
          shouldPulse && 'animate-pulse shadow-lg',
          shouldPulse && styles.glow,
          className
        )}
        {...props}
      >
        {/* Status dot */}
        <span className={cn(
          'w-1.5 h-1.5 rounded-full mr-2',
          styles.text.replace('text-', 'bg-'),
          shouldPulse && 'animate-ping'
        )} />
        {styles.label}
      </span>
    )
  }
)
FuturistStatusBadge.displayName = 'FuturistStatusBadge'
