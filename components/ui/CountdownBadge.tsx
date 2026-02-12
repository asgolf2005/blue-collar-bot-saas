interface CountdownBadgeProps {
  countdown: string
  variant?: 'default' | 'urgent'
}

export default function CountdownBadge({ countdown, variant = 'default' }: CountdownBadgeProps) {
  const isUrgent = variant === 'urgent'

  return (
    <div className="absolute top-3 right-3 h-6 px-2.5 py-1 bg-white/90 dark:bg-surface/90 rounded-sm flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isUrgent ? 'bg-danger-500' : 'bg-success-400'}`} />
      <span className={`text-[11px] font-semibold ${isUrgent ? 'text-warning-700 dark:text-warning-400' : 'text-surface-700 dark:text-surface-300'}`}>
        in {countdown}
      </span>
    </div>
  )
}
