'use client'

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean // Command on Mac
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  global?: boolean // Whether the shortcut works globally or only in specific contexts
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: Allow Command+K (global search) even in inputs
        if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) {
          return
        }
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault()
          shortcut.action()
          break
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Predefined shortcut configurations
export const GLOBAL_SHORTCUTS = {
  SEARCH: { key: 'k', meta: true, description: 'Open search' },
  HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  NEW_JOB: { key: 'n', meta: true, shift: true, description: 'Create new job' },
  NEW_CUSTOMER: { key: 'c', meta: true, shift: true, description: 'Create new customer' },
  NEW_INVOICE: { key: 'i', meta: true, shift: true, description: 'Create new invoice' },
} as const

// Navigation shortcuts (g + key pattern like Gmail)
export const NAV_SHORTCUTS = {
  JOBS: { key: 'j', description: 'Go to jobs' },
  CUSTOMERS: { key: 'c', description: 'Go to customers' },
  INVOICES: { key: 'i', description: 'Go to invoices' },
  ANALYTICS: { key: 'a', description: 'Go to analytics' },
  CALENDAR: { key: 'l', description: 'Go to calendar' },
  SETTINGS: { key: 's', description: 'Go to settings' },
  TODAY: { key: 't', description: 'Go to today' },
  DASHBOARD: { key: 'd', description: 'Go to dashboard' },
} as const
