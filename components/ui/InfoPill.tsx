import { ReactNode } from 'react'

interface InfoPillProps {
  icon: ReactNode
  children: ReactNode
  variant?: 'default' | 'urgent'
  maxWidth?: string
}

export default function InfoPill({ icon, children, variant = 'default', maxWidth }: InfoPillProps) {
  const isUrgent = variant === 'urgent'

  return (
    <div
      className={`h-8 px-3 py-1.5 rounded-md flex items-center gap-1 ${
        isUrgent ? 'bg-white/70 dark:bg-surface/70' : 'bg-white dark:bg-surface'
      }`}
      style={maxWidth ? { maxWidth } : undefined}
    >
      <div className={`w-3.5 h-3.5 flex-shrink-0 ${isUrgent ? 'text-warning-800 dark:text-warning-400' : 'text-muted'}`}>
        {icon}
      </div>
      <span
        className={`text-[13px] font-medium ${
          isUrgent ? 'text-warning-900 dark:text-warning-300' : 'text-surface-700 dark:text-surface-300'
        } ${maxWidth ? 'overflow-hidden text-ellipsis whitespace-nowrap' : ''}`}
      >
        {children}
      </span>
    </div>
  )
}
