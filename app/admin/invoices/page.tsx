'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ActionButton } from '@/components/ui/ActionSystem'
import { Icon } from '@/components/ui/icons'
import { 
  Download,
  Eye,
  ArrowUpDown,
  Check,
  Send,
  Trash2,
  Loader2
} from '@/components/ui/icons'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Invoice, InvoiceStatus, Customer } from '@/lib/types'

type StatusFilter = 'all' | 'outstanding' | InvoiceStatus
type DateRangeFilter = 'all' | '7d' | '14d' | '30d' | '6m' | '1y'
type AmountFilter = 'all' | 'under_500' | '500_2000' | 'over_2000'
type SortField = 'date' | 'amount' | 'customer' | 'number'
type SortOrder = 'asc' | 'desc'

interface InvoiceWithCustomer extends Invoice {
  customer: Customer
}

const STATUS_FILTER_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'overdue', 'paid']
const DATE_RANGE_OPTIONS: Array<{ value: DateRangeFilter; label: string }> = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '30 Days' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
]
const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = Object.fromEntries(
  DATE_RANGE_OPTIONS.map((option) => [option.value, option.label])
) as Record<DateRangeFilter, string>
const isInvoiceOverdue = (invoice: Invoice) => {
  if (invoice.status === 'overdue') return true
  if (invoice.status !== 'sent' || !invoice.due_date) return false
  const dueDate = parseISO(invoice.due_date)
  return isPast(dueDate) && !isToday(dueDate)
}

const isInvoiceOutstanding = (invoice: Invoice) =>
  invoice.status === 'sent' || invoice.status === 'overdue'

export default function InvoicesPage() {
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all')
  const [amountFilter, setAmountFilter] = useState<AmountFilter>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState<'mark-paid' | 'send-reminder' | 'delete' | null>(null)
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<'all' | 'attention' | 'paid' | 'draft' | 'custom'>('all')
  
  // Data fetching states
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const statusFilterRef = useRef<HTMLSelectElement | null>(null)
  const [sysTime, setSysTime] = useState('--')

  useEffect(() => {
    setIsHydrated(true)
    const now = new Date()
    const formatted = now
      .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase()
      .replace(/,/g, '')
    setSysTime(formatted)
  }, [])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      // Get user's business_id
      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.business_id) {
        setError('No business profile found')
        return
      }
      
      // Fetch invoices with customer data
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
      
      if (invoicesError) {
        throw invoicesError
      }
      
      setInvoices(invoicesData || [])
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError('Failed to load invoices. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Fetch invoices from Supabase
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('invoice_filters')
      if (!stored) return

      const parsed = JSON.parse(stored) as {
        statusFilter?: StatusFilter
        dateRangeFilter?: DateRangeFilter
        amountFilter?: AmountFilter
        preset?: 'all' | 'attention' | 'paid' | 'draft' | 'custom'
      }

      if (
        parsed.statusFilter &&
        (parsed.statusFilter === 'all' ||
          parsed.statusFilter === 'outstanding' ||
          STATUS_FILTER_OPTIONS.includes(parsed.statusFilter as InvoiceStatus))
      ) {
        setStatusFilter(parsed.statusFilter)
      }
      if (
        parsed.dateRangeFilter &&
        ['all', '7d', '14d', '30d', '6m', '1y'].includes(parsed.dateRangeFilter)
      ) {
        setDateRangeFilter(parsed.dateRangeFilter as DateRangeFilter)
      }
      if (parsed.amountFilter) setAmountFilter(parsed.amountFilter)
      if (parsed.preset) setActivePreset(parsed.preset)
    } catch (storageError) {
      console.warn('Could not restore invoice filters', storageError)
    }
  }, [])

  useEffect(() => {
    const payload = {
      statusFilter,
      dateRangeFilter,
      amountFilter,
      preset: activePreset,
    }
    window.localStorage.setItem('invoice_filters', JSON.stringify(payload))
  }, [statusFilter, dateRangeFilter, amountFilter, activePreset])

  useEffect(() => {
    if (!feedbackMessage) return
    const timer = window.setTimeout(() => setFeedbackMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedbackMessage])

  // Calculate totals
  const totalOutstanding = invoices
    .filter(inv => isInvoiceOutstanding(inv))
    .reduce((sum, inv) => sum + inv.total, 0)

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)

  const overdueCount = invoices.filter((inv) => isInvoiceOverdue(inv)).length

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]
    const nowDate = new Date()
    const rangeStart = (() => {
      if (dateRangeFilter === 'all') return null
      const start = new Date(nowDate)
      switch (dateRangeFilter) {
        case '7d':
          start.setDate(start.getDate() - 7)
          return start
        case '14d':
          start.setDate(start.getDate() - 14)
          return start
        case '30d':
          start.setDate(start.getDate() - 30)
          return start
        case '6m':
          start.setMonth(start.getMonth() - 6)
          return start
        case '1y':
          start.setFullYear(start.getFullYear() - 1)
          return start
        default:
          return null
      }
    })()
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(invoice => 
        (invoice.invoice_number || '').toLowerCase().includes(query) ||
        invoice.customer?.name?.toLowerCase().includes(query) ||
        invoice.customer?.email?.toLowerCase().includes(query)
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((invoice) => {
        if (statusFilter === 'outstanding') return isInvoiceOutstanding(invoice)
        if (statusFilter === 'overdue') return isInvoiceOverdue(invoice)
        return invoice.status === statusFilter
      })
    }

    // Date range filter (by issue date)
    if (rangeStart) {
      result = result.filter((invoice) => {
        const issueDate = new Date(invoice.issue_date || invoice.created_at)
        return issueDate >= rangeStart && issueDate <= nowDate
      })
    }

    // Amount filter
    if (amountFilter !== 'all') {
      result = result.filter((invoice) => {
        if (amountFilter === 'under_500') return invoice.total < 500
        if (amountFilter === '500_2000') return invoice.total >= 500 && invoice.total <= 2000
        return invoice.total > 2000
      })
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime()
          break
        case 'amount':
          comparison = a.total - b.total
          break
        case 'customer':
          comparison = (a.customer?.name || '').localeCompare(b.customer?.name || '')
          break
        case 'number':
          comparison = (a.invoice_number || '').localeCompare(b.invoice_number || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [invoices, searchQuery, statusFilter, dateRangeFilter, amountFilter, sortField, sortOrder])

  const applyPreset = (preset: 'all' | 'attention' | 'paid' | 'draft') => {
    if (preset === 'all') {
      setStatusFilter('all')
      setDateRangeFilter('all')
      setAmountFilter('all')
    } else if (preset === 'attention') {
      setStatusFilter('outstanding')
      setDateRangeFilter('all')
      setAmountFilter('all')
    } else if (preset === 'paid') {
      setStatusFilter('paid')
      setDateRangeFilter('all')
      setAmountFilter('all')
    } else {
      setStatusFilter('draft')
      setDateRangeFilter('all')
      setAmountFilter('all')
    }
    setActivePreset(preset)
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDateRangeFilter('all')
    setAmountFilter('all')
    setActivePreset('all')
  }

  const statusFilterSelectValue =
    statusFilter === 'draft' ||
    statusFilter === 'sent' ||
    statusFilter === 'overdue' ||
    statusFilter === 'paid'
      ? statusFilter
      : ''

  // Handle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedInvoices(newSelected)
  }

  const toggleSelectAll = useCallback(() => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)))
    }
  }, [filteredInvoices, selectedInvoices])

  const handleBulkAction = async (action: 'mark-paid' | 'send-reminder' | 'delete') => {
    if (selectedInvoices.size === 0) return

    if (action === 'delete' && !window.confirm(`Delete ${selectedInvoices.size} selected invoice(s)?`)) {
      return
    }

    const endpointMap: Record<'mark-paid' | 'send-reminder' | 'delete', string> = {
      'mark-paid': '/api/invoices/bulk-mark-paid',
      'send-reminder': '/api/invoices/bulk-send',
      'delete': '/api/invoices/bulk-delete',
    }

    const selectedIds = Array.from(selectedInvoices)
    setBulkActionLoading(action)
    setFeedbackMessage(null)

    try {
      const response = await fetch(endpointMap[action], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: selectedIds }),
      })

      if (!response.ok) {
        throw new Error('Action failed')
      }

      if (action === 'delete') {
        setInvoices((prev) => prev.filter((invoice) => !selectedIds.includes(invoice.id)))
      } else if (action === 'mark-paid') {
        const paidAt = new Date().toISOString()
        setInvoices((prev) =>
          prev.map((invoice) =>
            selectedIds.includes(invoice.id)
              ? { ...invoice, status: 'paid', paid_at: invoice.paid_at || paidAt }
              : invoice
          )
        )
      } else {
        setInvoices((prev) =>
          prev.map((invoice) =>
            selectedIds.includes(invoice.id) && invoice.status === 'draft'
              ? { ...invoice, status: 'sent' }
              : invoice
          )
        )
      }

      setSelectedInvoices(new Set())
      setFeedbackMessage(
        action === 'delete'
          ? 'Invoices deleted successfully.'
          : action === 'mark-paid'
          ? 'Invoices marked as paid.'
          : 'Draft invoices moved to sent.'
      )
    } catch (bulkActionError) {
      console.error(`Bulk ${action} failed`, bulkActionError)
      setFeedbackMessage('Bulk action failed. Please try again.')
    } finally {
      setBulkActionLoading(null)
    }
  }

  const handleSingleAction = async (invoiceId: string, action: 'mark-paid' | 'send-reminder') => {
    const endpoint =
      action === 'mark-paid'
        ? `/api/invoices/${invoiceId}/mark-paid`
        : '/api/invoices/bulk-send'

    setRowActionLoading(invoiceId)
    setFeedbackMessage(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'send-reminder' ? JSON.stringify({ invoiceIds: [invoiceId] }) : undefined,
      })

      if (!response.ok) {
        throw new Error('Row action failed')
      }

      setInvoices((prev) =>
        prev.map((invoice) => {
          if (invoice.id !== invoiceId) return invoice
          if (action === 'mark-paid') {
            return { ...invoice, status: 'paid', paid_at: invoice.paid_at || new Date().toISOString() }
          }
          if (invoice.status === 'draft') {
            return { ...invoice, status: 'sent' }
          }
          return invoice
        })
      )
      setFeedbackMessage(action === 'mark-paid' ? 'Invoice marked as paid.' : 'Reminder sent.')
    } catch (rowActionError) {
      console.error('Row action failed', rowActionError)
      setFeedbackMessage('Could not complete that action.')
    } finally {
      setRowActionLoading(null)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const isTyping =
        !!target &&
        (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select')

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if ((event.key === 'f' || event.key === 'F') && !isTyping) {
        event.preventDefault()
        statusFilterRef.current?.focus()
        return
      }

      if ((event.key === 'a' || event.key === 'A') && !isTyping && filteredInvoices.length > 0) {
        event.preventDefault()
        toggleSelectAll()
        return
      }

      if (event.key === 'Escape' && selectedInvoices.size > 0) {
        setSelectedInvoices(new Set())
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filteredInvoices.length, selectedInvoices.size, toggleSelectAll])

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="admin-card shadow-sm p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-cyan-400 animate-spin mb-4" />
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
              Loading invoices...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-header">
            BILLING
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/invoices/new">
            <ActionButton
              stylePreset="industrial"
              intent="primary"
              size="md"
              className="uppercase tracking-[0.1em] whitespace-nowrap"
            >
              NEW INVOICE
            </ActionButton>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="TOTAL INVOICES"
          value={invoices.length}
          color="blue"
          mark="total"
          active={statusFilter === 'all' && dateRangeFilter === 'all' && amountFilter === 'all'}
          onClick={() => {
            clearAllFilters()
            setActivePreset('all')
          }}
        />
        <MetricCard
          label="OUTSTANDING"
          value={`$${totalOutstanding.toFixed(0)}`}
          color="amber"
          mark="outstanding"
          active={statusFilter === 'outstanding'}
          onClick={() => applyPreset('attention')}
        />
        <MetricCard
          label="PAID"
          value={`$${totalPaid.toFixed(0)}`}
          color="emerald"
          mark="paid"
          active={statusFilter === 'paid'}
          onClick={() => applyPreset('paid')}
        />
        <MetricCard
          label="OVERDUE"
          value={overdueCount}
          color="rose"
          mark="overdue"
          active={statusFilter === 'overdue'}
          onClick={() => {
            setStatusFilter('overdue')
            setDateRangeFilter('all')
            setAmountFilter('all')
            setActivePreset('custom')
          }}
        />
      </div>

      {/* Search and Filters */}
      <div className="admin-card shadow-sm">
        <div className="p-5 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setActivePreset('custom')
              }}
              placeholder="Search by invoice # or customer name..."
              className="w-full px-4 pr-12 py-3 rounded-xl admin-input text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            {searchQuery && (
              <button type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">x</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/70 px-3 py-1.5 shadow-[0_0_0_1px_rgba(34,211,238,0.09),0_0_16px_rgba(34,211,238,0.14)] dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_18px_rgba(34,211,238,0.2)]">
              <span className="font-mono text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-200">Filter</span>
              <select
                ref={statusFilterRef}
                value={statusFilterSelectValue}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter)
                  setActivePreset('custom')
                }}
                className="rounded-full bg-white/90 dark:bg-slate-900 border border-cyan-200 dark:border-cyan-500/40 px-2.5 py-1.5 font-mono text-xs capitalize text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:focus:ring-cyan-300"
              >
                <option value="" hidden>Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as DateRangeFilter)
                setActivePreset('custom')
              }}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-400"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={amountFilter}
              onChange={(e) => {
                setAmountFilter(e.target.value as AmountFilter)
                setActivePreset('custom')
              }}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-400"
            >
              <option value="all">All Amounts</option>
              <option value="under_500">Under $500</option>
              <option value="500_2000">$500 - $2,000</option>
              <option value="over_2000">Over $2,000</option>
            </select>

            <div className="flex-1" />

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [SortField, SortOrder]
                  setSortField(field)
                  setSortOrder(order)
                }}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 font-mono text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-400"
              >
                <option value="date-desc">Date: Newest</option>
                <option value="date-asc">Date: Oldest</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
                <option value="customer-asc">Customer: A-Z</option>
                <option value="customer-desc">Customer: Z-A</option>
                <option value="number-asc">Invoice #: 1-9</option>
              </select>
            </div>

            <button type="button"
              onClick={clearAllFilters}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>
          </div>

          {(searchQuery || statusFilter !== 'all' || dateRangeFilter !== 'all' || amountFilter !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-200/70 bg-cyan-50/45 px-3 py-2 dark:border-cyan-500/25 dark:bg-cyan-500/5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Active filters</span>
              {searchQuery && (
                <span className="rounded-full border border-cyan-300/80 bg-cyan-100/70 px-3 py-1 font-mono text-[10px] text-cyan-800 shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_0_14px_rgba(34,211,238,0.14)] dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_16px_rgba(34,211,238,0.18)]">
                  Search: {searchQuery}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="rounded-full border border-blue-300/80 bg-blue-100/70 px-3 py-1 font-mono text-[10px] capitalize text-blue-800 shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_0_14px_rgba(59,130,246,0.14)] dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200 dark:shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_0_16px_rgba(59,130,246,0.2)]">
                  Status: {statusFilter === 'outstanding' ? 'sent + overdue' : statusFilter}
                </span>
              )}
              {dateRangeFilter !== 'all' && (
                <span className="rounded-full border border-violet-300/80 bg-violet-100/75 px-3 py-1 font-mono text-[10px] text-violet-800 shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_0_14px_rgba(139,92,246,0.15)] dark:border-violet-500/45 dark:bg-violet-500/15 dark:text-violet-200 dark:shadow-[0_0_0_1px_rgba(139,92,246,0.18),0_0_16px_rgba(139,92,246,0.22)]">
                  Window: {DATE_RANGE_LABELS[dateRangeFilter]}
                </span>
              )}
              {amountFilter !== 'all' && (
                <span className="rounded-full border border-emerald-300/80 bg-emerald-100/75 px-3 py-1 font-mono text-[10px] text-emerald-800 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_0_14px_rgba(16,185,129,0.15)] dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-200 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_0_16px_rgba(16,185,129,0.2)]">
                  Amount: {amountFilter.replace('_', ' ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
          {feedbackMessage}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div
          data-test="send-modal"
          className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <span
              className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"
              aria-hidden="true"
            />
            <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
              {selectedInvoices.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => handleBulkAction('mark-paid')}
              disabled={bulkActionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-mono text-xs hover:bg-emerald-200 dark:hover:bg-emerald-400/30 transition-colors disabled:opacity-60"
            >
              {bulkActionLoading === 'mark-paid' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {bulkActionLoading === 'mark-paid' ? 'Marking...' : 'Mark Paid'}
            </button>
            <button type="button"
              onClick={() => handleBulkAction('send-reminder')}
              disabled={bulkActionLoading !== null}
              data-test="confirm-send"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 font-mono text-xs hover:bg-blue-200 dark:hover:bg-blue-400/30 transition-colors disabled:opacity-60"
            >
              {bulkActionLoading === 'send-reminder' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {bulkActionLoading === 'send-reminder' ? 'Sending...' : 'Send Reminder'}
            </button>
            <button type="button"
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-100 dark:bg-rose-400/20 text-rose-700 dark:text-rose-300 font-mono text-xs hover:bg-rose-200 dark:hover:bg-rose-400/30 transition-colors disabled:opacity-60"
            >
              {bulkActionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {bulkActionLoading === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
            <button type="button"
              onClick={() => setSelectedInvoices(new Set())}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <span className="text-xs font-semibold">Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="admin-section-title">INVOICES</h2>
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 tracking-wider">
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'RECORD' : 'RECORDS'} FOUND
          </p>
        </div>
        {!loading && filteredInvoices.length > 0 && (
          <ActionButton
            onClick={toggleSelectAll}
            stylePreset="industrial"
            intent={selectedInvoices.size === filteredInvoices.length ? 'primary' : 'secondary'}
            size="md"
            className="uppercase tracking-[0.08em]"
          >
            {selectedInvoices.size === filteredInvoices.length ? 'Deselect All' : 'Select All'}
          </ActionButton>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-card shadow-sm p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-cyan-400 animate-spin mb-4" />
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
              Loading invoices...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="admin-card shadow-sm p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-400/10 flex items-center justify-center mx-auto mb-4">
              <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-300">ERR</span>
            </div>
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
              {error}
            </p>
            <button type="button"
              onClick={() => void fetchInvoices()}
              className="mt-4 font-mono text-xs text-blue-600 dark:text-cyan-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {!loading && !error && (
        <div className="space-y-3" data-test="invoice-list">
          {filteredInvoices.length === 0 ? (
            <div className="admin-card shadow-sm p-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">0</span>
                </div>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  No invoices found
                </p>
                {(searchQuery || statusFilter !== 'all' || dateRangeFilter !== 'all' || amountFilter !== 'all') && (
                  <button type="button"
                    onClick={clearAllFilters}
                    className="mt-4 font-mono text-xs text-blue-600 dark:text-cyan-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceRow 
                key={invoice.id} 
                invoice={invoice}
                isSelected={selectedInvoices.has(invoice.id)}
                onToggleSelect={() => toggleSelection(invoice.id)}
                onQuickAction={handleSingleAction}
                actionLoading={rowActionLoading === invoice.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Invoice Row Component - Now Clickable
function InvoiceRow({ 
  invoice, 
  isSelected, 
  onToggleSelect,
  onQuickAction,
  actionLoading,
}: { 
  invoice: InvoiceWithCustomer
  isSelected: boolean
  onToggleSelect: () => void
  onQuickAction: (invoiceId: string, action: 'mark-paid' | 'send-reminder') => void
  actionLoading: boolean
}) {
  const router = useRouter()
  const isOverdue = isInvoiceOverdue(invoice)
  
  return (
    <div
      data-test="invoice-item"
      className={`group relative overflow-hidden bg-white dark:bg-slate-900 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
      isSelected 
        ? 'border-blue-500 dark:border-cyan-400 ring-1 ring-blue-500 dark:ring-cyan-400' 
        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-cyan-400/50'
    }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-blue-500/0 dark:via-cyan-400/10" />
      <Link 
        href={`/admin/invoices/${invoice.id}`}
        className="relative block"
      >
        <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-xl">
          {/* Checkbox - stops propagation to prevent navigation when clicking checkbox */}
          <button type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleSelect()
            }}
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-blue-600 dark:bg-cyan-500 border-blue-600 dark:border-cyan-500 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] dark:shadow-[0_0_0_3px_rgba(34,211,238,0.2)]'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:border-blue-300 dark:group-hover:border-cyan-400/70'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* Invoice Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                #{invoice.invoice_number}
              </span>
              <StatusBadge status={isOverdue ? 'overdue' : invoice.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                {invoice.customer?.name || 'Unknown Customer'}
              </span>
              {invoice.notes && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-[300px]">
                    {invoice.notes}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Amount & Due Date */}
          <div className="text-right hidden sm:block">
            <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
              ${invoice.total.toFixed(0)}
            </div>
            <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {invoice.due_date ? `Due: ${format(parseISO(invoice.due_date), 'MMM dd')}` : 'No due date'}
            </div>
          </div>

          {/* Actions - also stop propagation */}
          <div 
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {invoice.status === 'draft' && (
              <button type="button"
                data-test="send-invoice"
                className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-400/20 text-blue-600 dark:text-blue-300 transition-colors disabled:opacity-60"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onQuickAction(invoice.id, 'send-reminder')
                }}
                disabled={actionLoading}
                title="Send invoice"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            )}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <button type="button"
                className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-400/20 text-emerald-600 dark:text-emerald-300 transition-colors disabled:opacity-60"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onQuickAction(invoice.id, 'mark-paid')
                }}
                disabled={actionLoading}
                title="Mark as paid"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="font-mono text-[11px] leading-none">Paid</span>
                )}
              </button>
            )}
            <button type="button" 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push(`/admin/invoices/${invoice.id}`)
              }}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button type="button" 
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Download PDF functionality
                window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')
              }}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  )
}

// Metric Card
function MetricCard({
  label,
  value,
  color,
  mark,
  onClick,
  active = false,
}: { 
  label: string
  value: string | number
  color: string
  mark: 'total' | 'outstanding' | 'paid' | 'overdue'
  onClick?: () => void
  active?: boolean
}) {
  const colors: Record<
    string,
    { text: string; markBg: string; markBar: string }
  > = {
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      markBg: 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-400/20',
      markBar: 'bg-blue-600/70 dark:bg-blue-300/75',
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      markBg: 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-400/20',
      markBar: 'bg-amber-600/70 dark:bg-amber-300/75',
    },
    emerald: {
      text: 'text-emerald-600 dark:text-emerald-400',
      markBg: 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-400/20',
      markBar: 'bg-emerald-600/70 dark:bg-emerald-300/75',
    },
    rose: {
      text: 'text-rose-600 dark:text-rose-400',
      markBg: 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-400/20',
      markBar: 'bg-rose-600/70 dark:bg-rose-300/75',
    },
  }
  const c = colors[color] ?? colors.blue

  const iconName =
    mark === 'total'
      ? 'invoice'
      : mark === 'outstanding'
        ? 'dollar'
        : mark === 'paid'
          ? 'checkCircle2'
          : 'alert'

  const card = (
    <div className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 transition-all ${
      active
        ? 'border-cyan-400/80 dark:border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.16),0_10px_24px_-18px_rgba(34,211,238,0.4)]'
        : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300/60 dark:hover:border-cyan-400/45 hover:shadow-sm'
    }`}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <div
          className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${c.markBg} ${c.text}`}
          aria-hidden="true"
        >
          <Icon name={iconName} size={18} className="opacity-80" />
        </div>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )

  if (!onClick) return card

  return (
    <button type="button" onClick={onClick} className="text-left">
      {card}
    </button>
  )
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft:
      'border border-slate-300 bg-slate-100/80 text-slate-700 shadow-[0_0_0_1px_rgba(100,116,139,0.08),0_0_10px_rgba(100,116,139,0.14)] dark:border-slate-500/35 dark:bg-slate-700/40 dark:text-slate-300 dark:shadow-[0_0_0_1px_rgba(148,163,184,0.15),0_0_12px_rgba(148,163,184,0.15)]',
    sent:
      'border border-blue-300 bg-blue-100/80 text-blue-700 shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_0_12px_rgba(59,130,246,0.2)] dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 dark:shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_0_14px_rgba(59,130,246,0.24)]',
    paid:
      'border border-emerald-300 bg-emerald-100/80 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_0_12px_rgba(16,185,129,0.18)] dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_0_14px_rgba(16,185,129,0.22)]',
    overdue:
      'border border-rose-300 bg-rose-100/85 text-rose-700 shadow-[0_0_0_1px_rgba(244,63,94,0.12),0_0_12px_rgba(244,63,94,0.18)] dark:border-rose-500/45 dark:bg-rose-500/15 dark:text-rose-300 dark:shadow-[0_0_0_1px_rgba(244,63,94,0.2),0_0_14px_rgba(244,63,94,0.24)]',
    cancelled:
      'border border-slate-300 bg-slate-100/80 text-slate-500 shadow-[0_0_0_1px_rgba(100,116,139,0.08),0_0_10px_rgba(100,116,139,0.12)] dark:border-slate-500/35 dark:bg-slate-700/35 dark:text-slate-400 dark:shadow-[0_0_0_1px_rgba(148,163,184,0.12),0_0_12px_rgba(148,163,184,0.14)]',
  }
  
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  
  return (
    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider ${colors[status] || colors.draft}`}>
      {label}
    </span>
  )
}








