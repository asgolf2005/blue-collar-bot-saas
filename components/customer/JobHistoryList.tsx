'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { Job, JobStatus } from '@/lib/types'

interface JobWithCustomer extends Omit<Job, 'customer' | 'technician'> {
  customer: {
    name: string
    address: string | null
  }
  technician?: {
    full_name: string
  } | null
}

interface JobHistoryListProps {
  jobs: JobWithCustomer[]
  showFilters?: boolean
  showSearch?: boolean
}

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: 'text-primary', bg: 'bg-primary/10' },
  on_the_way: { label: 'On the Way', color: 'text-warning', bg: 'bg-warning/10' },
  arrived: { label: 'Arrived', color: 'text-info', bg: 'bg-info/10' },
  in_progress: { label: 'In Progress', color: 'text-warning', bg: 'bg-warning/10' },
  completed: { label: 'Completed', color: 'text-success', bg: 'bg-success/10' },
  cancelled: { label: 'Cancelled', color: 'text-danger', bg: 'bg-danger/10' },
}

export default function JobHistoryList({
  jobs,
  showFilters = true,
  showSearch = true
}: JobHistoryListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  const filteredJobs = useMemo(() => {
    let result = [...jobs]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(job =>
        job.description?.toLowerCase().includes(query) ||
        job.customer.name.toLowerCase().includes(query) ||
        job.customer.address?.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(job => job.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.scheduled_start).getTime()
      const dateB = new Date(b.scheduled_start).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [jobs, searchQuery, statusFilter, sortOrder])

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div>
      {/* Search and Filter Bar */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          {showSearch && (
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-100 border border-surface-200 rounded-lg text-ink placeholder:text-muted focus:ring-primary/15 focus:border-primary/40 transition"
              />
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
                className="h-11 rounded-lg border border-surface-200 bg-surface-100 px-3 text-sm text-ink focus:ring-primary/15 focus:border-primary/40 transition"
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                {(Object.keys(statusConfig) as JobStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {statusConfig[status].label}
                  </option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="h-11 rounded-lg border border-surface-200 bg-surface-100 px-3 text-sm text-ink focus:ring-primary/15 focus:border-primary/40 transition"
                aria-label="Sort order"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted mb-4">
        {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
      </p>

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted">No jobs found</p>
          {searchQuery && (
            <button type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-primary hover:text-primary/80 text-sm transition"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/customer/appointments/${job.id}`}
              className="card p-5 block hover:shadow-elevation-2 transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[job.status].bg} ${statusConfig[job.status].color}`}>
                      {statusConfig[job.status].label}
                    </span>
                    {job.total_cost && (
                      <span className="text-sm font-medium text-ink">
                        {formatCurrency(job.total_cost)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <h3 className="font-medium text-ink group-hover:text-primary transition-colors">
                    {job.description || 'Service appointment'}
                  </h3>

                  {/* Date and Time */}
                  <div className="mt-2 text-sm text-muted">
                    {format(new Date(job.scheduled_start), 'EEEE, MMMM d, yyyy')}
                    <span className="mx-2">|</span>
                    {format(new Date(job.scheduled_start), 'h:mm a')}
                  </div>

                  {/* Technician */}
                  {job.technician && (
                    <p className="mt-1 text-sm text-muted">
                      Technician: {job.technician.full_name}
                    </p>
                  )}
                </div>

                {/* View Arrow */}
                <div className="text-sm font-medium text-muted group-hover:text-primary transition-colors">View</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
