'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronRight, Trash2, Edit, Eye, Copy } from '@/components/ui/icons'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import BulkActionBar, { BulkActionButton } from '@/components/ui/BulkActionBar'
import { showToast } from '@/lib/utils/toast'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ContextMenu from '@/components/ui/ContextMenu'
import type { JobWithDetails } from '@/lib/types'

interface PremiumJobsTableProps {
  jobs: JobWithDetails[]
}

const getServiceLabel = (job: JobWithDetails) => {
  const names = job.services
    ?.map((item) => item.service?.name)
    .filter((name): name is string => Boolean(name))

  return names && names.length > 0 ? names.join(', ') : ''
}

export default function PremiumJobsTable({ jobs }: PremiumJobsTableProps) {
  const router = useRouter()
  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useBulkSelection(jobs)

  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete job')

      showToast.success('Job deleted successfully')
      router.refresh()
    } catch (error) {
      showToast.error('Failed to delete job')
    }
  }

  const handleDuplicate = async (jobId: string) => {
    try {
      const response = await fetch('/api/jobs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to duplicate job')
      if (!result?.jobId) throw new Error('Missing jobId')

      showToast.withAction(
        'Job duplicated successfully',
        { label: 'View', onClick: () => router.push(`/admin/jobs/${result.jobId}`) },
        'success'
      )
      router.refresh()
    } catch (error) {
      showToast.error('Failed to duplicate job')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} job${selectedCount > 1 ? 's' : ''}?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: selectedIds }),
      })

      if (!response.ok) throw new Error('Failed to delete jobs')

      showToast.success(`${selectedCount} job${selectedCount > 1 ? 's' : ''} deleted successfully`)
      clearSelection()
      window.location.reload()
    } catch (error) {
      showToast.error('Failed to delete jobs')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: { class: 'badge-completed', label: 'Completed' },
      in_progress: { class: 'badge-in-progress', label: 'In Progress' },
      on_the_way: { class: 'badge-in-progress', label: 'On The Way' },
      arrived: { class: 'badge-in-progress', label: 'Arrived' },
      scheduled: { class: 'badge-scheduled', label: 'Scheduled' },
      cancelled: { class: 'badge-cancelled', label: 'Cancelled' },
    }
    return badges[status as keyof typeof badges] || badges.scheduled
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={input => {
                    if (input) input.indeterminate = isSomeSelected
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary focus:ring-offset-0 accent-primary"
                />
              </th>
              <th>Customer</th>
              <th>Service</th>
              <th>Technician</th>
              <th>Scheduled</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-ink font-medium mb-1">No jobs found</p>
                    <p className="text-muted text-sm">Try adjusting your filters or create a new job</p>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const statusBadge = getStatusBadge(job.status)
                const serviceLabel = getServiceLabel(job)
                return (
                  <tr
                    key={job.id}
                    className={`group ${
                      isSelected(job.id) ? 'bg-primary/5 hover:bg-primary/8' : ''
                    }`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected(job.id)}
                        onChange={() => toggleItem(job.id)}
                        className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary focus:ring-offset-0 accent-primary"
                      />
                    </td>

                    {/* Customer */}
                    <td>
                      {job.customer?.id ? (
                        <Link
                          href={`/admin/customers/${job.customer.id}`}
                          className="flex items-center gap-3 hover:opacity-80 focus:opacity-80 transition"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm shadow-elevation-1">
                            {job.customer?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-ink">
                              {job.customer?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-muted">
                              {job.customer?.phone || 'No phone'}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm shadow-elevation-1">
                            {job.customer?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-ink">
                              {job.customer?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-muted">
                              {job.customer?.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Service */}
                    <td>
                      <div className="text-sm text-ink max-w-[200px] truncate">
                        {job.description || serviceLabel || 'Service'}
                      </div>
                    </td>

                    {/* Technician */}
                    <td>
                      {job.technician ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-success font-semibold text-xs">
                            {job.technician.full_name?.charAt(0)}
                          </div>
                          <span className="text-sm text-ink">
                            {job.technician.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted italic">Unassigned</span>
                      )}
                    </td>

                    {/* Scheduled */}
                    <td>
                      <div className="text-sm text-muted">
                        {job.scheduled_start ? (
                          <>
                            <div className="text-ink font-medium">
                              {format(new Date(job.scheduled_start), 'MMM d')}
                            </div>
                            <div className="text-xs">
                              {format(new Date(job.scheduled_start), 'h:mm a')}
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td>
                      {job.total_cost ? (
                        <span className="money money-positive">
                          ${job.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted text-sm">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ContextMenu
                          items={[
                            {
                              label: 'View Details',
                              icon: <Eye className="w-4 h-4" />,
                              onClick: () => router.push(`/admin/jobs/${job.id}`),
                            },
                            {
                              label: 'Edit Job',
                              icon: <Edit className="w-4 h-4" />,
                              onClick: () => router.push(`/admin/jobs/${job.id}`),
                            },
                            {
                              label: 'Duplicate',
                              icon: <Copy className="w-4 h-4" />,
                              onClick: () => handleDuplicate(job.id),
                              divider: true,
                            },
                            {
                              label: 'Delete',
                              icon: <Trash2 className="w-4 h-4" />,
                              onClick: () => handleDelete(job.id),
                              variant: 'danger',
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <BulkActionBar selectedCount={selectedCount} onClear={clearSelection}>
        <BulkActionButton
          icon={<Trash2 className="w-4 h-4" />}
          label={isDeleting ? 'Deleting...' : 'Delete'}
          onClick={handleBulkDelete}
          variant="danger"
        />
      </BulkActionBar>
    </>
  )
}

