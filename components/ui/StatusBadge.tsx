'use client'

import { cn } from '@/lib/utils'

type StatusVariant = 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'on_way' 
  | 'arrived'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'

type StatusSize = 'sm' | 'md' | 'lg'

interface StatusBadgeProps {
  status: StatusVariant | string
  size?: StatusSize
  pulse?: boolean
  className?: string
}

const statusConfig: Record<string, { 
  label: string
  bgColor: string
  borderColor: string
  textColor: string
  glowColor?: string
}> = {
  scheduled: {
    label: 'Scheduled',
    bgColor: 'rgba(34, 211, 238, 0.1)',
    borderColor: 'rgba(34, 211, 238, 0.4)',
    textColor: 'rgb(34, 211, 238)',
    glowColor: 'rgba(34, 211, 238, 0.3)',
  },
  in_progress: {
    label: 'In Progress',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    textColor: 'rgb(59, 130, 246)',
    glowColor: 'rgba(59, 130, 246, 0.3)',
  },
  completed: {
    label: 'Completed',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    textColor: 'rgb(16, 185, 129)',
    glowColor: 'rgba(16, 185, 129, 0.3)',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    textColor: 'rgb(244, 63, 94)',
    glowColor: 'rgba(244, 63, 94, 0.3)',
  },
  on_way: {
    label: 'On the Way',
    bgColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    textColor: 'rgb(251, 191, 36)',
    glowColor: 'rgba(251, 191, 36, 0.3)',
  },
  arrived: {
    label: 'Arrived',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    textColor: 'rgb(139, 92, 246)',
    glowColor: 'rgba(139, 92, 246, 0.3)',
  },
  pending: {
    label: 'Pending',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: 'rgba(156, 163, 175, 0.4)',
    textColor: 'rgb(156, 163, 175)',
  },
  active: {
    label: 'Active',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    textColor: 'rgb(16, 185, 129)',
    glowColor: 'rgba(16, 185, 129, 0.3)',
  },
  inactive: {
    label: 'Inactive',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.4)',
    textColor: 'rgb(107, 114, 128)',
  },
  success: {
    label: 'Success',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    textColor: 'rgb(16, 185, 129)',
    glowColor: 'rgba(16, 185, 129, 0.3)',
  },
  warning: {
    label: 'Warning',
    bgColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    textColor: 'rgb(251, 191, 36)',
    glowColor: 'rgba(251, 191, 36, 0.3)',
  },
  error: {
    label: 'Error',
    bgColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    textColor: 'rgb(244, 63, 94)',
    glowColor: 'rgba(244, 63, 94, 0.3)',
  },
  info: {
    label: 'Info',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    textColor: 'rgb(59, 130, 246)',
    glowColor: 'rgba(59, 130, 246, 0.3)',
  },
}

const sizeConfig: Record<StatusSize, { padding: string; fontSize: string; height: string }> = {
  sm: {
    padding: 'px-2.5 py-0.5',
    fontSize: 'text-xs',
    height: 'h-6',
  },
  md: {
    padding: 'px-3 py-1',
    fontSize: 'text-sm',
    height: 'h-7',
  },
  lg: {
    padding: 'px-4 py-1.5',
    fontSize: 'text-sm',
    height: 'h-8',
  },
}

export default function StatusBadge({ 
  status, 
  size = 'md', 
  pulse = false,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    bgColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: 'rgba(156, 163, 175, 0.4)',
    textColor: 'rgb(156, 163, 175)',
  }
  
  const sizeStyles = sizeConfig[size]
  const shouldPulse = pulse && ['in_progress', 'on_way', 'active', 'scheduled'].includes(status)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-mono font-medium whitespace-nowrap transition-all duration-200',
        sizeStyles.padding,
        sizeStyles.fontSize,
        sizeStyles.height,
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        color: config.textColor,
        boxShadow: shouldPulse ? `0 0 12px ${config.glowColor}` : 'none',
      }}
    >
      {shouldPulse && (
        <span 
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ 
            backgroundColor: config.textColor,
            boxShadow: `0 0 6px ${config.textColor}`,
          }}
        />
      )}
      <span>{config.label}</span>
    </span>
  )
}
