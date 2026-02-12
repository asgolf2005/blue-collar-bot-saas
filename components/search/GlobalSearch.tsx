'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Clock, Briefcase, Users, FileText, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { EmptySearch } from '@/components/ui/EmptyState'

interface SearchResult {
  id: string
  type: 'job' | 'customer' | 'invoice'
  title: string
  subtitle: string
  url: string
  metadata?: string
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentSearches')
    if (recent) {
      setRecentSearches(JSON.parse(recent))
    }
  }, [])

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const searchResults: SearchResult[] = []

      const buildJobsQuery = () => {
        let query = supabase
          .from('jobs')
          .select('id, description, status, scheduled_start, customers(name)')
          .eq('business_id', profile.business_id)

        if (profile.role === 'tech') {
          query = query.eq('technician_id', user.id)
        }

        return query
      }

      const [jobsByText, jobsByCustomer] = await Promise.all([
        buildJobsQuery()
          .or(`description.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`)
          .limit(5),
        buildJobsQuery()
          .or(`name.ilike.%${searchQuery}%`, { foreignTable: 'customers' })
          .limit(5),
      ])

      const jobMap = new Map<string, any>()

      ;[...(jobsByText.data || []), ...(jobsByCustomer.data || [])].forEach((job: any) => {
        if (!jobMap.has(job.id)) {
          jobMap.set(job.id, job)
        }
      })

      const jobs = Array.from(jobMap.values()).slice(0, 5)

      jobs.forEach((job: any) => {
        searchResults.push({
          id: job.id,
          type: 'job',
          title: job.description || 'Untitled Job',
          subtitle: job.customers?.name || 'No customer',
          url: profile.role === 'admin' ? `/admin/jobs/${job.id}` : `/tech/jobs/${job.id}`,
          metadata: job.scheduled_start
            ? formatDistanceToNow(new Date(job.scheduled_start), { addSuffix: true })
            : job.status,
        })
      })

      const canSearchCustomers = profile.role === 'admin' || profile.role === 'tech'

      // Search customers (admin + tech)
      if (canSearchCustomers) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('business_id', profile.business_id)
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(5)

        if (customers) {
          customers.forEach((customer: any) => {
            searchResults.push({
              id: customer.id,
              type: 'customer',
              title: customer.name,
              subtitle: customer.email || customer.phone,
              url: profile.role === 'admin'
                ? `/admin/customers/${customer.id}`
                : `/tech/customers/${customer.id}`,
            })
          })
        }

        // Search invoices (admin only)
      }

      if (profile.role === 'admin') {
        // Search invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, total, status, customers(name)')
          .eq('business_id', profile.business_id)
          .or(`invoice_number.ilike.%${searchQuery}%`)
          .limit(5)

        if (invoices) {
          invoices.forEach((invoice: any) => {
            searchResults.push({
              id: invoice.id,
              type: 'invoice',
              title: invoice.invoice_number,
              subtitle: invoice.customers?.name || 'No customer',
              url: `/admin/invoices/${invoice.id}`,
              metadata: `$${parseFloat(invoice.total.toString()).toFixed(2)} • ${invoice.status}`,
            })
          })
        }
      }

      setResults(searchResults)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSelect = useCallback((result: SearchResult) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))

    router.push(result.url)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [query, recentSearches, router])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSelect, isOpen, results, selectedIndex])

  const getIcon = (type: string) => {
    switch (type) {
      case 'job':
        return <Briefcase className="w-4 h-4" />
      case 'customer':
        return <Users className="w-4 h-4" />
      case 'invoice':
        return <FileText className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'job':
        return 'bg-primary/10 text-primary'
      case 'customer':
        return 'bg-success/10 text-success'
      case 'invoice':
        return 'bg-warning/10 text-warning'
      default:
        return 'bg-surface-200 text-surface-600'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 animate-slide-down">
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-surface-200 dark:border-surface-700">
            <Search className="w-5 h-5 text-surface-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, customers, invoices..."
              className="flex-1 bg-transparent border-none outline-none text-ink dark:text-surface-100 placeholder-surface-400"
            />
            {loading && <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink dark:text-surface-100 truncate">
                          {result.title}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                          {result.type}
                        </span>
                      </div>
                      <p className="text-sm text-surface-500 truncate">{result.subtitle}</p>
                      {result.metadata && (
                        <p className="text-xs text-surface-400 mt-1">{result.metadata}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-6">
                <EmptySearch
                  query={query}
                  onClear={() => setQuery('')}
                />
              </div>
            ) : (
              <div className="p-4">
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 px-2">
                      Recent Searches
                    </p>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-left"
                      >
                        <Clock className="w-4 h-4 text-surface-400" />
                        <span className="text-sm text-surface-600 dark:text-surface-300">{search}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-surface-400 px-2">
                  Start typing to search across jobs, customers, and invoices
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
            <div className="flex items-center gap-4 text-xs text-surface-500">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded text-xs">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded text-xs">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded text-xs">esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
