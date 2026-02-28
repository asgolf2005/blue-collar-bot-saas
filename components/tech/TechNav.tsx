'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeProvider'
import NotificationBell from '@/components/NotificationBell'
import { Icon } from '@/components/ui/icons'
import { format } from 'date-fns'

export default function TechNav({ userName }: { userName: string }) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    void getUser()
  }, [supabase])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    {
      href: '/tech/dashboard',
      label: 'Dashboard',
      icon: 'dashboard' as const,
    },
    {
      href: '/tech/today',
      label: 'Today',
      icon: 'clock' as const,
    },
    {
      href: '/tech/schedule',
      label: 'Schedule',
      icon: 'schedule' as const,
    },
    {
      href: '/tech/stats',
      label: 'Stats',
      icon: 'analytics' as const,
    },
    {
      href: '/tech/notifications',
      label: 'Notifications',
      icon: 'bell' as const,
    },
  ]

  const currentName = userName?.trim() || 'Technician'

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/40 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-2xl dark:bg-slate-950/40 dark:ring-slate-800/50">
        <div className="mx-auto flex h-[72px] w-full max-w-[1800px] items-center justify-between px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/tech/today" className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-500/15 text-cyan-600 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
                <Icon name="wrench" size="sm" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">Tech Command</p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {format(now, 'EEEE d MMM')} {format(now, 'h:mm a')}
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-1.5 rounded-2xl bg-white/50 p-1.5 ring-1 ring-slate-200/50 dark:bg-slate-900/40 dark:ring-slate-800/50 lg:flex shadow-inner">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-widest transition-all ${isActive
                        ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-500/20'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:ring-1 hover:ring-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:hover:ring-slate-700/50'
                      }`}
                  >
                    <Icon name={item.icon} size="sm" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl bg-white/50 px-3 py-2 ring-1 ring-slate-200/50 dark:bg-slate-900/40 dark:ring-slate-800/50 sm:flex">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                {currentName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate font-sans text-xs font-medium text-slate-700 dark:text-slate-200">
                {currentName}
              </span>
            </div>

            {userId && <NotificationBell userId={userId} basePath="/tech/notifications" />}
            <ThemeToggle />

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/50 text-slate-600 ring-1 ring-slate-200/50 transition-all hover:bg-rose-500/10 hover:text-rose-600 hover:ring-rose-500/30 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800/50 dark:hover:bg-rose-500/20 dark:hover:text-rose-300 dark:hover:ring-rose-500/40"
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" size="sm" />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-[2rem] bg-white/40 p-1.5 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/50 backdrop-blur-3xl dark:bg-slate-950/40 dark:shadow-[0_18px_50px_-20px_rgba(34,211,238,0.1)] dark:ring-slate-800/50 lg:hidden group">
        <div className="absolute inset-0 rounded-[2rem] border border-white/40 dark:border-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                    : 'text-slate-500 hover:bg-white/80 hover:text-slate-900 hover:ring-1 hover:ring-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100 dark:hover:ring-slate-700/50'
                  }`}
                title={item.label}
                aria-label={item.label}
              >
                <Icon name={item.icon} size="sm" />
              </Link>
            )
          })}
        </div>
      </nav>

      <nav className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 rounded-[2rem] bg-white/40 p-2 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/50 backdrop-blur-3xl dark:bg-slate-950/40 dark:ring-slate-800/50 lg:block">
        <div className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                    : 'text-slate-500 hover:bg-white/80 hover:text-slate-900 hover:ring-1 hover:ring-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100 dark:hover:ring-slate-700/50'
                  }`}
                title={item.label}
                aria-label={item.label}
              >
                <Icon name={item.icon} size="sm" />
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 font-sans text-xs font-medium text-slate-700 shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="h-[72px]" />
    </>
  )
}
