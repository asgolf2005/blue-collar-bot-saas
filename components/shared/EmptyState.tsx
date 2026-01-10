import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'success' | 'info'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {/* Decorative background element */}
      {icon && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <div className="w-32 h-32">
            {icon}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative text-center">
        {/* Icon container with glassmorphism */}
        {icon && (
          <div className={`empty-state-icon ${
            variant === 'success' ? 'bg-gradient-to-br from-success/10 to-success/5 border-success/10' :
            variant === 'info' ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10' :
            ''
          }`}>
            <div className={`w-8 h-8 ${
              variant === 'success' ? 'text-success/40' :
              variant === 'info' ? 'text-primary/40' :
              'text-muted'
            }`}>
              {icon}
            </div>
          </div>
        )}

        {/* Message */}
        <h3 className="text-base font-medium text-ink/60 mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted">
            {description}
          </p>
        )}

        {/* Optional CTA */}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-4 glass-btn-ghost text-sm"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
