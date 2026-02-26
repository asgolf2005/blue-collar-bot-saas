'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'

/**
 * Utility function to merge class names
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Button variants using class-variance-authority
 * Follows the new design system specifications
 */
const buttonVariants = cva(
  // Base styles - applied to all button variants
  [
    'relative inline-flex items-center justify-center gap-2',
    'whitespace-nowrap flex-nowrap',
    'font-medium transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      /**
       * Visual style variant
       */
      variant: {
        primary: [
          'bg-primary text-white',
          'border border-transparent',
          'shadow-sm',
          'hover:bg-primary/90',
          'hover:shadow-md',
          'hover:-translate-y-0.5',
          'focus:ring-primary/50',
        ],
        secondary: [
          'bg-white text-surface-700',
          'border border-gray-200',
          'shadow-sm',
          'hover:bg-gray-50',
          'hover:border-gray-300',
          'hover:-translate-y-0.5',
          'focus:ring-surface-400/50',
        ],
        outline: [
          'bg-transparent text-surface-700',
          'border border-gray-300',
          'shadow-sm',
          'hover:bg-gray-50',
          'hover:border-gray-400',
          'focus:ring-surface-400/50',
        ],
        danger: [
          'bg-danger text-white',
          'border border-transparent',
          'shadow-sm',
          'hover:bg-danger/90',
          'hover:shadow-md',
          'hover:-translate-y-0.5',
          'focus:ring-danger/50',
        ],
        ghost: [
          'bg-transparent text-surface-600',
          'border border-transparent',
          'hover:bg-gray-100',
          'hover:text-surface-700',
          'focus:ring-surface-400/50',
        ],
        glass: [
          'bg-white/80 text-slate-700',
          'dark:bg-slate-800/80 dark:text-slate-200',
          'backdrop-blur-sm',
          'border border-white/20 dark:border-slate-700/50',
          'shadow-sm',
          'hover:bg-white dark:hover:bg-slate-800',
          'hover:-translate-y-0.5 hover:shadow-md',
          'focus:ring-slate-400/50',
        ],
        glassPrimary: [
          'bg-blue-600/90 text-white',
          'dark:bg-cyan-500/90',
          'backdrop-blur-sm',
          'border border-blue-400/30 dark:border-cyan-400/30',
          'shadow-sm shadow-blue-500/20 dark:shadow-cyan-500/20',
          'hover:bg-blue-600 dark:hover:bg-cyan-500',
          'hover:-translate-y-0.5 hover:shadow-md',
          'focus:ring-blue-500/50 dark:focus:ring-cyan-500/50',
        ],
        industrial: [
          'bg-slate-900 text-cyan-200',
          'border border-cyan-400/55',
          'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]',
          'hover:bg-cyan-500/10',
          'focus:ring-cyan-400/50',
        ],
        editorial: [
          'bg-white text-slate-900',
          'border-2 border-slate-900',
          'uppercase tracking-[0.08em]',
          'hover:bg-slate-100',
          'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-100 dark:hover:bg-slate-800',
          'focus:ring-slate-500/40',
        ],
        ambient: [
          'bg-gradient-to-r from-sky-400/90 via-cyan-400/90 to-emerald-400/90 text-slate-950',
          'border border-cyan-300/50',
          'shadow-[0_12px_28px_-18px_rgba(6,182,212,0.95)]',
          'hover:brightness-110',
          'focus:ring-cyan-300/60',
        ],
        success: [
          'bg-emerald-500/15 text-emerald-700',
          'border border-emerald-400/60',
          'hover:bg-emerald-500/25',
          'dark:text-emerald-300',
          'focus:ring-emerald-400/50',
        ],
      },
      /**
       * Size variant
       */
      size: {
        xs: ['py-1 px-2.5 text-xs rounded-md', 'h-7'],
        sm: ['py-1.5 px-3 text-sm rounded-lg', 'h-8'],
        md: ['py-2.5 px-5 text-sm rounded-lg', 'h-10'],
        lg: ['py-3 px-6 text-base rounded-lg', 'h-12'],
        icon: ['p-0 rounded-full', 'h-9 w-9'],
      },
      /**
       * Full width option
       */
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      /**
       * Loading state - reduces opacity and prevents interaction
       */
      loading: {
        true: 'opacity-80 cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
)

/**
 * Props interface for the Button component
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Content inside the button */
  children: React.ReactNode
  /** Loading state - shows spinner and disables button */
  loading?: boolean
  /** Icon to display on the left side of the button content */
  icon?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Button Component
 *
 * A comprehensive, reusable button component with multiple variants, sizes,
 * and states. Supports loading states, icons, and full accessibility features.
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button>Click me</Button>
 *
 * // Secondary button with icon
 * <Button variant="secondary" icon={<Plus size={16} />}>
 *   Add Item
 * </Button>
 *
 * // Loading state
 * <Button loading>Saving...</Button>
 *
 * // Danger button
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete
 * </Button>
 *
 * // Ghost button
 * <Button variant="ghost">Cancel</Button>
 *
 * // Full width
 * <Button fullWidth>Submit</Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      icon,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          buttonVariants({
            variant,
            size,
            fullWidth,
            loading,
          }),
          className
        )}
        {...props}
      >
        {/* Loading spinner - shown when loading */}
        {loading && (
          <Loader2
            className="animate-spin shrink-0"
            size={size === 'lg' ? 20 : 16}
            aria-hidden="true"
          />
        )}

        {/* Icon - hidden when loading to avoid clutter */}
        {!loading && icon && (
          <span className="shrink-0 flex items-center" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Button text content */}
        <span className={loading ? 'opacity-90' : ''}>{children}</span>
      </button>
    )
  }
)

// Display name for debugging
Button.displayName = 'Button'

export { Button, buttonVariants }
export default Button

