'use client'

import { useState, useMemo, useCallback } from 'react'
import { Customer } from '@/lib/types'
import CustomerFilters, { CustomerFilterState } from './CustomerFilters'
import CustomerTable from './CustomerTable'
import Link from 'next/link'
import { Plus, Users, TrendingUp, UserCheck } from '@/components/ui/icons'

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

// ========================================
// INDUSTRIAL FUTURISM COMPONENTS
// ========================================

function BlueprintCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`blueprint-card ${className}`}>
      {/* Corner Accents */}
      <svg className="absolute top-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
        <path d="M0 12 L0 0 L12 0" fill="none" stroke="rgba(77, 148, 255, 0.4)" strokeWidth="1.5" />
      </svg>
      <svg className="absolute top-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
        <path d="M20 0 L32 0 L32 12" fill="none" stroke="rgba(77, 148, 255, 0.4)" strokeWidth="1.5" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
        <path d="M0 20 L0 32 L12 32" fill="none" stroke="rgba(77, 148, 255, 0.4)" strokeWidth="1.5" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32">
        <path d="M20 32 L32 32 L32 20" fill="none" stroke="rgba(77, 148, 255, 0.4)" strokeWidth="1.5" />
      </svg>
      {children}
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'blue',
  trend
}: { 
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'amber'
  trend?: { value: number; isPositive: boolean }
}) {
  const colorMap = {
    blue: { text: 'text-[rgb(var(--blueprint-300))]', glow: 'shadow-[0_0_20px_rgba(var(--blueprint-500),0.3)]', bg: 'bg-[rgba(var(--blueprint-500),0.15)]' },
    green: { text: 'text-[rgb(var(--neon-green))]', glow: 'shadow-[0_0_20px_rgba(var(--neon-green),0.3)]', bg: 'bg-[rgba(var(--neon-green),0.15)]' },
    amber: { text: 'text-[rgb(var(--neon-amber))]', glow: 'shadow-[0_0_20px_rgba(var(--neon-amber),0.3)]', bg: 'bg-[rgba(var(--neon-amber),0.15)]' }
  }

  return (
    <BlueprintCard className="p-6 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="data-label mb-1">{label}</p>
          <p className={`data-value ${colorMap[color].text}`} style={{ textShadow: `0 0 20px rgba(var(--${color === 'blue' ? 'blueprint-400' : color === 'green' ? 'neon-green' : 'neon-amber'}), 0.4)` }}>
            {value}
          </p>
          {trend && (
            <p className={`text-xs mt-2 font-mono ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
              {trend.isPositive ? 'â†‘' : 'â†“'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color].bg} ${colorMap[color].text}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </BlueprintCard>
  )
}

function NeonButton({ 
  children, 
  href, 
  onClick, 
  variant = 'primary',
  icon: Icon
}: { 
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'warning'
  icon?: React.ComponentType<{ className?: string }>
}) {
  const baseClasses = variant === 'primary' ? 'btn-neon btn-neon-primary' : 'btn-neon btn-neon-warning'
  
  const content = (
    <>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </>
  )

  const classes = `inline-flex items-center gap-2 ${baseClasses} rounded-sm`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  )
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

  // Stable timestamp for date calculations
  const [nowTimestamp] = useState(() => Date.now())

  // Extract unique locations from customer addresses
  const locations = useMemo(() => {
    const uniqueLocations = new Set<string>()
    customers.forEach(customer => {
      if (customer.address) {
        const parts = customer.address.split(',')
        if (parts.length > 1) {
          const city = parts[parts.length - 2].trim()
          if (city) uniqueLocations.add(city)
        }
      }
    })
    return Array.from(uniqueLocations).sort()
  }, [customers])

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const newThisMonth = customers.filter(c => 
      new Date(c.created_at) >= firstDayOfMonth
    ).length
    
    const withPortalAccess = customers.filter(c => c.portal_access).length
    
    return {
      total: customers.length,
      newThisMonth,
      withPortalAccess
    }
  }, [customers])

  // Helper function to calculate activity status
  const getActivityStatus = useCallback((customer: CustomerWithJobs): string => {
    if (!customer.jobs || customer.jobs.length === 0) {
      return 'new'
    }

    const mostRecentJob = customer.jobs.reduce((latest, job) => {
      const jobDate = new Date(job.scheduled_start)
      const latestDate = latest ? new Date(latest.scheduled_start) : new Date(0)
      return jobDate > latestDate ? job : latest
    }, null as typeof customer.jobs[0] | null)

    if (!mostRecentJob) return 'new'

    const daysSinceLastJob = Math.floor(
      (nowTimestamp - new Date(mostRecentJob.scheduled_start).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastJob <= 90) return 'active'
    if (daysSinceLastJob <= 180) return 'at-risk'
    return 'inactive'
  }, [nowTimestamp])

  // Helper function to check invoice status
  const getInvoiceStatus = useCallback((customerId: string): 'unpaid' | 'paid' | 'never' => {
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId)
    if (customerInvoices.length === 0) return 'never'

    const hasUnpaid = customerInvoices.some(inv => inv.status !== 'paid')
    return hasUnpaid ? 'unpaid' : 'paid'
  }, [invoices])

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
  }, [customers, filters, getActivityStatus, getInvoiceStatus])

  return (
    <div className="space-y-8 relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="heading-md text-white mb-1">CLIENT DATABASE</h1>
          <p className="text-[rgb(var(--text-secondary))] font-mono text-sm tracking-wide">
            MANAGE CUSTOMER PROFILES AND PORTAL ACCESS
          </p>
        </div>

        <NeonButton href="/admin/customers/new" icon={Plus}>
          ADD CLIENT
        </NeonButton>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <StatCard
          label="TOTAL CLIENTS"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="NEW THIS MONTH"
          value={stats.newThisMonth}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="PORTAL ACCESS"
          value={stats.withPortalAccess}
          icon={UserCheck}
          color="amber"
        />
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
      <BlueprintCard className="overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-[rgba(var(--blueprint-700),0.3)] flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-white tracking-wider">ALL CLIENTS</h2>
            <p className="text-xs text-[rgb(var(--text-muted))] font-mono mt-1">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'RECORD' : 'RECORDS'} FOUND
              {filteredCustomers.length !== customers.length && ` (FILTERED FROM ${customers.length} TOTAL)`}
            </p>
          </div>
        </div>

        <CustomerTable customers={filteredCustomers} />
      </BlueprintCard>
    </div>
  )
}

