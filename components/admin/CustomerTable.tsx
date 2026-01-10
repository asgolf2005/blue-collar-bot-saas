'use client'

import { Customer } from '@/lib/types'
import { format } from 'date-fns'
import { Phone, Mail, MapPin, Trash2, Download, Lock, LockOpen, Edit, Eye } from 'lucide-react'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import BulkActionBar, { BulkActionButton } from '@/components/ui/BulkActionBar'
import { showToast } from '@/lib/utils/toast'
import { useState } from 'react'
import Link from 'next/link'
import { EmptyCustomers } from '@/components/ui/EmptyState'
import { useRouter } from 'next/navigation'
import ContextMenu from '@/components/ui/ContextMenu'

export default function CustomerTable({ customers }: { customers: Customer[] }) {
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
  } = useBulkSelection(customers)

  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingPortal, setTogglingPortal] = useState<string | null>(null)

  const handlePortalToggle = async (customerId: string, currentStatus: boolean, customerEmail: string | null) => {
    if (!currentStatus && !customerEmail) {
      showToast.error('Customer must have an email to enable portal access')
      return
    }

    setTogglingPortal(customerId)
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

      // Refresh the page to show updated status
      router.refresh()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to update portal access')
    } finally {
      setTogglingPortal(null)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} customer${selectedCount > 1 ? 's' : ''}?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedIds }),
      })

      if (!response.ok) throw new Error('Failed to delete customers')

      showToast.success(`${selectedCount} customer${selectedCount > 1 ? 's' : ''} deleted successfully`)
      clearSelection()
      window.location.reload()
    } catch (error) {
      showToast.error('Failed to delete customers')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkExport = () => {
    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))
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

  if (customers.length === 0) {
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
              {customers.map((customer) => (
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
                      <div className="flex items-center text-sm text-muted">
                        <Phone className="w-4 h-4 mr-2 text-muted" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center text-sm text-muted">
                          <Mail className="w-4 h-4 mr-2 text-muted" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {customer.address ? (
                      <div className="flex items-center text-sm text-muted">
                        <MapPin className="w-4 h-4 mr-2 text-muted shrink-0" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted">No address</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
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
                          <LockOpen className="w-3.5 h-3.5" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
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
                          icon: <Eye className="w-4 h-4" />,
                          onClick: () => router.push(`/admin/customers/${customer.id}`),
                        },
                        {
                          label: 'Edit Customer',
                          icon: <Edit className="w-4 h-4" />,
                          onClick: () => router.push(`/admin/customers/${customer.id}`),
                        },
                        {
                          label: customer.portal_access ? 'Disable Portal' : 'Enable Portal',
                          icon: customer.portal_access ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />,
                          onClick: () => handlePortalToggle(customer.id, customer.portal_access, customer.email),
                          divider: true,
                        },
                        {
                          label: 'Delete',
                          icon: <Trash2 className="w-4 h-4" />,
                          onClick: async () => {
                            if (!confirm('Are you sure you want to delete this customer?')) return

                            try {
                              const response = await fetch(`/api/customers/${customer.id}`, {
                                method: 'DELETE',
                              })
                              if (!response.ok) throw new Error('Failed to delete customer')
                              showToast.success('Customer deleted successfully')
                              router.refresh()
                            } catch (error) {
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
          icon={<Download className="w-4 h-4" />}
          label="Export"
          onClick={handleBulkExport}
        />
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
