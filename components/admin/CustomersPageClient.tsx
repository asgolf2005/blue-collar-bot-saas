'use client'

import { useState, useMemo } from 'react'
import { Customer } from '@/lib/types'
import CustomerFilters, { CustomerFilterState } from './CustomerFilters'
import CustomerTable from './CustomerTable'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { MeshBackground } from '@/components/ui/effects'

interface CustomerWithJobs extends Customer {
  jobs?: Array<{
    id: string
    status: string
    scheduled_start: string
    technician_id: string | null
    technician?: {
      id: string
      full_name: string
    } | null
  }>
}

interface Invoice {
  customer_id: string
  status: string
  total: number
}

interface CustomersPageClientProps {
  customers: CustomerWithJobs[]
  invoices: Invoice[]
  technicians: Array<{ id: string; full_name: string }>
}

export default function CustomersPageClient({ customers, invoices, technicians }: CustomersPageClientProps) {
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

  // Extract unique locations from customer addresses
  const locations = useMemo(() => {
    const uniqueLocations = new Set<string>()
    customers.forEach(customer => {
      if (customer.address) {
        // Extract city from address (simple approach - take last part before zip)
        const parts = customer.address.split(',')
        if (parts.length > 1) {
          const city = parts[parts.length - 2].trim()
          if (city) uniqueLocations.add(city)
        }
      }
    })
    return Array.from(uniqueLocations).sort()
  }, [customers])

  // Helper function to calculate activity status
  const getActivityStatus = (customer: CustomerWithJobs): string => {
    if (!customer.jobs || customer.jobs.length === 0) {
      return 'new'
    }

    // Find most recent job
    const mostRecentJob = customer.jobs.reduce((latest, job) => {
      const jobDate = new Date(job.scheduled_start)
      const latestDate = latest ? new Date(latest.scheduled_start) : new Date(0)
      return jobDate > latestDate ? job : latest
    }, null as typeof customer.jobs[0] | null)

    if (!mostRecentJob) return 'new'

    const daysSinceLastJob = Math.floor(
      (Date.now() - new Date(mostRecentJob.scheduled_start).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastJob <= 90) return 'active'
    if (daysSinceLastJob <= 180) return 'at-risk'
    return 'inactive'
  }

  // Helper function to check invoice status
  const getInvoiceStatus = (customerId: string): 'unpaid' | 'paid' | 'never' => {
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId)
    if (customerInvoices.length === 0) return 'never'

    const hasUnpaid = customerInvoices.some(inv => inv.status !== 'paid')
    return hasUnpaid ? 'unpaid' : 'paid'
  }

  // Apply filters and sorting
  const filteredCustomers = useMemo(() => {
    let result = [...customers]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(customer => {
        const name = customer.name?.toLowerCase() || ''
        const phone = customer.phone?.toLowerCase() || ''
        const email = customer.email?.toLowerCase() || ''
        const address = customer.address?.toLowerCase() || ''

        return (
          name.includes(searchLower) ||
          phone.includes(searchLower) ||
          email.includes(searchLower) ||
          address.includes(searchLower)
        )
      })
    }

    // Activity status filter
    if (filters.activityStatus !== 'all') {
      result = result.filter(customer => getActivityStatus(customer) === filters.activityStatus)
    }

    // Portal access filter
    if (filters.portalAccess !== 'all') {
      if (filters.portalAccess === 'enabled') {
        result = result.filter(customer => customer.portal_access === true)
      } else if (filters.portalAccess === 'disabled') {
        result = result.filter(customer => customer.portal_access === false)
      }
    }

    // Job status filter
    if (filters.jobStatus !== 'all') {
      result = result.filter(customer => {
        if (!customer.jobs) return false
        return customer.jobs.some(job => {
          if (filters.jobStatus === 'in_progress') {
            return ['in_progress', 'on_the_way', 'arrived'].includes(job.status)
          }
          return job.status === filters.jobStatus
        })
      })
    }

    // Technician filter
    if (filters.technician !== 'all') {
      result = result.filter(customer => {
        if (!customer.jobs) return false
        return customer.jobs.some(job => job.technician_id === filters.technician)
      })
    }

    // Invoice status filter
    if (filters.invoiceStatus !== 'all') {
      result = result.filter(customer => getInvoiceStatus(customer.id) === filters.invoiceStatus)
    }

    // Location filter
    if (filters.location !== 'all') {
      result = result.filter(customer => {
        if (!customer.address) return false
        return customer.address.includes(filters.location)
      })
    }

    // Sorting
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name-asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        break
      case 'name-desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
        break
    }

    return result
  }, [customers, filters, invoices])

  return (
    <>
      <MeshBackground variant="default" />

      <div className="space-y-6 animate-fade-in relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-elevation-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">Customer Management</h1>
            </div>
            <p className="text-muted">Manage your customer database and contacts</p>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/admin/customers/new"
              className="glass-btn-primary"
            >
              <Plus className="w-5 h-5" />
              New Customer
            </Link>
          </div>
        </div>

        {/* Filters */}
        <CustomerFilters
          onFilterChange={setFilters}
          totalCount={customers.length}
          filteredCount={filteredCustomers.length}
          technicians={technicians}
          locations={locations}
        />

        {/* Customer Table */}
        <div className="glass-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">All Customers</h2>
                <p className="text-muted text-sm mt-1">
                  {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                  {filteredCustomers.length !== customers.length && ` (filtered from ${customers.length} total)`}
                </p>
              </div>
            </div>
          </div>

          <CustomerTable customers={filteredCustomers} />
        </div>
      </div>
    </>
  )
}
