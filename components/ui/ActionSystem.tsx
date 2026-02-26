'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ActionStyle = 'industrial' | 'editorial' | 'ambient'
export type ActionIntent = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ActionSize = 'xs' | 'sm' | 'md'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  stylePreset?: ActionStyle
  intent?: ActionIntent
  size?: ActionSize
  icon?: ReactNode
}

interface ActionIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  stylePreset?: ActionStyle
  intent?: ActionIntent
  size?: ActionSize
  icon: ReactNode
}

interface FilterChipProps {
  label: string
  onRemove?: () => void
  stylePreset?: ActionStyle
  className?: string
}

const sizeClasses: Record<ActionSize, string> = {
  xs: 'h-7 px-2.5 text-[10px]',
  sm: 'h-8 px-3 text-[11px]',
  md: 'h-9 px-4 text-xs',
}

const iconSizeClasses: Record<ActionSize, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

const baseActionClass =
  'inline-flex items-center justify-center gap-1.5 rounded-full font-sans font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50'

const styleIntentClass: Record<ActionStyle, Record<ActionIntent, string>> = {
  industrial: {
    primary:
      'border border-cyan-400/55 bg-slate-900 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)] hover:bg-cyan-500/10 dark:border-cyan-300/60',
    secondary:
      'border border-slate-500/70 bg-slate-900 text-slate-200 hover:bg-slate-800 dark:border-slate-600 dark:text-slate-100',
    ghost:
      'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70',
    danger:
      'border border-rose-400/60 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300',
    success:
      'border border-emerald-400/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300',
  },
  editorial: {
    primary:
      'rounded-md border-2 border-slate-900 bg-white text-slate-900 uppercase tracking-[0.08em] hover:bg-slate-100 dark:border-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    secondary:
      'rounded-md border border-slate-400 bg-white text-slate-700 uppercase tracking-[0.06em] hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost:
      'rounded-md border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    danger:
      'rounded-md border border-rose-500 bg-white text-rose-700 hover:bg-rose-50 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-900/20',
    success:
      'rounded-md border border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-900/20',
  },
  ambient: {
    primary:
      'border border-cyan-300/50 bg-gradient-to-r from-sky-400/90 via-cyan-400/90 to-emerald-400/90 text-slate-950 shadow-[0_12px_28px_-18px_rgba(6,182,212,0.95)] hover:brightness-110',
    secondary:
      'border border-slate-300/80 bg-white/80 text-slate-800 backdrop-blur-md hover:bg-white dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700/70',
    ghost:
      'border border-transparent bg-transparent text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-slate-800/60',
    danger:
      'border border-rose-300/70 bg-rose-100/75 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25',
    success:
      'border border-emerald-300/70 bg-emerald-100/75 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25',
  },
}

export function ActionButton({
  stylePreset = 'industrial',
  intent = 'primary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(baseActionClass, sizeClasses[size], styleIntentClass[stylePreset][intent], className)}
      {...props}
    >
      {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
      {children}
    </button>
  )
}

export function ActionIconButton({
  stylePreset = 'industrial',
  intent = 'secondary',
  size = 'md',
  icon,
  className,
  type = 'button',
  ...props
}: ActionIconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        baseActionClass,
        iconSizeClasses[size],
        styleIntentClass[stylePreset][intent],
        'p-0',
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center justify-center">{icon}</span>
    </button>
  )
}

export function ActionFilterChip({
  label,
  onRemove,
  stylePreset = 'industrial',
  className,
}: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[10px]',
        stylePreset === 'editorial'
          ? 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
          : stylePreset === 'ambient'
          ? 'border-slate-300/80 bg-white/80 text-slate-700 backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200'
          : 'border-slate-200/80 bg-white/80 text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300',
        className
      )}
    >
      <span className="truncate max-w-[160px]">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-current opacity-70 transition hover:opacity-100"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}
