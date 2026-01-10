import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseStyles = 'bg-surface-200 dark:bg-surface-700'

  const variantStyles = {
    default: 'rounded-lg',
    circular: 'rounded-full',
    rectangular: 'rounded-none'
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 dark:from-surface-700 dark:via-surface-600 dark:to-surface-700 bg-[length:200%_100%]',
    none: ''
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      aria-live="polite"
      aria-busy="true"
    />
  )
}
