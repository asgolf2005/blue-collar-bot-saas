'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/ThemeProvider'

interface CustomerNavProps {
  customerName: string
  businessName: string
  businessLogo: string | null
  primaryColor: string
  businessPhone?: string
}

export default function CustomerNav({
  customerName,
  businessName,
  businessLogo,
  primaryColor,
  businessPhone,
}: CustomerNavProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    {
      href: '/customer',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      href: '/customer/appointments',
      label: 'Appointments',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    },
    {
      href: '/customer/invoices',
      label: 'Invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    },
    {
      href: '/customer/notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      )
    },
    {
      href: '/customer/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    },
  ]

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
        <div className="max-w-4xl mx-auto h-full px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/customer" className="flex items-center gap-3 group">
            {businessLogo ? (
              <Image
                src={businessLogo}
                alt={businessName}
                width={36}
                height={36}
                className="rounded-xl shadow-md"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-transform group-hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`, boxShadow: `0 4px 14px ${primaryColor}40` }}
              >
                {businessName.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900 dark:text-white text-sm">{businessName}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Customer Portal</span>
            </div>
          </Link>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs shadow-md"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
              >
                {customerName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:block">{customerName}</span>
            </div>
            <ThemeToggle />
            <button type="button"
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-slate-200 dark:border-slate-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700/50 safe-area-pb">
        <div className="max-w-4xl mx-auto h-16 px-4 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/customer' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? '' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                style={isActive ? { color: primaryColor } : {}}
              >
                <div
                  className="relative p-2 rounded-xl transition-all"
                  style={isActive ? { backgroundColor: `${primaryColor}15` } : {}}
                >
                  {item.icon}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-xl blur-lg opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}bb)`, boxShadow: `0 2px 8px ${primaryColor}50` }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  )
}
