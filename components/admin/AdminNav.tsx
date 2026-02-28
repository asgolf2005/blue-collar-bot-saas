'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Wrench,
  BarChart3,
  Receipt,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  HardHat,
  Sun,
  Moon,
} from '@/components/ui/lucide'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { href: '/admin/jobs', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
  { href: '/admin/customers', label: 'Clients', icon: Users },
  { href: '/admin/technicians', label: 'Technicians', icon: HardHat },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/invoices', label: 'Billing', icon: Receipt },
  { href: '/admin/notifications', label: 'Alerts', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

interface AdminNavProps {
  userName: string
  userRole?: string
  userAvatar?: string
}

export default function AdminNav({
  userName,
  userRole = 'ADMINISTRATOR',
  userAvatar
}: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const savedTheme = localStorage.getItem('theme')
    return savedTheme ? savedTheme === 'dark' : true
  })

  // Controls the expanded state of the floating dock
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <>
      {/* Mobile Header (Simplified for 2026 aesthetics) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className={cn(
          "pointer-events-auto flex items-center justify-between p-3 rounded-2xl backdrop-blur-2xl border transition-colors duration-500 shadow-2xl",
          isDark
            ? "bg-[#030712]/60 border-indigo-500/20 shadow-indigo-500/10"
            : "bg-white/60 border-slate-200/50 shadow-slate-200/50"
        )}>
          <div className="flex items-center gap-3 pl-2">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"
            )}>
              <HardHat className="icon-sm" strokeWidth={1.5} />
            </div>
            <div className="font-display font-bold tracking-wider text-sm">
              BCB<span className="text-indigo-500">2.0</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="icon-md" strokeWidth={1.5} /> : <Menu className="icon-md" strokeWidth={1.5} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-0 z-40 bg-slate-50 dark:bg-[#030712] pt-24 px-4 pb-8 overflow-y-auto block"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-4 rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                      isActive
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon className="icon-md" strokeWidth={1.5} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Spatial Nav (Floating Pill Sidebar) */}
      <motion.nav
        className="hidden lg:flex flex-col fixed left-6 top-8 bottom-8 z-50 rounded-[2rem] border backdrop-blur-3xl overflow-hidden shadow-2xl"
        initial={{ width: 80 }}
        animate={{ width: isHovered ? 260 : 80 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          backgroundColor: isDark ? 'rgba(10, 15, 30, 0.4)' : 'rgba(255, 255, 255, 0.6)',
          borderColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(203, 213, 225, 0.5)',
          boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.05)' : undefined
        }}
      >
        {/* Glow behind the pill in dark mode */}
        {isDark && (
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col h-full py-6">

          {/* Brand/Logo Area */}
          <div className="mb-8 px-5 flex items-center gap-4 shrink-0 overflow-hidden">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform",
              isDark ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-indigo-600 text-white shadow-lg"
            )}>
              <HardHat className="icon-md" strokeWidth={1.5} />
            </div>
            <motion.div
              className="flex-col whitespace-nowrap"
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="font-display font-bold tracking-wider text-sm text-slate-900 dark:text-white">
                BLUE COLLAR
              </div>
              <div className="text-[10px] font-mono tracking-widest text-indigo-500 dark:text-indigo-400">
                BOT OS v2.0
              </div>
            </motion.div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
            {/* Nav Links */}
            <div className="px-3 space-y-2 shrink-0">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className="relative flex items-center gap-4 px-3 py-3 rounded-2xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                  >
                    {/* Active Background Pill */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavPill"
                        className={cn(
                          "absolute inset-0 rounded-2xl z-0",
                          isDark ? "bg-indigo-500/20 border border-indigo-500/30" : "bg-indigo-50"
                        )}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Hover Indicator Line */}
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-r-md transition-all duration-300 z-10",
                      isDark ? "bg-cyan-400" : "bg-indigo-600",
                      !isActive && "group-hover:h-1/2"
                    )} />

                    <div className="relative z-10 w-6 h-6 flex items-center justify-center shrink-0">
                      <Icon
                        className={cn(
                          "icon-md transition-colors",
                          isActive
                            ? (isDark ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "text-indigo-600")
                            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                        )}
                        strokeWidth={1.5}
                      />
                    </div>

                    <motion.span
                      className={cn(
                        "relative z-10 whitespace-nowrap font-medium text-sm transition-colors",
                        isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                      )}
                      animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                )
              })}
            </div>

            <div className="flex-1 min-h-[1rem]" />

            {/* Footer Controls */}
            <div className="mt-4 px-3 space-y-2 shrink-0 pb-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full relative flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {isDark ? <Sun className="icon-md" strokeWidth={1.5} /> : <Moon className="icon-md" strokeWidth={1.5} />}
                </div>
                <motion.span
                  className="whitespace-nowrap font-medium text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                  animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full relative flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                aria-label="Sign out"
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  <LogOut className="icon-md" strokeWidth={1.5} />
                </div>
                <motion.span
                  className="whitespace-nowrap font-medium text-sm text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"
                  animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Sign Out
                </motion.span>
              </button>

              {/* User Profile */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-3 px-2 overflow-hidden">
                <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {userName?.charAt(0).toUpperCase() || 'A'}
                </div>
                <motion.div
                  className="flex-col whitespace-nowrap"
                  animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-[140px]">
                    {userName}
                  </div>
                  <div className="text-[10px] tracking-wider font-mono text-slate-500 dark:text-slate-400 uppercase">
                    {userRole}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>
    </>
  )
}
