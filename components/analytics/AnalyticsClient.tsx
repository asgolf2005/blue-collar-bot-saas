'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { DollarSign, CheckCircle, TrendingUp, Star, TrendingDown, Minus } from '@/components/ui/icons'

type RangeKey = '7d' | '30d' | '90d' | 'ytd'

interface Metric {
  label: string
  value: string
  subtext: string
  change: string | null
  positive: boolean | null
  icon: React.ElementType
  gradient: string
  glowColor: string
}

interface AnalyticsClientProps {
  metrics: Metric[]
  selectedRange: { key: RangeKey; label: string; shortLabel: string }
  rangeOptions: Array<{ key: RangeKey; label: string; shortLabel: string }>
  paidRevenue: number
  totalRevenue: number
  outstandingRevenue: number
}

// Animated counter component
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: string; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState('0')
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplayValue(value)
      return
    }
    hasAnimated.current = true
    
    const duration = 1500
    const steps = 30
    const increment = numericValue / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), numericValue)
      const formatted = current.toLocaleString('en-US')
      setDisplayValue(prefix + formatted + suffix)
      if (step >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value, numericValue, prefix, suffix])

  return <span className="font-mono">{displayValue}</span>
}

// Blueprint Card Component
function BlueprintCard({ 
  children, 
  className = '',
  glowColor = 'blue'
}: { 
  children: React.ReactNode
  className?: string
  glowColor?: 'blue' | 'cyan' | 'amber' | 'purple' | 'green'
}) {
  const glowColors = {
    blue: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    cyan: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    amber: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    purple: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]',
    green: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
  }

  return (
    <div 
      className={`
        relative bg-[#0d1220] border border-cyan-500/30 rounded-xl overflow-hidden
        transition-all duration-500 ${glowColors[glowColor]}
        ${className}
      `}
    >
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg" />
      
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  metric, 
  index 
}: { 
  metric: Metric
  index: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100)
    return () => clearTimeout(timer)
  }, [index])

  const TrendIcon = metric.positive === null ? Minus : metric.positive ? TrendingUp : TrendingDown
  const trendColor = metric.positive === null 
    ? 'text-gray-500' 
    : metric.positive 
      ? 'text-emerald-400' 
      : 'text-rose-400'
  const trendBg = metric.positive === null
    ? 'bg-gray-500/10 border-gray-500/20'
    : metric.positive
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : 'bg-rose-500/10 border-rose-500/20'

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl p-6
        bg-gradient-to-br ${metric.gradient}
        border border-white/10
        transform transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Glow effect */}
      <div 
        className={`absolute -top-20 -right-20 w-40 h-40 ${metric.glowColor} opacity-30 blur-3xl rounded-full`}
      />
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '10px 10px',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/30 rounded-lg border border-white/10">
              <metric.icon className="w-5 h-5 text-white/90" />
            </div>
            <span className="text-sm font-medium text-white/70 tracking-wide uppercase">
              {metric.label}
            </span>
          </div>
          {metric.change && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-semibold
              border ${trendBg} ${trendColor}
            `}>
              <TrendIcon className="w-3 h-3" />
              {metric.change}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className="text-4xl lg:text-5xl font-bold text-white tracking-tight font-mono">
            <AnimatedNumber value={metric.value} />
          </span>
        </div>

        {/* Subtext */}
        <p className="text-sm text-white/50">{metric.subtext}</p>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  )
}

// Status Badge Component
export function StatusBadge({ 
  value, 
  label,
  trend
}: { 
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  const trendColors = {
    up: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    down: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    neutral: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  }

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
      font-mono text-sm ${trend ? trendColors[trend] : trendColors.neutral}
    `}>
      {trend === 'up' && <TrendingUp className="w-4 h-4" />}
      {trend === 'down' && <TrendingDown className="w-4 h-4" />}
      <span className="font-bold">{value}</span>
      {label && <span className="text-white/50">{label}</span>}
    </div>
  )
}

export default function AnalyticsClient({
  metrics,
  selectedRange,
  rangeOptions,
  paidRevenue,
  totalRevenue,
  outstandingRevenue,
}: AnalyticsClientProps) {
  const collectionPercent = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ANALYTICS
              </span>
            </h1>
            <p className="text-cyan-500/60 mt-1 font-mono text-sm tracking-wide">
              BUSINESS PERFORMANCE DASHBOARD // {selectedRange.shortLabel}
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-[#0d1220] border border-cyan-500/20 rounded-xl p-1.5">
            {rangeOptions.map((range) => (
              <Link
                key={range.key}
                href={`/admin/analytics?range=${range.key}`}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all duration-300
                  ${range.key === selectedRange.key
                    ? 'text-cyan-400'
                    : 'text-white/40 hover:text-white/70'
                  }
                `}
              >
                {range.key === selectedRange.key && (
                  <span className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
                )}
                <span className="relative z-10">{range.shortLabel}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <StatCard key={metric.label} metric={metric} index={index} />
          ))}
        </div>

        {/* Collection Progress */}
        <BlueprintCard glowColor="blue">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white tracking-wide">COLLECTION PROGRESS</h3>
                <p className="text-sm text-cyan-500/60 font-mono mt-1">
                  ${paidRevenue.toLocaleString()} OF ${totalRevenue.toLocaleString()} COLLECTED
                </p>
              </div>
              <StatusBadge value={`${collectionPercent}%`} label="COLLECTED" trend="up" />
            </div>

            {/* Progress bar */}
            <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-cyan-500/20">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-1000 relative"
                style={{ width: `${collectionPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 font-mono text-sm">
              <span className="text-white/40">
                <span className="text-cyan-400">{collectionPercent}%</span> COLLECTED
              </span>
              <span className="text-amber-400">
                ${outstandingRevenue.toLocaleString()} OUTSTANDING
              </span>
            </div>
          </div>
        </BlueprintCard>
      </div>
    </div>
  )
}

