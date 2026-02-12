'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import BlueprintCard from './BlueprintCard'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string
  icon: React.ReactNode
  gradient: 'blue' | 'amber' | 'green' | 'red' | 'cyan'
  subtitle?: string
  trend?: {
    value: string
    positive: boolean
  }
}

/**
 * StatCard - Financial metric card with gradient accent
 * Used for Total Revenue, Outstanding, Paid This Month, Overdue
 */
export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, icon, gradient, subtitle, trend, ...props }, ref) => {
    const gradientClasses = {
      blue: 'from-blue-500/20 to-cyan-500/10 text-blue-400',
      amber: 'from-amber-500/20 to-orange-500/10 text-amber-400',
      green: 'from-emerald-500/20 to-green-500/10 text-emerald-400',
      red: 'from-red-500/20 to-rose-500/10 text-red-400',
      cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400',
    }

    const iconBgClasses = {
      blue: 'bg-blue-500/10 text-blue-400',
      amber: 'bg-amber-500/10 text-amber-400',
      green: 'bg-emerald-500/10 text-emerald-400',
      red: 'bg-red-500/10 text-red-400',
      cyan: 'bg-cyan-500/10 text-cyan-400',
    }

    return (
      <BlueprintCard
        ref={ref}
        className={cn('p-5 group hover:border-blue-500/30 transition-all duration-300', className)}
        cornerAccent
        {...props}
      >
        {/* Gradient accent bar at top */}
        <div 
          className={cn(
            'absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r',
            gradientClasses[gradient].split(' ')[0].replace('/20', ''),
            gradientClasses[gradient].split(' ')[2].replace('/10', '')
          )}
        />
        
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {title}
            </p>
            <p className={cn(
              'text-2xl font-bold tabular-nums tracking-tight',
              gradientClasses[gradient].split(' ').pop()
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <span className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {trend.positive ? '+' : ''}{trend.value}
                </span>
                <span className="text-xs text-slate-500">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn(
            'p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110',
            iconBgClasses[gradient]
          )}>
            {icon}
          </div>
        </div>
      </BlueprintCard>
    )
  }
)
StatCard.displayName = 'StatCard'

export default StatCard
