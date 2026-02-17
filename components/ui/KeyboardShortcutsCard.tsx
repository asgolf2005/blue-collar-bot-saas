'use client'

import { useState } from 'react'
import { Command, ChevronDown, ChevronUp } from '@/components/ui/icons'
import { cn } from '@/lib/utils/cn'

interface Shortcut {
  keys: string[]
  description: string
}

interface KeyboardShortcutsCardProps {
  role?: 'admin' | 'tech' | 'customer'
  className?: string
  defaultExpanded?: boolean
}

export default function KeyboardShortcutsCard({
  role = 'admin',
  className,
  defaultExpanded = false
}: KeyboardShortcutsCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const getShortcuts = (): Shortcut[] => {
    if (role === 'admin') {
      return [
        { keys: ['âŒ˜', 'K'], description: 'Search' },
        { keys: ['?'], description: 'Show all shortcuts' },
        { keys: ['G', 'J'], description: 'Go to Jobs' },
        { keys: ['G', 'C'], description: 'Go to Customers' },
        { keys: ['G', 'I'], description: 'Go to Invoices' },
        { keys: ['G', 'A'], description: 'Go to Analytics' },
        { keys: ['âŒ˜', 'â‡§', 'N'], description: 'New Job' },
        { keys: ['âŒ˜', 'â‡§', 'C'], description: 'New Customer' },
      ]
    }

    if (role === 'tech') {
      return [
        { keys: ['âŒ˜', 'K'], description: 'Search' },
        { keys: ['?'], description: 'Show all shortcuts' },
        { keys: ['G', 'T'], description: 'Go to Today' },
        { keys: ['G', 'D'], description: 'Go to Dashboard' },
        { keys: ['G', 'S'], description: 'Go to Schedule' },
      ]
    }

    // Customer role
    return [
      { keys: ['âŒ˜', 'K'], description: 'Search' },
      { keys: ['?'], description: 'Show all shortcuts' },
    ]
  }

  const shortcuts = getShortcuts()

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      {/* Header */}
      <button type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Command className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink">Keyboard Shortcuts</h3>
            <p className="text-xs text-muted">Work faster with hotkeys</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {/* Shortcuts List */}
      {isExpanded && (
        <div className="px-5 pb-4 space-y-2 animate-slide-down">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <span className="text-sm text-ink">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className="min-w-[24px] h-6 px-1.5 flex items-center justify-center text-xs font-semibold text-ink bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}

          {/* Footer hint */}
          <div className="pt-3 mt-2 border-t border-surface-200 dark:border-surface-700">
            <p className="text-xs text-muted flex items-center gap-2">
              <Command className="w-3 h-3" />
              Press <kbd className="px-1 py-0.5 text-xs bg-surface-200 dark:bg-surface-700 rounded">?</kbd> for full list
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

