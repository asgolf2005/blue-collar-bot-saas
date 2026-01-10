'use client'

import { useState } from 'react'
import { Search, Filter, X, Users, MapPin, DollarSign, Activity, Briefcase } from 'lucide-react'

interface CustomerFiltersProps {
  onFilterChange: (filters: CustomerFilterState) => void
  totalCount: number
  filteredCount: number
  technicians: Array<{ id: string; full_name: string }>
  locations: string[]
}

export interface CustomerFilterState {
  search: string
  sortBy: string
  portalAccess: string
  activityStatus: string
  jobStatus: string
  technician: string
  invoiceStatus: string
  location: string
}

export default function CustomerFilters({ onFilterChange, totalCount, filteredCount, technicians, locations }: CustomerFiltersProps) {
  const [filters, setFilters] = useState<CustomerFilterState>({
    search: '',
    sortBy: 'newest',
    portalAccess: 'all',
    activityStatus: 'all',
    jobStatus: 'all',
    technician: 'all',
    invoiceStatus: 'all',
    location: 'all',
  })

  const updateFilter = (key: keyof CustomerFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const cleared: CustomerFilterState = {
      search: '',
      sortBy: 'newest',
      portalAccess: 'all',
      activityStatus: 'all',
      jobStatus: 'all',
      technician: 'all',
      invoiceStatus: 'all',
      location: 'all',
    }
    setFilters(cleared)
    onFilterChange(cleared)
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.sortBy !== 'newest' ||
    filters.portalAccess !== 'all' ||
    filters.activityStatus !== 'all' ||
    filters.jobStatus !== 'all' ||
    filters.technician !== 'all' ||
    filters.invoiceStatus !== 'all' ||
    filters.location !== 'all'

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
  ]

  const portalAccessOptions = [
    { value: 'all', label: 'All Customers', color: 'text-muted', bgColor: 'hover:bg-surface-100' },
    { value: 'enabled', label: 'Portal Enabled', color: 'text-success', bgColor: 'hover:bg-success/10' },
    { value: 'disabled', label: 'Portal Disabled', color: 'text-muted', bgColor: 'hover:bg-surface-100' },
  ]

  const activityStatusOptions = [
    { value: 'all', label: 'All Activity', color: 'text-muted', bgColor: 'hover:bg-surface-100' },
    { value: 'active', label: 'Active (0-90 days)', color: 'text-success', bgColor: 'hover:bg-success/10' },
    { value: 'at-risk', label: 'At-Risk (90-180 days)', color: 'text-warning', bgColor: 'hover:bg-warning/10' },
    { value: 'inactive', label: 'Inactive (180+ days)', color: 'text-danger', bgColor: 'hover:bg-danger/10' },
    { value: 'new', label: 'New (No Jobs)', color: 'text-info', bgColor: 'hover:bg-info/10' },
  ]

  const jobStatusOptions = [
    { value: 'all', label: 'All Jobs' },
    { value: 'scheduled', label: 'Has Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Has Completed' },
  ]

  const invoiceStatusOptions = [
    { value: 'all', label: 'All Invoices' },
    { value: 'unpaid', label: 'Has Unpaid' },
    { value: 'paid', label: 'All Paid' },
    { value: 'never', label: 'Never Invoiced' },
  ]

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Filter & Search</h3>
            <p className="text-xs text-muted">
              Showing {filteredCount} of {totalCount} customers
            </p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="glass-btn-ghost glass-btn-sm"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Activity Status Filter Pills */}
      <div className="mb-4">
        <label className="text-xs text-muted uppercase tracking-wider font-medium mb-3 block">
          Activity Status
        </label>
        <div className="flex flex-wrap gap-2">
          {activityStatusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter('activityStatus', option.value)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${filters.activityStatus === option.value
                  ? `${option.color} bg-opacity-100 ring-2 ring-current ring-opacity-20 shadow-elevation-1`
                  : `text-muted ${option.bgColor}`
                }
              `}
            >
              {option.label}
              {filters.activityStatus === option.value && option.value !== 'all' && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-current bg-opacity-20 text-xs">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Portal Access Filter Pills */}
      <div className="mb-4">
        <label className="text-xs text-muted uppercase tracking-wider font-medium mb-3 block">
          Portal Access
        </label>
        <div className="flex flex-wrap gap-2">
          {portalAccessOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter('portalAccess', option.value)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${filters.portalAccess === option.value
                  ? `${option.color} bg-opacity-100 ring-2 ring-current ring-opacity-20 shadow-elevation-1`
                  : `text-muted ${option.bgColor}`
                }
              `}
            >
              {option.label}
              {filters.portalAccess === option.value && option.value !== 'all' && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-current bg-opacity-20 text-xs">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Sort Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <label className="text-xs text-muted uppercase tracking-wider font-medium mb-2 block">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search by name, phone, email, or address..."
              className="glass-input pl-11 w-full"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            )}
          </div>
        </div>

        {/* Sort Filter */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-medium mb-2 block">
            Sort By
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10" />
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="select pl-11 w-full appearance-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Additional Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {/* Job Status Filter */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-medium mb-2 block">
            Job Status
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10" />
            <select
              value={filters.jobStatus}
              onChange={(e) => updateFilter('jobStatus', e.target.value)}
              className="select pl-11 w-full appearance-none"
            >
              {jobStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Technician Filter */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-medium mb-2 block">
            Technician
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10" />
            <select
              value={filters.technician}
              onChange={(e) => updateFilter('technician', e.target.value)}
              className="select pl-11 w-full appearance-none"
            >
              <option value="all">All Technicians</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Invoice Status Filter */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-medium mb-2 block">
            Invoice Status
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10" />
            <select
              value={filters.invoiceStatus}
              onChange={(e) => updateFilter('invoiceStatus', e.target.value)}
              className="select pl-11 w-full appearance-none"
            >
              {invoiceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location Filter */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-medium mb-2 block">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10" />
            <select
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="select pl-11 w-full appearance-none"
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-6 pt-6 border-t border-surface-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted font-medium">Active filters:</span>
            {filters.portalAccess !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                Portal: {portalAccessOptions.find(s => s.value === filters.portalAccess)?.label}
                <button onClick={() => updateFilter('portalAccess', 'all')} className="hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-info/10 text-info text-xs font-medium">
                Sort: {sortOptions.find(s => s.value === filters.sortBy)?.label}
                <button onClick={() => updateFilter('sortBy', 'newest')} className="hover:bg-info/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
