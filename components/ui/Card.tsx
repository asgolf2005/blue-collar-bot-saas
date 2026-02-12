'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge class names
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Card variants for different use cases
export type CardVariant = 'default' | 'hover' | 'featured' | 'dark'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

/**
 * Main Card component with multiple variants
 *
 * @example
 * // Standard card
 * <Card>
 *   <CardContent>Content here</CardContent>
 * </Card>
 *
 * // Interactive hover card
 * <Card variant="hover">
 *   <CardContent>Clickable content</CardContent>
 * </Card>
 *
 * // Featured card with light blue background
 * <Card variant="featured">
 *   <CardContent>Highlighted content</CardContent>
 * </Card>
 *
 * // Dark card
 * <Card variant="dark">
 *   <CardContent>Dark themed content</CardContent>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white border border-border shadow-sm',
      hover:
        'bg-white border border-border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300',
      featured: 'bg-electric-50 border border-electric-200 shadow-sm',
      dark: 'bg-surface-900 text-white border border-surface-800 shadow-sm',
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-xl p-6', variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

export interface CardHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}

/**
 * CardHeader component with optional title, subtitle, and action
 *
 * @example
 * <CardHeader
 *   title="Job Details"
 *   subtitle="Scheduled for tomorrow"
 *   action={<Button size="sm">Edit</Button>}
 * />
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between gap-4 mb-4', className)}
        {...props}
      >
        {icon && <div className="flex-shrink-0 text-gray-400">{icon}</div>}
        {(title || subtitle) && (
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-inherit truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted mt-1">{subtitle}</p>
            )}
          </div>
        )}
        {children}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )
  }
)
CardHeader.displayName = 'CardHeader'

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean
}

/**
 * CardContent component for the main body of the card
 *
 * @example
 * <CardContent>
 *   <p>Your content here</p>
 * </CardContent>
 *
 * // Without default padding
 * <CardContent noPadding>
 *   <p>Custom padded content</p>
 * </CardContent>
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(!noPadding && 'space-y-4', className)}
        {...props}
      />
    )
  }
)
CardContent.displayName = 'CardContent'

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between'
}

/**
 * CardFooter component for actions at the bottom of the card
 *
 * @example
 * <CardFooter>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button>Save</Button>
 * </CardFooter>
 *
 * // With custom justification
 * <CardFooter justify="end">
 *   <Button>Action</Button>
 * </CardFooter>
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, justify = 'start', ...props }, ref) => {
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 mt-4 pt-4 border-t border-border/50',
          justifyClasses[justify],
          className
        )}
        {...props}
      />
    )
  }
)
CardFooter.displayName = 'CardFooter'

// Compound component exports
export { Card, CardHeader, CardContent, CardFooter }

// Default export for convenience
export default Card
