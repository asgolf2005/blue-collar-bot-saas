'use client'

import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from '@/components/ui/lucide'

interface LiveMetricCardProps {
  label: string
  value: string | number
  change: number
  changeLabel: string
  icon: LucideIcon
  color: 'cyan' | 'emerald' | 'amber' | 'purple' | 'blue'
  delay?: number
}

const colorClasses: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  cyan: {
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-400/10',
    border: 'border-cyan-200 dark:border-cyan-400/20',
    glow: 'shadow-neon-cyan',
  },
  emerald: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-400/10',
    border: 'border-emerald-200 dark:border-emerald-400/20',
    glow: 'shadow-neon-emerald',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-400/10',
    border: 'border-amber-200 dark:border-amber-400/20',
    glow: 'shadow-neon-amber',
  },
  purple: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-400/10',
    border: 'border-purple-200 dark:border-purple-400/20',
    glow: 'shadow-neon-purple',
  },
  blue: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-400/10',
    border: 'border-blue-200 dark:border-blue-400/20',
    glow: 'shadow-neon-cyan',
  },
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const duration = 1000

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(Math.floor(easeOutQuart * value))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
    
    return () => {
      startTime.current = null
    }
  }, [value])

  return (
    <span>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

export default function LiveMetricCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  delay = 0,
}: LiveMetricCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const colors = colorClasses[color]

  // Parse value for animation
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
    : value
  const prefix = typeof value === 'string' && value.startsWith('$') ? '$' : ''
  const suffix = typeof value === 'string' && value.includes('%') ? '%' : ''

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const changeColor = change > 0 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : change < 0 
      ? 'text-rose-600 dark:text-rose-400' 
      : 'text-slate-500 dark:text-slate-400'

  const formattedChange = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`

  return (
    <div
      className={`
        admin-card p-5 
        transition-all duration-500 ease-out h-full flex flex-col
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        hover:shadow-sm
      `}
    >
      <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="font-display text-3xl font-semibold text-slate-900 dark:text-white">
          <AnimatedNumber value={numericValue} prefix={prefix} suffix={suffix} />
        </p>
        <Icon className={`w-6 h-6 ${colors.text}`} />
      </div>
      <div className="flex-1" />
      <div className={`flex items-center gap-1.5 mt-2 ${changeColor}`}>
        <ChangeIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono text-xs font-medium">
          {formattedChange}
        </span>
        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
          {changeLabel}
        </span>
      </div>
    </div>
  )
}


