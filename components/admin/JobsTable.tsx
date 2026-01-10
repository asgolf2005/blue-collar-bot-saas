'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronRight, Trash2, UserCheck, RefreshCw, Edit, Eye, Copy } from 'lucide-react'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import BulkActionBar, { BulkActionButton } from '@/components/ui/BulkActionBar'
import ContextMenu, { ContextMenuItem } from '@/components/ui/ContextMenu'
import { showToast } from '@/lib/utils/toast'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Job {
  id: string
  status: string
  description: string
  scheduled_start: string
  customer: {
    id: string
    name: string
    phone: string
  }
  technician?: {
    full_name: string
  }
}

interface JobsTableProps {
  jobs: Job[]
  getStatusColor: (status: string) => string
  formatStatus: (status: string) => string
}

export default function JobsTable({ jobs, getStatusColor, formatStatus }: JobsTableProps) {
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

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return
    }

    try {
      const response = await fetch('/api/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: [jobId] }),
      })

      if (!response.ok) throw new Error('Failed to delete job')

      showToast.success('Job deleted successfully')
      window.location.reload()
    } catch (error) {
      showToast.error('Failed to delete job')
    }
  }

  const handleDuplicateJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/jobs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
        }),
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

  const getContextMenuItems = (job: Job): ContextMenuItem[] => [
    {
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => router.push(`/admin/jobs/${job.id}`),
    },
    {
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => router.push(`/admin/jobs/${job.id}`),
    },
    {
      label: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => handleDuplicateJob(job.id),
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => handleDeleteJob(job.id),
      variant: 'danger' as const,
      divider: true,
    },
  ]

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={input => {
                    if (input) input.indeterminate = isSomeSelected
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Service</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Date</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {jobs.slice(0, 10).map((job) => (
              <tr
                key={job.id}
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${
                  isSelected(job.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected(job.id)}
                    onChange={() => toggleItem(job.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                </td>
                <td className="px-6 py-4">
                  {job.customer?.id ? (
                    <Link
                      href={`/admin/customers/${job.customer.id}`}
                      className="flex items-center gap-3 hover:opacity-80 focus:opacity-80 transition"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                        {job.customer?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{job.customer?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{job.customer?.phone || ''}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                        {job.customer?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{job.customer?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{job.customer?.phone || ''}</div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                    {job.description || 'Service'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-500">
                    {job.scheduled_start ? format(new Date(job.scheduled_start), 'MMM d, h:mm a') : '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
                    {formatStatus(job.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <ContextMenu items={getContextMenuItems(job)} align="right" />
                  </div>
                </td>
              </tr>
            ))}
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
