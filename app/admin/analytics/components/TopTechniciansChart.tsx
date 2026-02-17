'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface TechnicianData {
  id: string
  name: string
  jobs: number
  revenue: number
  avatar?: string
  completedJobs: number
  totalJobs: number
}

interface TopTechniciansChartProps {
  data: TechnicianData[]
  onTechnicianClick: (tech: TechnicianData) => void
}

function CustomTooltip({ 
  active, 
  payload, 
}: { 
  active?: boolean
  payload?: any[]
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TechnicianData
    return (
      <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="font-mono text-sm font-semibold text-white mb-1">{data.name}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">Jobs:</span>
            <span className="font-mono text-sm text-cyan-400">{data.jobs}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">Revenue:</span>
            <span className="font-mono text-sm text-emerald-400">${data.revenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function TopTechniciansChart({ data, onTechnicianClick }: TopTechniciansChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleClick = (tech: TechnicianData) => {
    setSelectedId(selectedId === tech.id ? null : tech.id)
    onTechnicianClick(tech)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-slate-900 dark:text-white tracking-wide">
            TOP TECHNICIANS
          </h2>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ranked by jobs completed
          </p>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(148, 163, 184, 0.2)" 
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fontFamily: 'Inter', fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar 
              dataKey="jobs" 
              radius={[0, 4, 4, 0]}
              onClick={handleClick}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={hoveredIndex === index ? '#22d3ee' : 'url(#barGradient)'}
                  stroke={selectedId === entry.id ? '#22d3ee' : 'none'}
                  strokeWidth={selectedId === entry.id ? 2 : 0}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tech List Below Chart */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {data.map((tech) => (
            <button type="button"
              key={tech.id}
              onClick={() => handleClick(tech)}
              className={`
                flex flex-col items-center p-3 rounded-lg transition-all
                ${selectedId === tech.id 
                  ? 'bg-cyan-50 dark:bg-cyan-400/10 ring-1 ring-cyan-400' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }
              `}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-mono text-sm font-semibold">
                {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <p className="font-mono text-xs text-slate-900 dark:text-white mt-2 truncate w-full text-center">
                {tech.name.split(' ')[0]}
              </p>
              <p className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                {tech.jobs} jobs
              </p>
            </button>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3">
        Click bar to see technician details
      </p>
    </div>
  )
}
