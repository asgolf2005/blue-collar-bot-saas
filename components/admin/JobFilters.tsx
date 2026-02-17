'use client'

import { useState } from 'react'

interface JobFiltersProps {
  onFilterChange: (filters: FilterState) => void
  technicians?: Array<{ id: string; full_name: string }>
  totalCount: number
  filteredCount: number
}

export interface FilterState {
  status: string
  search: string
  technician: string
  dateRange: string
}

export default function JobFilters({ onFilterChange, technicians = [], totalCount, filteredCount }: JobFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    search: '',
    technician: 'all',
    dateRange: 'all',
  })

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const cleared: FilterState = {
      status: 'all',
      search: '',
      technician: 'all',
      dateRange: 'all',
    }
    setFilters(cleared)
    onFilterChange(cleared)
  }

  const hasActiveFilters = filters.status !== 'all' || filters.search !== '' || filters.technician !== 'all' || filters.dateRange !== 'all'

  const statusOptions = [
    { value: 'all', label: 'All', color: 'text-muted', bgColor: 'hover:bg-surface-100', selectedBg: 'bg-surface-200', ringColor: 'ring-surface-400' },
    { value: 'scheduled', label: 'Scheduled', color: 'text-primary', bgColor: 'hover:bg-primary/10', selectedBg: 'bg-primary/10', ringColor: 'ring-primary/30' },
    { value: 'in_progress', label: 'Active', color: 'text-warning', bgColor: 'hover:bg-warning/10', selectedBg: 'bg-warning/10', ringColor: 'ring-warning/30' },
    { value: 'completed', label: 'Completed', color: 'text-success', bgColor: 'hover:bg-success/10', selectedBg: 'bg-success/10', ringColor: 'ring-success/30' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-danger', bgColor: 'hover:bg-danger/10', selectedBg: 'bg-danger/10', ringColor: 'ring-danger/30' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink dark:text-white">Filters</h3>
          <p className="text-sm text-muted dark:text-gray-400 mt-0.5">
            {filteredCount} of {totalCount} jobs
          </p>
        </div>
        {hasActiveFilters && (
          <button type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-muted dark:text-gray-400 hover:text-danger dark:hover:text-danger transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search jobs..."
          className="w-full px-4 pr-10 py-2.5 rounded-lg bg-white dark:bg-white border border-surface-200 dark:border-slate-300 text-ink dark:text-ink placeholder-muted dark:placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
        />
        {filters.search && (
          <button type="button"
            onClick={() => updateFilter('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted dark:text-gray-400 hover:text-ink dark:hover:text-white"
          >
            <span className="text-xs font-semibold">x</span>
          </button>
        )}
      </div>

      {/* Status & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status */}
        <div>
          <label className="text-xs font-medium text-muted dark:text-gray-400 mb-2 block">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white border border-surface-200 dark:border-slate-300 text-ink dark:text-ink text-sm appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Technician */}
        <div>
          <label className="text-xs font-medium text-muted dark:text-gray-400 mb-2 block">
            Technician
          </label>
          <select
            value={filters.technician}
            onChange={(e) => updateFilter('technician', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white border border-surface-200 dark:border-slate-300 text-ink dark:text-ink text-sm appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          >
            <option value="all">All</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="text-xs font-medium text-muted dark:text-gray-400 mb-2 block">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white border border-surface-200 dark:border-slate-300 text-ink dark:text-ink text-sm appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Active Filters Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 dark:bg-white text-primary text-xs font-medium">
              {statusOptions.find(s => s.value === filters.status)?.label}
              <button type="button" onClick={() => updateFilter('status', 'all')} className="hover:bg-primary/20 dark:hover:bg-slate-200 rounded p-0.5">
                <span className="text-[10px] font-semibold">x</span>
              </button>
            </span>
          )}
          {filters.technician !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-info/10 dark:bg-white text-info text-xs font-medium">
              {technicians.find(t => t.id === filters.technician)?.full_name || 'Unknown'}
              <button type="button" onClick={() => updateFilter('technician', 'all')} className="hover:bg-info/20 dark:hover:bg-slate-200 rounded p-0.5">
                <span className="text-[10px] font-semibold">x</span>
              </button>
            </span>
          )}
          {filters.dateRange !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10 dark:bg-white text-success text-xs font-medium">
              {filters.dateRange}
              <button type="button" onClick={() => updateFilter('dateRange', 'all')} className="hover:bg-success/20 dark:hover:bg-slate-200 rounded p-0.5">
                <span className="text-[10px] font-semibold">x</span>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
