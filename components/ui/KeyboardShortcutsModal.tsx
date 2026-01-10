'use client'

import { X, Command } from 'lucide-react'
import { useEffect } from 'react'

interface Shortcut {
  keys: string[]
  description: string
  category?: string
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  role?: 'admin' | 'tech' | 'customer'
}

export default function KeyboardShortcutsModal({ isOpen, onClose, role = 'admin' }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getShortcuts = (): Record<string, Shortcut[]> => {
    const common: Shortcut[] = [
      { keys: ['?'], description: 'Show keyboard shortcuts', category: 'General' },
      { keys: ['Esc'], description: 'Close modal or cancel', category: 'General' },
    ]

    if (role === 'admin') {
      return {
        'General': [
          ...common,
          { keys: ['⌘', 'K'], description: 'Open search' },
        ],
        'Navigation': [
          { keys: ['G', 'then', 'J'], description: 'Go to Jobs' },
          { keys: ['G', 'then', 'C'], description: 'Go to Customers' },
          { keys: ['G', 'then', 'I'], description: 'Go to Invoices' },
          { keys: ['G', 'then', 'A'], description: 'Go to Analytics' },
          { keys: ['G', 'then', 'L'], description: 'Go to Calendar' },
          { keys: ['G', 'then', 'S'], description: 'Go to Settings' },
        ],
        'Actions': [
          { keys: ['⌘', 'Shift', 'N'], description: 'New Job' },
          { keys: ['⌘', 'Shift', 'C'], description: 'New Customer' },
          { keys: ['⌘', 'Shift', 'I'], description: 'New Invoice' },
        ],
      }
    }

    if (role === 'tech') {
      return {
        'General': [
          ...common,
          { keys: ['⌘', 'K'], description: 'Open search' },
        ],
        'Navigation': [
          { keys: ['G', 'then', 'T'], description: 'Go to Today' },
          { keys: ['G', 'then', 'D'], description: 'Go to Dashboard' },
          { keys: ['G', 'then', 'S'], description: 'Go to Schedule' },
        ],
      }
    }

    return {
      'General': common,
    }
  }

  const shortcuts = getShortcuts()

  return (
    <>
      {/* Backdrop with stronger blur and overlay */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md z-50 animate-fade-in"
        onClick={onClose}
        style={{ backdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden pointer-events-auto animate-slide-up border border-surface-200 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between p-6 border-b border-surface-200 dark:border-slate-700 bg-gradient-to-br from-surface-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <Command className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Work faster with hotkeys</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 group"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Shortcuts List */}
          <div className="relative p-6 space-y-8 overflow-y-auto max-h-[calc(85vh-180px)] bg-white dark:bg-slate-900">
            {Object.entries(shortcuts).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
                    {category}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                </div>
                <div className="space-y-1.5">
                  {items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {shortcut.keys.map((key, keyIndex) => (
                          key === 'then' ? (
                            <span key={keyIndex} className="text-xs text-slate-400 dark:text-slate-500 font-medium mx-1">
                              then
                            </span>
                          ) : (
                            <kbd
                              key={keyIndex}
                              className="min-w-[32px] h-8 px-2.5 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-b from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                              style={{
                                boxShadow: '0 2px 0 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {key}
                            </kbd>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="relative p-5 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Command className="w-4 h-4" />
              <span>Press</span>
              <kbd className="px-2 py-1 text-xs font-bold bg-gradient-to-b from-white to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                ?
              </kbd>
              <span>anytime to open this menu</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
