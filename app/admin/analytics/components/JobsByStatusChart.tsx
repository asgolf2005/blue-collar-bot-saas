'use client'

import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from 'recharts'

interface StatusData {
  status: string
  count: number
  color: string
}

interface JobsByStatusChartProps {
  data: StatusData[]
  onSegmentClick: (status: string | null) => void
}

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  on_the_way: 'On The Way',
  en_route: 'En Route',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const formatStatusLabel = (status: string) =>
  statusLabels[status] ||
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="rgb(var(--text-primary))" className="font-display text-2xl">
        {payload.count}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="rgb(var(--text-muted))" className="font-mono text-xs">
        Jobs
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  )
}

export default function JobsByStatusChart({ data, onSegmentClick }: JobsByStatusChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  const total = data.reduce((sum, item) => sum + item.count, 0)

  const handleClick = (entry: StatusData) => {
    const nextStatus = selectedStatus === entry.status ? null : entry.status
    setSelectedStatus(nextStatus)
    onSegmentClick(nextStatus)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <h2 className="font-display text-2xl text-slate-900 dark:text-white tracking-wide mb-4">
        JOBS BY STATUS
      </h2>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex ?? undefined}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={(_, index) => {
                  if (!data[index]) return
                  handleClick(data[index])
                }}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={selectedStatus === entry.status ? '#fff' : 'none'}
                    strokeWidth={selectedStatus === entry.status ? 3 : 0}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {activeIndex === null && (
              <>
                <span className="font-display text-3xl text-slate-900 dark:text-white">{total}</span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">Total Jobs</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="space-y-2">
            {data.map((item, index) => {
              const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
              const isActive = selectedStatus === item.status

              return (
                <button
                  key={item.status}
                  onClick={() => handleClick(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={[
                    'w-full flex items-center justify-between p-2.5 rounded-lg transition-all',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden
                    />
                    <div className="text-left">
                      <p className="font-mono text-sm text-slate-900 dark:text-white">
                        {formatStatusLabel(item.status)}
                      </p>
                      <div
                        className="w-16 h-1 rounded-full mt-1"
                        style={{ backgroundColor: item.color, opacity: 0.5 }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {item.count}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {percentage}%
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4">
        Click a segment to filter jobs
      </p>
    </div>
  )
}
