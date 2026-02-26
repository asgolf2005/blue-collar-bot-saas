'use client'

import { Customer } from '@/lib/types'
import { format } from 'date-fns'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import BulkActionBar, { BulkActionButton } from '@/components/ui/BulkActionBar'
import { showToast } from '@/lib/utils/toast'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { EmptyCustomers } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'
import ContextMenu from '@/components/ui/ContextMenu'

export default function CustomerTable({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [visibleCustomers, setVisibleCustomers] = useState<Customer[]>(customers)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    setVisibleCustomers(customers)
    setLastFetchedAt(new Date())
  }, [customers])

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  const freshnessLabel = useMemo(() => {
    const ageMs = nowMs - lastFetchedAt.getTime()
    if (ageMs < 30000) return 'Updated just now'
    const minutes = Math.floor(ageMs / 60000)
    if (minutes < 60) return `Updated ${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `Updated ${hours}h ago`
  }, [lastFetchedAt, nowMs])

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useBulkSelection(visibleCustomers)

  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingPortal, setTogglingPortal] = useState<string | null>(null)

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setLastFetchedAt(new Date())
    setTimeout(() => setIsRefreshing(false), 450)
  }

  const handlePortalToggle = async (customerId: string, currentStatus: boolean, customerEmail: string | null) => {
    if (!currentStatus && !customerEmail) {
      showToast.error('Customer must have an email to enable portal access')
      return
    }

    setTogglingPortal(customerId)
    setVisibleCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId
          ? { ...customer, portal_access: !currentStatus }
          : customer
      )
    )
    try {
      const response = await fetch(`/api/customers/${customerId}/portal-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal access')
      }

      showToast.success(
        !currentStatus
          ? `Portal access enabled${data.emailSent ? ' - Login link sent to customer' : ''}`
          : 'Portal access disabled'
      )
      router.refresh()
      setLastFetchedAt(new Date())
    } catch (error) {
      setVisibleCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId
            ? { ...customer, portal_access: currentStatus }
            : customer
        )
      )
      showToast.error(error instanceof Error ? error.message : 'Failed to update portal access')
    } finally {
      setTogglingPortal(null)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCount} customer${selectedCount > 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    const snapshot = visibleCustomers
    setVisibleCustomers((current) => current.filter((customer) => !selectedIds.includes(customer.id)))
    try {
      const response = await fetch('/api/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedIds }),
      })

      if (!response.ok) throw new Error('Failed to delete customers')

      showToast.success(`${selectedCount} customer${selectedCount > 1 ? 's' : ''} deleted successfully`)
      clearSelection()
      router.refresh()
      setLastFetchedAt(new Date())
    } catch (error) {
      setVisibleCustomers(snapshot)
      showToast.error('Failed to delete customers')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkExport = () => {
    const selectedCustomers = visibleCustomers.filter(c => selectedIds.includes(c.id))
    const csv = [
      ['Name', 'Email', 'Phone', 'Address', 'Added'].join(','),
      ...selectedCustomers.map(c => [
        c.name,
        c.email || '',
        c.phone || '',
        c.address || '',
        format(new Date(c.created_at), 'yyyy-MM-dd')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    showToast.success('Customers exported successfully')
  }

  if (visibleCustomers.length === 0) {
    return (
      <div className="p-6">
        <EmptyCustomers
          onCreateCustomer={() => router.push('/admin/customers/new')}
        />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-surface-200 px-6 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {freshnessLabel}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-md border border-surface-300 px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-surface-100"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Portal Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {visibleCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`hover:bg-surface-100 transition-colors ${isSelected(customer.id) ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected(customer.id)}
                      onChange={() => toggleItem(customer.id)}
                      className="w-4 h-4 rounded border-surface-300 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-semibold text-sm border border-primary/20">
                        {customer.name?.charAt(0) || '?'}
                      </div>
                      <div className="font-medium text-ink">{customer.name}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-muted">{customer.phone}</div>
                      {customer.email && (
                        <div className="text-sm text-muted">{customer.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {customer.address ? (
                      <div className="text-sm text-muted line-clamp-2">{customer.address}</div>
                    ) : (
                      <span className="text-sm text-muted">No address</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button type="button"
                      onClick={() => handlePortalToggle(customer.id, customer.portal_access, customer.email)}
                      disabled={togglingPortal === customer.id}
                      className={`
                        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${customer.portal_access
                          ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20'
                          : 'bg-surface-100 text-muted hover:bg-surface-200 border border-surface-200'
                        }
                        ${togglingPortal === customer.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      title={customer.portal_access ? 'Click to disable portal access' : 'Click to enable portal access'}
                    >
                      {customer.portal_access ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-current bg-opacity-50" aria-hidden="true" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-current bg-opacity-30" aria-hidden="true" />
                          Disabled
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ContextMenu
                      items={[
                        {
                          label: 'View Details',
                          onClick: () => router.push(`/admin/customers/${customer.id}`),
                        },
                        {
                          label: 'Edit Customer',
                          onClick: () => router.push(`/admin/customers/${customer.id}`),
                        },
                        {
                          label: customer.portal_access ? 'Disable Portal' : 'Enable Portal',
                          onClick: () => handlePortalToggle(customer.id, customer.portal_access, customer.email),
                          divider: true,
                        },
                        {
                          label: 'Delete',
                          onClick: async () => {
                            if (!confirm('Delete this customer? This cannot be undone.')) return

                            const snapshot = visibleCustomers
                            setVisibleCustomers((current) => current.filter((item) => item.id !== customer.id))

                            try {
                              const response = await fetch(`/api/customers/${customer.id}`, {
                                method: 'DELETE',
                              })
                              if (!response.ok) throw new Error('Failed to delete customer')
                              showToast.success('Customer deleted successfully')
                              router.refresh()
                              setLastFetchedAt(new Date())
                            } catch (error) {
                              setVisibleCustomers(snapshot)
                              showToast.error('Failed to delete customer')
                            }
                          },
                          variant: 'danger',
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      <BulkActionBar selectedCount={selectedCount} onClear={clearSelection}>
        <BulkActionButton
          label="Export"
          onClick={handleBulkExport}
        />
        <BulkActionButton
          label={isDeleting ? 'Deleting...' : 'Delete'}
          onClick={handleBulkDelete}
          variant="danger"
        />
      </BulkActionBar>
    </>
  )
}
