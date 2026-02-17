'use client'

import { ReactNode } from 'react'

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  children: ReactNode
}

export default function BulkActionBar({ selectedCount, onClear, children }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-2xl shadow-2xl border border-primary/20 px-6 py-4 flex items-center gap-6">
        {/* Selection Count */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-sm font-bold">{selectedCount}</span>
          </div>
          <span className="font-medium">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/20" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {children}
        </div>

        {/* Clear Button */}
        <button type="button"
          onClick={onClear}
          className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Clear selection"
        >
          <span className="text-xs font-semibold">Clear</span>
        </button>
      </div>
    </div>
  )
}

interface BulkActionButtonProps {
  icon?: ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

export function BulkActionButton({ icon, label, onClick, variant = 'default' }: BulkActionButtonProps) {
  const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all"
  const variantClasses = variant === 'danger'
    ? "bg-red-500 hover:bg-red-600 text-white"
    : "bg-white/20 hover:bg-white/30 backdrop-blur"

  return (
    <button type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClasses}`}
    >
      {icon ? icon : null}
      {label}
    </button>
  )
}
