'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'success' | 'info' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  }

  const iconSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  const iconWrapperSizes = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  }

  const variantColors = {
    default: {
      bg: 'bg-surface-100 dark:bg-surface-800',
      icon: 'text-muted',
      border: 'border-surface-200 dark:border-surface-700'
    },
    success: {
      bg: 'bg-success/10 dark:bg-success/20',
      icon: 'text-success',
      border: 'border-success/20'
    },
    info: {
      bg: 'bg-primary/10 dark:bg-primary/20',
      icon: 'text-primary',
      border: 'border-primary/20'
    },
    warning: {
      bg: 'bg-warning/10 dark:bg-warning/20',
      icon: 'text-warning',
      border: 'border-warning/20'
    }
  }

  return (
    <div className={cn('text-center', sizeClasses[size], className)}>
      {/* Decorative background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none overflow-hidden">
        <div className="w-64 h-64 scale-150">
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            'rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-300',
            iconWrapperSizes[size],
            variantColors[variant].bg,
            variantColors[variant].border
          )}>
            <div className={cn(
              iconSizes[size],
              variantColors[variant].icon
            )}>
              {icon}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          'font-semibold text-ink mb-2',
          size === 'lg' ? 'text-xl' : size === 'md' ? 'text-lg' : 'text-base'
        )}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className={cn(
            'text-muted max-w-md mx-auto',
            size === 'lg' ? 'text-base' : 'text-sm'
          )}>
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center justify-center gap-3 mt-6">
            {action && (
              <button
                onClick={action.onClick}
                className={cn(
                  'px-4 py-2 rounded-xl font-medium transition-all duration-200',
                  action.variant === 'secondary'
                    ? 'glass-btn-secondary'
                    : 'glass-btn-primary'
                )}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Specific Empty State Components

interface EmptyJobsProps {
  onCreateJob?: () => void
  onViewArchived?: () => void
}

export function EmptyJobs({ onCreateJob, onViewArchived }: EmptyJobsProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      }
      title="No jobs yet"
      description="Create your first job to start managing your service business."
      action={onCreateJob ? {
        label: "Create Job",
        onClick: onCreateJob,
        variant: 'primary'
      } : undefined}
      secondaryAction={onViewArchived ? {
        label: "View archived jobs",
        onClick: onViewArchived
      } : undefined}
      variant="info"
      size="md"
    />
  )
}

interface EmptyCustomersProps {
  onCreateCustomer?: () => void
  onImport?: () => void
}

export function EmptyCustomers({ onCreateCustomer, onImport }: EmptyCustomersProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      }
      title="No customers yet"
      description="Add your first customer to start building your client database."
      action={onCreateCustomer ? {
        label: "Add Customer",
        onClick: onCreateCustomer,
        variant: 'primary'
      } : undefined}
      secondaryAction={onImport ? {
        label: "Import from CSV",
        onClick: onImport
      } : undefined}
      variant="success"
      size="md"
    />
  )
}

interface EmptyInvoicesProps {
  onCreateInvoice?: () => void
}

export function EmptyInvoices({ onCreateInvoice }: EmptyInvoicesProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      }
      title="No invoices yet"
      description="Create your first invoice to start tracking payments and revenue."
      action={onCreateInvoice ? {
        label: "Create Invoice",
        onClick: onCreateInvoice,
        variant: 'primary'
      } : undefined}
      variant="warning"
      size="md"
    />
  )
}

interface EmptySearchProps {
  query: string
  onClear?: () => void
}

export function EmptySearch({ query, onClear }: EmptySearchProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      }
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
      action={onClear ? {
        label: "Clear Search",
        onClick: onClear,
        variant: 'secondary'
      } : undefined}
      variant="default"
      size="sm"
    />
  )
}

interface EmptyNotificationsProps {
  onViewArchived?: () => void
}

export function EmptyNotifications({ onViewArchived }: EmptyNotificationsProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      }
      title="All caught up!"
      description="You have no new notifications. Check back later for updates."
      secondaryAction={onViewArchived ? {
        label: "View archived notifications",
        onClick: onViewArchived
      } : undefined}
      variant="success"
      size="sm"
    />
  )
}

interface EmptyStatsProps {
  onCreateJob?: () => void
}

export function EmptyStats({ onCreateJob }: EmptyStatsProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      }
      title="No stats yet"
      description="Complete some jobs to see your performance statistics and earnings."
      action={onCreateJob ? {
        label: "Create Job",
        onClick: onCreateJob,
        variant: 'primary'
      } : undefined}
      variant="info"
      size="md"
    />
  )
}

interface EmptyServicesProps {
  onCreateService?: () => void
}

export function EmptyServices({ onCreateService }: EmptyServicesProps) {
  return (
    <EmptyState
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      }
      title="No services yet"
      description="Add your first service to start offering it to customers and tracking bookings."
      action={onCreateService ? {
        label: "Add Service",
        onClick: onCreateService,
        variant: 'primary'
      } : undefined}
      variant="info"
      size="md"
    />
  )
}
