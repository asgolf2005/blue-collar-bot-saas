'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { DollarSign, Briefcase, Clock } from '@/components/ui/lucide'
import { ADMIN_RANGE_TRACK_CLASS, adminRangeItemClass } from '@/lib/ui/admin-range'

interface RevenueDataPoint {
  date: string
  displayDate: string
  revenue: number
  jobs: number
  hours: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  onDataPointClick: (data: RevenueDataPoint) => void
}

type ChartView = 'revenue' | 'jobs' | 'hours'

const viewConfig = {
  revenue: {
    key: 'revenue' as const,
    label: 'Revenue',
    color: '#22d3ee',
    fillColor: 'url(#gradientRevenue)',
    icon: DollarSign,
    prefix: '$',
  },
  jobs: {
    key: 'jobs' as const,
    label: 'Jobs',
    color: '#a855f7',
    fillColor: 'url(#gradientJobs)',
    icon: Briefcase,
    prefix: '',
  },
  hours: {
    key: 'hours' as const,
    label: 'Hours',
    color: '#f59e0b',
    fillColor: 'url(#gradientHours)',
    icon: Clock,
    prefix: '',
  },
}

function formatXAxisDateLabel(value: string): string {
  // Prefer SQL date keys (YYYY-MM-DD) for deterministic formatting.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T12:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Fallback for legacy values like "Sun, Jan 11" -> "Jan 11"
  const parts = value.split(', ')
  return parts.length > 1 ? parts.slice(1).join(', ') : value
}

function CustomTooltip({ 
  active, 
  payload, 
  view 
}: { 
  active?: boolean
  payload?: any[]
  view: ChartView
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as RevenueDataPoint
    const config = viewConfig[view]
    
    return (
      <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="font-mono text-xs text-slate-400 mb-2">{data.displayDate}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="font-mono text-xs text-slate-300">{config.label}:</span>
            <span className="font-mono text-sm font-semibold text-white">
              {config.prefix}{payload[0].value?.toLocaleString()}
            </span>
          </div>
          {view !== 'revenue' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-xs text-slate-300">Revenue:</span>
              <span className="font-mono text-sm text-emerald-400">
                ${data.revenue?.toLocaleString()}
              </span>
            </div>
          )}
          {view !== 'jobs' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="font-mono text-xs text-slate-300">Jobs:</span>
              <span className="font-mono text-sm text-purple-400">
                {data.jobs}
              </span>
            </div>
          )}
        </div>
        <p className="font-mono text-[10px] text-slate-500 mt-2">Click any point for details</p>
      </div>
    )
  }
  return null
}

export default function RevenueChart({ data, onDataPointClick }: RevenueChartProps) {
  const [view, setView] = useState<ChartView>('revenue')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const config = viewConfig[view]

  // Calculate stats for the current view
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, avg: 0, max: 0 }
    }
    const values = data.map(d => d[view] || 0)
    const total = values.reduce((sum, v) => sum + v, 0)
    const avg = total / values.length
    const max = Math.max(...values)
    return { total, avg, max }
  }, [data, view])

  // Handle click on the chart area
  const handleChartClick = (e: any) => {
    if (e && e.activeLabel && e.activePayload && e.activePayload[0]) {
      const dataPoint = e.activePayload[0].payload as RevenueDataPoint
      onDataPointClick(dataPoint)
    }
  }

  return (
    <div className="admin-card p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="admin-section-title">
            REVENUE TREND
          </h2>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily performance over selected period
          </p>
        </div>

        {/* View Toggle */}
        <div className={ADMIN_RANGE_TRACK_CLASS}>
          {(Object.keys(viewConfig) as ChartView[]).map((v) => {
            const Icon = viewConfig[v].icon
            return (
              <button type="button"
                key={v}
                onClick={() => setView(v)}
                className={adminRangeItemClass(view === v)}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{v}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase">Total</p>
          <p className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {config.prefix}{Math.round(stats.total).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase">Average</p>
          <p className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {config.prefix}{Math.round(stats.avg).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase">Peak</p>
          <p className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {config.prefix}{Math.round(stats.max).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onClick={handleChartClick}
            onMouseMove={(e) => {
              if (e.activeTooltipIndex !== undefined) {
                setHoveredIndex(e.activeTooltipIndex)
              }
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(148, 163, 184, 0.2)" 
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisDateLabel}
              tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              minTickGap={10}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              width={50}
            />
            <Tooltip content={<CustomTooltip view={view} />} />
            <ReferenceLine 
              y={stats.avg} 
              stroke="#64748b" 
              strokeDasharray="5 5" 
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey={config.key}
              stroke={config.color}
              strokeWidth={hoveredIndex !== null ? 3 : 2}
              fill={config.fillColor}
              className="cursor-pointer"
              activeDot={{ 
                r: 8, 
                stroke: config.color, 
                strokeWidth: 3, 
                fill: '#fff',
                cursor: 'pointer'
              }}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props
                if (cx == null || cy == null) return <g key={`dot-${index}`} />
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    stroke={config.color}
                    strokeWidth={2}
                    fill="#fff"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onDataPointClick(payload)}
                  />
                )
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2">
        Hover for breakdown - click chart for details
      </p>
    </div>
  )
}



