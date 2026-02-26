'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from '@/components/ui/lucide'
import { ADMIN_RANGE_OPTIONS, type DateRangeKey } from '@/lib/analytics/dateUtils'

interface RangeMenuSelectorProps {
  selectedRange: DateRangeKey
}

export default function RangeMenuSelector({ selectedRange }: RangeMenuSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const current = ADMIN_RANGE_OPTIONS.find((option) => option.key === selectedRange) || ADMIN_RANGE_OPTIONS[2]

  useEffect(() => {
    if (!open) return

    const onMouseDown = (event: MouseEvent) => {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const changeRange = (nextRange: DateRangeKey) => {
    setOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', nextRange)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
      >
        <span className="font-sans text-xs font-semibold text-slate-700 dark:text-slate-200">
          {current.label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform dark:text-slate-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {ADMIN_RANGE_OPTIONS.map((option) => {
            const active = option.key === selectedRange
            return (
              <button
                type="button"
                key={option.key}
                onClick={() => changeRange(option.key)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-sans text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.3)] dark:bg-cyan-400'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{option.label}</span>
                {active ? <span className="font-mono text-[9px] uppercase tracking-wider">Current</span> : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

