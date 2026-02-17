'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/icons'
import Pagination from '@/components/ui/Pagination'
import { createClient } from '@/lib/supabase/client'

// Types
interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  portal_access: boolean
  created_at: string
  jobs?: Array<{
    id: string
    status: string
    scheduled_start: string
  }>
}

const ITEMS_PER_PAGE = 12

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let active = true

    async function loadCustomers() {
      try {
        setLoading(true)
        setLoadError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (active) {
            setCustomers([])
            setLoadError('Please sign in to view customers.')
          }
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('business_id, role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile?.business_id) {
          console.error('Customers profile fetch error:', profileError)
          if (active) {
            setCustomers([])
            setLoadError('Unable to load your business profile.')
          }
          return
        }

        if (profile.role !== 'admin') {
          if (active) {
            setCustomers([])
            setLoadError('Admin access required to view customers.')
          }
          return
        }

        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select(`
            id,
            name,
            email,
            phone,
            address,
            portal_access,
            created_at,
            jobs:jobs(
              id,
              status,
              scheduled_start
            )
          `)
          .eq('business_id', profile.business_id)
          .order('created_at', { ascending: false })

        if (customersError) {
          console.error('Customers fetch error:', customersError)
          if (active) {
            setCustomers([])
            setLoadError('Failed to load customers.')
          }
          return
        }

        if (active) {
          setCustomers((customersData || []) as Customer[])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCustomers()

    return () => {
      active = false
    }
  }, [])
  
  // Calculate stats
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const newThisMonth = customers.filter(c => 
    new Date(c.created_at) >= firstDayOfMonth
  ).length
  
  const withPortalAccess = customers.filter(c => c.portal_access).length

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    
    const query = searchQuery.toLowerCase()
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.address?.toLowerCase().includes(query)
    )
  }, [customers, searchQuery])

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Format current date
  const sysTime = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase().replace(/,/g, '')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-cyan-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
              CLIENTS
            </h1>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
              SYS.TIME: {sysTime}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          <p className="font-mono text-sm text-rose-600 dark:text-rose-400">{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            CLIENTS
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/customers/new">
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all whitespace-nowrap flex-nowrap">
              <span className="whitespace-nowrap">NEW CLIENT</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics - Clean Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="TOTAL CLIENTS"
          value={customers.length}
          color="blue"
          mark="clients"
        />
        <MetricCard
          label="NEW THIS MONTH"
          value={newThisMonth}
          color="emerald"
          mark="new"
        />
        <MetricCard
          label="PORTAL ACCESS"
          value={withPortalAccess}
          color="cyan"
          mark="portal"
        />
      </div>

      {/* Search Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search clients by name, phone, or email..."
              className="w-full px-4 pr-12 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 transition-all"
            />
            {searchQuery && (
              <button type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">x</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-slate-900 dark:text-white tracking-wide">RESULTS</h2>
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 tracking-wider">
            {searchQuery ? `${filteredCustomers.length} results found` : `${filteredCustomers.length} ${filteredCustomers.length === 1 ? 'CLIENT' : 'CLIENTS'} TOTAL`}
          </p>
        </div>
      </div>

      {/* Empty States */}
      {customers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">NEW</span>
            </div>
            <p className="font-mono text-sm text-slate-900 dark:text-white mb-2">
              No clients yet
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add your first client to get started
            </p>
            <Link href="/admin/customers/new">
              <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all whitespace-nowrap flex-nowrap">
                <span className="whitespace-nowrap">ADD FIRST CLIENT</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">0</span>
            </div>
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
              No clients found matching &apos;{searchQuery}&apos;
            </p>
            <button type="button"
              onClick={() => handleSearchChange('')}
              className="mt-4 font-mono text-xs text-blue-600 dark:text-cyan-400 hover:underline"
            >
              Clear search
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredCustomers.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}
    </div>
  )
}

// Metric Card - Clean
function MetricCard({ 
  label, 
  value, 
  color,
  mark,
}: { 
  label: string
  value: number
  color: string
  mark: 'clients' | 'new' | 'portal'
}) {
  const colors: Record<
    string,
    { text: string; markBg: string; markBar: string }
  > = {
    cyan: {
      text: 'text-cyan-600 dark:text-cyan-400',
      markBg: 'bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-400/20',
      markBar: 'bg-cyan-600/70 dark:bg-cyan-300/75',
    },
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      markBg: 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-400/20',
      markBar: 'bg-blue-600/70 dark:bg-blue-300/75',
    },
    emerald: {
      text: 'text-emerald-600 dark:text-emerald-400',
      markBg: 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-400/20',
      markBar: 'bg-emerald-600/70 dark:bg-emerald-300/75',
    },
  }
  const c = colors[color] ?? colors.blue

  const iconName =
    mark === 'clients' ? 'users' : mark === 'new' ? 'userAdd' : 'lock'

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <div
          className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${c.markBg} ${c.text}`}
          aria-hidden="true"
        >
          <Icon name={iconName} size={18} className="opacity-80" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

// Customer Card - Enhanced with Actions
function CustomerCard({ customer }: { customer: Customer }) {
  const createdDate = new Date(customer.created_at).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase()
  
  // Generate avatar initials
  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/95">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_45%)]" />

      <div className="relative space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-mono text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Client
            </p>
            <h3 className="truncate font-mono text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-cyan-300">
              {customer.name}
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-slate-500 dark:text-slate-400">
              SINCE {createdDate}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          {customer.phone && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Phone</span>
              <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Email</span>
              <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Address</span>
              <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">{customer.address}</span>
            </div>
          )}
          {!customer.phone && !customer.email && !customer.address && (
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">No contact details added</p>
          )}
        </div>

      </div>

      <div className="relative grid grid-cols-3 gap-2 border-t border-slate-200/70 px-5 py-3 dark:border-slate-800">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Icon name="profile" size="sm" className="opacity-80" />
          Details
        </Link>
        <Link
          href={`/admin/jobs/new?customer=${customer.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-blue-700 transition-colors hover:bg-blue-100 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
        >
          <Icon name="job" size="sm" className="opacity-80" />
          New Job
        </Link>
        <Link
          href={`/admin/customers/${customer.id}?edit=true`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Icon name="edit" size="sm" className="opacity-80" />
          Edit
        </Link>
      </div>
    </div>
  )
}
