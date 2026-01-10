'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import KeyboardShortcutsModal from '@/components/ui/KeyboardShortcutsModal'

interface GlobalKeyboardShortcutsProps {
  role?: 'admin' | 'tech' | 'customer'
}

export default function GlobalKeyboardShortcuts({ role = 'admin' }: GlobalKeyboardShortcutsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showHelp, setShowHelp] = useState(false)
  const [gPressed, setGPressed] = useState(false)
  const [gPressTimer, setGPressTimer] = useState<NodeJS.Timeout | null>(null)

  // Clear 'g' press after 1 second
  useEffect(() => {
    if (gPressed && !gPressTimer) {
      const timer = setTimeout(() => {
        setGPressed(false)
        setGPressTimer(null)
      }, 1000)
      setGPressTimer(timer)
    }

    return () => {
      if (gPressTimer) {
        clearTimeout(gPressTimer)
      }
    }
  }, [gPressed, gPressTimer])

  const handleNavigation = useCallback((path: string) => {
    router.push(path)
    setGPressed(false)
    if (gPressTimer) {
      clearTimeout(gPressTimer)
      setGPressTimer(null)
    }
  }, [router, gPressTimer])

  const shortcuts = useCallback(() => {
    const baseShortcuts = [
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts',
        action: () => setShowHelp(true),
        global: true,
      },
    ]

    if (role === 'admin') {
      // Handle 'g' press for navigation shortcuts
      const navShortcuts = gPressed ? [
        { key: 'j', description: 'Go to Jobs', action: () => handleNavigation('/admin/jobs') },
        { key: 'c', description: 'Go to Customers', action: () => handleNavigation('/admin/customers') },
        { key: 'i', description: 'Go to Invoices', action: () => handleNavigation('/admin/invoices') },
        { key: 'a', description: 'Go to Analytics', action: () => handleNavigation('/admin/analytics') },
        { key: 'l', description: 'Go to Calendar', action: () => handleNavigation('/admin/calendar') },
        { key: 's', description: 'Go to Settings', action: () => handleNavigation('/admin/settings') },
      ] : [
        { key: 'g', description: 'Navigation mode', action: () => setGPressed(true) },
      ]

      return [
        ...baseShortcuts,
        ...navShortcuts,
        {
          key: 'n',
          meta: true,
          shift: true,
          description: 'Create new job',
          action: () => router.push('/admin/jobs/new'),
          global: true,
        },
        {
          key: 'c',
          meta: true,
          shift: true,
          description: 'Create new customer',
          action: () => router.push('/admin/customers/new'),
          global: true,
        },
        {
          key: 'i',
          meta: true,
          shift: true,
          description: 'Create new invoice',
          action: () => router.push('/admin/invoices/new'),
          global: true,
        },
      ]
    }

    if (role === 'tech') {
      const navShortcuts = gPressed ? [
        { key: 't', description: 'Go to Today', action: () => handleNavigation('/tech/today') },
        { key: 'd', description: 'Go to Dashboard', action: () => handleNavigation('/tech/dashboard') },
        { key: 's', description: 'Go to Schedule', action: () => handleNavigation('/tech/schedule') },
      ] : [
        { key: 'g', description: 'Navigation mode', action: () => setGPressed(true) },
      ]

      return [
        ...baseShortcuts,
        ...navShortcuts,
      ]
    }

    return baseShortcuts
  }, [role, router, gPressed, handleNavigation])

  useKeyboardShortcuts({
    shortcuts: shortcuts(),
    enabled: true,
  })

  return (
    <>
      {/* G key indicator */}
      {gPressed && (
        <div className="fixed bottom-4 right-4 z-40 glass-card px-4 py-3 shadow-lg animate-slide-up">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 text-sm font-semibold bg-primary/10 text-primary border border-primary/20 rounded">
              G
            </kbd>
            <span className="text-sm text-muted">Press a key to navigate...</span>
          </div>
        </div>
      )}

      {/* Help Modal */}
      <KeyboardShortcutsModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        role={role}
      />
    </>
  )
}
