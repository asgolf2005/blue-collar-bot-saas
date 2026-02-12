'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Wrench,
  Flame,
  Droplets,
  Zap,
  Home,
  Bath,
  RotateCcw,
  AlertTriangle,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react'

interface ServiceData {
  id: string
  name: string
  icon: string
  revenue: number
  jobs: number
  avgTicket: number
  trend: number
}

type SortField = 'name' | 'revenue' | 'jobs' | 'avgTicket' | 'trend'
type SortDirection = 'asc' | 'desc'

interface ServiceBreakdownTableProps {
  data: ServiceData[]
  onRowClick: (service: ServiceData) => void
  onExport: () => void
}

const serviceIcons: Record<string, LucideIcon> = {
  toilet: Bath,
  heater: Flame,
  drain: RotateCcw,
  electrical: Zap,
  leak: Droplets,
  pipe: Droplets,
  repair: Wrench,
  emergency: AlertTriangle,
  install: PlusCircle,
  general: Home,
}

const serviceIconStyles: Record<string, string> = {
  toilet: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  heater: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  drain: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  electrical: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  leak: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  pipe: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  repair: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300',
  emergency: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  install: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  general: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
}

function resolveServiceIconKey(service: ServiceData): string {
  if (serviceIcons[service.icon]) return service.icon

  const name = service.name.toLowerCase()
  if (/\b(toilet|bathroom|wc|restroom|lavatory)\b/.test(name)) return 'toilet'
  if (/\b(pipe|leak|faucet|plumbing|water|flow)\b/.test(name)) return 'leak'
  if (/\b(drain|clog|sewer|blockage|backup)\b/.test(name)) return 'drain'
  if (/\b(heater|hot water|boiler|tank|heating|warm)\b/.test(name)) return 'heater'
  if (/\b(install|installation|new|setup|replacement)\b/.test(name)) return 'install'
  if (/\b(emergency|urgent|rush|asap|immediate)\b/.test(name)) return 'emergency'
  if (/\b(repair|fix|maintenance|service|inspect)\b/.test(name)) return 'repair'
  return 'general'
}

export default function ServiceBreakdownTable({
  data,
  onRowClick,
  onExport,
}: ServiceBreakdownTableProps) {
  const [sortField, setSortField] = useState<SortField>('revenue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: number | string = a[sortField]
      let bValue: number | string = b[sortField]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue as string).toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [data, sortField, sortDirection])

  const handleRowClick = (service: ServiceData) => {
    setSelectedId(selectedId === service.id ? null : service.id)
    onRowClick(service)
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-500" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-500" />
    )
  }

  const totalRevenue = data.reduce((sum, s) => sum + s.revenue, 0)
  const totalJobs = data.reduce((sum, s) => sum + s.jobs, 0)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display text-2xl text-slate-900 dark:text-white tracking-wide">
            SERVICE PERFORMANCE
          </h2>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Revenue breakdown by service type
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-2">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Service
                  {renderSortIcon('name')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('revenue')}
                  className="flex items-center justify-end gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                >
                  Revenue
                  {renderSortIcon('revenue')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('jobs')}
                  className="flex items-center justify-end gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                >
                  Jobs
                  {renderSortIcon('jobs')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('avgTicket')}
                  className="flex items-center justify-end gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                >
                  Avg Ticket
                  {renderSortIcon('avgTicket')}
                </button>
              </th>
              <th className="text-right py-3 px-2">
                <button
                  onClick={() => handleSort('trend')}
                  className="flex items-center justify-end gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto"
                >
                  Trend
                  {renderSortIcon('trend')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((service, index) => {
              const iconKey = resolveServiceIconKey(service)
              const Icon = serviceIcons[iconKey] || Home
              const iconStyle = serviceIconStyles[iconKey] || serviceIconStyles.general
              const revenueShare = totalRevenue > 0 ? (service.revenue / totalRevenue) * 100 : 0

              return (
                <tr
                  key={service.id}
                  onClick={() => handleRowClick(service)}
                  className={`
                    border-b border-slate-100 dark:border-slate-800/50 transition-colors cursor-pointer
                    ${selectedId === service.id ? 'bg-cyan-50 dark:bg-cyan-400/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}
                    ${index === sortedData.length - 1 ? 'border-b-0' : ''}
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${iconStyle}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-slate-900 dark:text-white">{service.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 rounded-full transition-all"
                              style={{ width: `${revenueShare}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{revenueShare.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      ${service.revenue.toLocaleString()}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{service.jobs}</p>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300">${service.avgTicket}</p>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span
                      className={`
                        font-mono text-xs font-medium
                        ${service.trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}
                        ${service.trend < 0 ? 'text-rose-600 dark:text-rose-400' : ''}
                        ${service.trend === 0 ? 'text-slate-500' : ''}
                      `}
                    >
                      {service.trend > 0 ? '+' : ''}
                      {service.trend}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <td className="py-3 px-2">
                <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">Total</p>
              </td>
              <td className="py-3 px-2 text-right">
                <p className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  ${totalRevenue.toLocaleString()}
                </p>
              </td>
              <td className="py-3 px-2 text-right">
                <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{totalJobs}</p>
              </td>
              <td className="py-3 px-2 text-right">
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  ${totalJobs > 0 ? Math.round(totalRevenue / totalJobs) : 0}
                </p>
              </td>
              <td className="py-3 px-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
