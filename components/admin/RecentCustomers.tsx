'use client'

import { useMemo } from 'react'
import { ChevronRight, CheckCircle2 } from '@/components/ui/lucide'
import Link from 'next/link'
import type { JobWithDetails } from '@/lib/types'

interface RecentCustomersProps {
  jobs: JobWithDetails[]
}

interface CustomerProgress {
  id: string
  name: string
  role: string
  avatar?: string
  completedJobs: number
  totalJobs: number
}

export default function RecentCustomers({ jobs }: RecentCustomersProps) {
  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerProgress>()

    jobs.forEach(job => {
      if (job.customer) {
        const customerId = job.customer.id
        const existing = customerMap.get(customerId)

        if (existing) {
          existing.totalJobs += 1
          if (job.status === 'completed') {
            existing.completedJobs += 1
          }
        } else {
          customerMap.set(customerId, {
            id: customerId,
            name: job.customer.name || 'Customer',
            role: 'Customer', // Could be derived from customer type
            avatar: undefined,
            completedJobs: job.status === 'completed' ? 1 : 0,
            totalJobs: 1,
          })
        }
      }
    })

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalJobs - a.totalJobs) // Sort by most jobs
      .slice(0, 4) // Show top 4 customers
  }, [jobs])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)',
          color: 'var(--gray-900)',
        }}>
          Top Customers
        </h2>

        <Link
          href="/admin/customers"
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 'var(--font-medium)',
            color: 'var(--gray-500)',
            transition: 'var(--transition-base)',
          }}
          className="flex items-center gap-1 hover:text-[#111827]"
        >
          View all
          <ChevronRight style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
        </Link>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-2 gap-3">
        {customers.length === 0 ? (
          <div
            style={{
              gridColumn: 'span 2',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-6)',
              textAlign: 'center',
            }}
          >
            <p style={{
              fontSize: 'var(--text-md)',
              color: 'var(--gray-500)',
            }}>
              No customer data available
            </p>
          </div>
        ) : (
          customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/admin/customers/${customer.id}`}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--spacing-5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'var(--transition-base)',
              }}
              className="cursor-pointer hover:-translate-y-1 hover:shadow-md"
            >
              {/* Avatar */}
              <div style={{
                width: 'var(--avatar-xl)',
                height: 'var(--avatar-xl)',
                borderRadius: 'var(--radius-full)',
                border: '2px solid var(--gray-100)',
                background: 'linear-gradient(135deg, #34D399, #10B981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                color: 'white',
                marginBottom: 'var(--spacing-3)',
              }}>
                {customer.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--gray-900)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}>
                {customer.name}
              </div>

              {/* Role */}
              <div style={{
                fontSize: 'var(--text-base)',
                color: 'var(--gray-500)',
                textAlign: 'center',
                marginBottom: 'var(--spacing-3)',
              }}>
                {customer.role}
              </div>

              {/* Progress Badge */}
              <div
                style={{
                  background: 'var(--gray-100)',
                  height: '28px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1)',
                }}
              >
                <CheckCircle2
                  style={{
                    width: 'var(--icon-xs)',
                    height: 'var(--icon-xs)',
                    color: 'var(--gray-400)',
                  }}
                />
                <span style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  color: 'var(--gray-600)',
                }}>
                  {customer.completedJobs}/{customer.totalJobs} jobs done
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}


