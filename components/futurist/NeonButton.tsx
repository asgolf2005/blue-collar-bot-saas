'use client'

import * as React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  fullWidth?: boolean
}

/**
 * NeonButton - Glowing button component for Industrial Futurism design
 */
export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    icon, 
    fullWidth = false,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = 'relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group'
    
    const variantClasses = {
      primary: [
        'bg-blue-600/20 text-blue-400 border border-blue-500/50',
        'hover:bg-blue-600/30 hover:border-blue-400 hover:text-blue-300',
        'hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        'active:scale-[0.98]',
      ],
      secondary: [
        'bg-[#1a1f2e] text-slate-300 border border-blue-500/30',
        'hover:bg-[#1a1f2e]/80 hover:border-blue-400/50 hover:text-slate-200',
        'active:scale-[0.98]',
      ],
      ghost: [
        'bg-transparent text-slate-400 border border-transparent',
        'hover:text-slate-200 hover:bg-slate-800/50',
        'active:scale-[0.98]',
      ],
    }

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-md h-8',
      md: 'px-4 py-2 text-sm rounded-lg h-10',
      lg: 'px-6 py-3 text-base rounded-lg h-12',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {/* Glow effect overlay */}
        {variant === 'primary' && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        )}
        
        {icon && (
          <span className="relative z-10 flex items-center shrink-0">
            {icon}
          </span>
        )}
        <span className="relative z-10">{children}</span>
      </button>
    )
  }
)
NeonButton.displayName = 'NeonButton'

export default NeonButton
