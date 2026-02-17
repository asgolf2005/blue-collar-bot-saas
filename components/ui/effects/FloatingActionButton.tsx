'use client'

import { useState, ReactNode, createElement, isValidElement } from 'react'
import { Plus, X } from '@/components/ui/icons'
import Link from 'next/link'

interface Action {
  icon: React.ComponentType<{ className?: string }> | ReactNode
  label: string
  onClick?: () => void
  href?: string
  color?: 'primary' | 'accent' | 'success' | string
}

interface FloatingActionButtonProps {
  actions: Action[]
  position?: 'bottom-right' | 'bottom-left'
}

const colorClasses = {
  primary: 'from-[#2563eb] to-[#1d4ed8] shadow-[0_0_20px_rgba(37,99,235,0.4)]',
  accent: 'from-[#f59e0b] to-[#d97706] shadow-[0_0_20px_rgba(245,158,11,0.4)]',
  success: 'from-[#10b981] to-[#059669] shadow-[0_0_20px_rgba(16,185,129,0.4)]',
}

// Helper to render icon - handles both component types and ReactNodes
function renderIcon(icon: Action['icon']) {
  // If it's already a valid React element, return it
  if (isValidElement(icon)) {
    return icon
  }
  // If it's a component (function or forwardRef), create element
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in icon)) {
    return createElement(icon as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5' })
  }
  // Fallback
  return icon as ReactNode
}

export function FloatingActionButton({ actions, position = 'bottom-right' }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  }

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      {/* Action buttons */}
      <div className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, i) => {
          const colorClass = action.color && typeof action.color === 'string' && action.color.startsWith('bg-')
            ? action.color
            : `bg-gradient-to-br ${colorClasses[action.color as keyof typeof colorClasses] || colorClasses.primary}`

          const buttonContent = (
            <>
              {renderIcon(action.icon)}
              {/* Tooltip */}
              <span className={`absolute ${position === 'bottom-right' ? 'right-full mr-3' : 'left-full ml-3'}
                              px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg
                              opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                {action.label}
              </span>
            </>
          )

          const buttonClass = `group w-12 h-12 rounded-2xl ${colorClass}
                             flex items-center justify-center text-white
                             hover:scale-110 transition-all duration-300 relative shadow-lg`

          if (action.href) {
            return (
              <Link
                key={i}
                href={action.href}
                className={buttonClass}
                style={{ transitionDelay: `${i * 50}ms` }}
                onClick={() => setIsOpen(false)}
              >
                {buttonContent}
              </Link>
            )
          }

          return (
            <button type="button"
              key={i}
              onClick={() => {
                action.onClick?.()
                setIsOpen(false)
              }}
              className={buttonClass}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              {buttonContent}
            </button>
          )
        })}
      </div>

      {/* Main FAB */}
      <button type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8]
                   flex items-center justify-center text-white
                   shadow-[0_0_30px_rgba(37,99,235,0.5)]
                   hover:scale-110 hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]
                   transition-all duration-300 relative overflow-hidden group`}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-2xl bg-[#2563eb] opacity-30 animate-ping" />

        {/* Shimmer */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Icon */}
        <span className={`relative z-10 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </span>
      </button>
    </div>
  )
}

