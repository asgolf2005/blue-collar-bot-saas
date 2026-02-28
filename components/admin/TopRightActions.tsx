'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

/**
 * Standardized top-right action button system
 * Matches the visual language from /admin/jobs
 * - Muted futuristic styling (not loud neon)
 * - Consistent typography, border, radius
 * - Same hover behavior across all admin pages
 */

export type ActionVariant = 'primary' | 'secondary' | 'ghost' | 'accent'

interface BaseProps {
  className?: string
  children: React.ReactNode
}

interface ActionButtonProps extends BaseProps {
  onClick?: () => void
  variant?: ActionVariant
  type?: 'button' | 'submit'
  disabled?: boolean
  icon?: React.ReactNode
}

interface ActionLinkProps extends BaseProps {
  href: string
  variant?: ActionVariant
  icon?: React.ReactNode
}

// Core button styles matching /admin/jobs pattern
const buttonBase = `
  inline-flex items-center justify-center gap-2
  px-4 py-2
  rounded-full
  font-mono text-xs font-semibold uppercase tracking-wider
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-2 focus:ring-offset-slate-900
  disabled:opacity-50 disabled:cursor-not-allowed
`

const variants: Record<ActionVariant, string> = {
  // Primary: For main CTAs (Create Job, New Service, etc.)
  primary: `
    bg-cyan-600 text-white
    hover:bg-cyan-500
    border border-transparent
    shadow-[0_0_20px_rgba(6,182,212,0.3)]
    hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]
  `,
  // Secondary: For important but not primary actions
  secondary: `
    bg-slate-800 text-slate-200
    hover:bg-slate-700
    border border-slate-700
    hover:border-slate-600
  `,
  // Ghost: For subtle actions (Archive, Filters, etc.)
  ghost: `
    bg-transparent text-slate-400
    hover:text-slate-200 hover:bg-slate-800/50
    border border-slate-700/50
    hover:border-slate-600
  `,
  // Accent: For special highlighted actions
  accent: `
    bg-emerald-600/20 text-emerald-400
    hover:bg-emerald-600/30
    border border-emerald-500/30
    hover:border-emerald-500/50
  `,
}

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  icon,
  className,
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(buttonBase, variants[variant], className)}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  )
}

export function ActionLink({
  href,
  children,
  variant = 'primary',
  icon,
  className,
}: ActionLinkProps) {
  return (
    <Link href={href} className={cn(buttonBase, variants[variant], className)}>
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </Link>
  )
}

// Icon-only variant for compact actions
interface IconActionProps {
  href?: string
  onClick?: () => void
  icon: React.ReactNode
  label: string
  variant?: ActionVariant
  className?: string
  badge?: number
}

const iconButtonBase = `
  inline-flex items-center justify-center
  h-9 w-9
  rounded-full
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-2 focus:ring-offset-slate-900
`

const iconVariants: Record<ActionVariant, string> = {
  primary: `
    bg-cyan-600 text-white hover:bg-cyan-500
    border border-transparent
    shadow-[0_0_15px_rgba(6,182,212,0.25)]
  `,
  secondary: `
    bg-slate-800 text-slate-300 hover:bg-slate-700
    border border-slate-700 hover:border-slate-600
  `,
  ghost: `
    bg-transparent text-slate-400 hover:text-slate-200
    border border-slate-700/50 hover:border-slate-600
  `,
  accent: `
    bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30
    border border-emerald-500/30
  `,
}

export function IconAction({
  href,
  onClick,
  icon,
  label,
  variant = 'ghost',
  className,
  badge,
}: IconActionProps) {
  const content = (
    <>
      <span className="w-4 h-4">{icon}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1 -top-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-cyan-600 px-1 font-mono text-[9px] text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  )

  const classes = cn(iconButtonBase, iconVariants[variant], 'relative', className)

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label} title={label}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      aria-label={label}
      title={label}
    >
      {content}
    </button>
  )
}

// Strip-style status buttons (like SCHED/ACTIVE/DONE/ALL TIME on jobs page)
interface StatusStripProps {
  items: Array<{
    label: string
    count: number | string
    href?: string
    isActive?: boolean
    color?: 'cyan' | 'emerald' | 'amber' | 'slate'
  }>
  className?: string
}

export function StatusStrip({ items, className }: StatusStripProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1.5 rounded-full",
      "bg-slate-900/80 border border-slate-700/50",
      className
    )}>
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-slate-600">|</span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                item.isActive 
                  ? "bg-slate-800 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <StatusDot color={item.color} />
              <span className="font-mono text-[10px] uppercase tracking-wider">{item.label}</span>
              <span className="font-mono text-xs font-semibold text-white">{item.count}</span>
            </Link>
          ) : (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1",
              item.isActive && "bg-slate-800 rounded-md"
            )}>
              <StatusDot color={item.color} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{item.label}</span>
              <span className="font-mono text-xs font-semibold text-white">{item.count}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusDot({ color }: { color?: 'cyan' | 'emerald' | 'amber' | 'slate' }) {
  const colors = {
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-500',
  }
  return (
    <span className={cn("w-1.5 h-1.5 rounded-full", colors[color || 'slate'])} />
  )
}

// Container for right-aligned actions
interface ActionsContainerProps {
  children: React.ReactNode
  className?: string
}

export function ActionsContainer({ children, className }: ActionsContainerProps) {
  return (
    <div className={cn(
      "flex flex-col items-start sm:items-end gap-2",
      className
    )}>
      {children}
    </div>
  )
}
