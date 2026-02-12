'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface FilterTabsProps<T extends string> {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * FilterTabs - Neon-styled segmented control for filtering
 * Used for invoice status filters (All, Draft, Sent, Paid, Overdue)
 */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div className={cn('flex items-center gap-1 p-1 bg-[#1a1f2e] rounded-lg border border-blue-500/20', className)}>
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              isActive
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {/* Active background glow */}
            {isActive && (
              <span className="absolute inset-0 bg-blue-500/15 rounded-md border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]" />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {option.label}
              {option.count !== undefined && option.count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700/50 text-slate-400'
                )}>
                  {option.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default FilterTabs
