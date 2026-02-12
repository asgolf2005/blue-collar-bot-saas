import { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  change?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'profit' | 'danger' | 'warning' | 'info'
  progress?: number
  withPulse?: boolean
}

const variantClasses = {
  default: 'metric-card',
  profit: 'metric-card-profit',
  danger: 'metric-card-loss',
  warning: 'metric-card',
  info: 'metric-card',
}

export default function MetricCard({
  label,
  value,
  icon,
  change,
  variant = 'default',
  progress,
  withPulse = false,
}: MetricCardProps) {
  const valueClass = change
    ? change.isPositive
      ? 'metric-value-profit'
      : 'metric-value-loss'
    : 'metric-value'

  return (
    <div className={variantClasses[variant]}>
      {/* Header with Icon */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="metric-label">{label}</div>
          <div className={valueClass}>
            {withPulse && (
              <span className="status-dot status-dot-active mr-2" />
            )}
            {value}
          </div>
        </div>
        {icon && (
          <div className="text-muted opacity-50">
            {icon}
          </div>
        )}
      </div>

      {/* Change Indicator */}
      {change && (
        <div
          className={
            change.isPositive
              ? 'metric-change metric-change-positive'
              : 'metric-change metric-change-negative'
          }
        >
          {change.isPositive ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
          {Math.abs(change.value)}%
        </div>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="data-bar mt-4">
          <div
            className={`data-bar-fill ${variant === 'profit' ? 'data-bar-profit' : ''}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
