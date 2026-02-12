'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface BlueprintCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'subtle'
  cornerAccent?: boolean
  children?: React.ReactNode
}

/**
 * BlueprintCard - Industrial Futurism card component
 * Used for containers, stat cards, and content panels
 */
export const BlueprintCard = React.forwardRef<HTMLDivElement, BlueprintCardProps>(
  ({ className, variant = 'default', cornerAccent = false, children, ...props }, ref) => {
    const baseClasses = 'relative rounded-lg overflow-hidden'
    
    const variantClasses = {
      default: 'bg-[#1a1f2e] border border-blue-500/20',
      glow: 'bg-[#1a1f2e] border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      subtle: 'bg-[#1a1f2e]/60 border border-blue-500/10',
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {/* Corner accent for industrial look */}
        {cornerAccent && (
          <>
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-blue-500/40" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-500/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-500/40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-blue-500/40" />
          </>
        )}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)
BlueprintCard.displayName = 'BlueprintCard'

export default BlueprintCard
