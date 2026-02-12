'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
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
} from 'lucide-react'
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
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const savedTheme = localStorage.getItem('theme')
    return savedTheme ? savedTheme === 'dark' : true
  })
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-20">
        <div className={cn(
          "mx-4 mt-4 p-4 rounded-xl border-r transition-colors duration-300",
          isDark 
            ? "bg-[#0a0e1a] border-[rgba(34,211,238,0.2)]" 
            : "bg-white border-gray-200 shadow-lg"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative w-10 h-10 rounded-lg flex items-center justify-center",
                isDark 
                  ? "bg-gradient-to-br from-blue-500 to-cyan-400"
                  : "bg-gradient-to-br from-blue-600 to-blue-800"
              )}>
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className={cn(
                  "text-xl tracking-wider font-display",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  BLUE COLLAR
                </div>
                <div className={cn(
                  "text-[10px] font-mono tracking-[0.3em]",
                  isDark ? "text-cyan-400" : "text-blue-600"
                )}>
                  BOT v2.0
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                  isDark 
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                  isDark 
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
                style={{
                  backgroundColor: mobileOpen 
                    ? (isDark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(59, 130, 246, 0.1)')
                    : 'transparent',
                }}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar - Hover Expand */}
      <aside
        className={cn(
          'group hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50',
          'transition-all duration-300 ease-out',
          'overflow-hidden',
          isExpanded ? 'w-[280px]' : 'w-[72px]'
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        style={{
          backgroundColor: isDark ? '#0a0e1a' : '#ffffff',
          borderRight: `1px solid ${isDark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        {/* Logo Area */}
        <div 
          className="h-[80px] flex items-center px-4 shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.1)'}` }}
        >
          {/* Logo Icon - Always Visible */}
          <div className={cn(
            "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            isExpanded ? "opacity-0 w-0 scale-75" : "opacity-100"
          )}>
            <div className={cn(
              "absolute inset-0 rounded-xl",
              isDark 
                ? "bg-gradient-to-br from-blue-500 to-cyan-400"
                : "bg-gradient-to-br from-blue-600 to-blue-800"
            )} />
            <HardHat className="w-5 h-5 text-white relative z-10" />
          </div>

          {/* Expanded Logo - Full Brand */}
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300 absolute left-4",
            isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}>
            <div className={cn(
              "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              isDark 
                ? "bg-gradient-to-br from-blue-500 to-cyan-400"
                : "bg-gradient-to-br from-blue-600 to-blue-800"
            )}>
              <HardHat className="w-5 h-5 text-white relative z-10" />
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <div className={cn(
                "text-xl tracking-wider font-display",
                isDark ? "text-white" : "text-gray-900"
              )}>
                BLUE COLLAR
              </div>
              <div className={cn(
                "text-[10px] font-mono tracking-[0.3em]",
                isDark ? "text-cyan-400" : "text-blue-600"
              )}>
                BOT v2.0
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg font-mono text-sm tracking-wide',
                  'transition-all duration-200 relative',
                  'border-l-2',
                  isActive 
                    ? (isDark ? 'text-cyan-400 border-cyan-400' : 'text-blue-600 border-blue-600')
                    : (isDark 
                        ? 'text-gray-400 border-transparent hover:text-white hover:border-cyan-400/50' 
                        : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-blue-400/50')
                )}
                style={{
                  backgroundColor: isActive 
                    ? (isDark ? 'rgba(34, 211, 238, 0.08)' : 'rgba(59, 130, 246, 0.08)')
                    : 'transparent',
                  animation: `slideInLeft 0.4s ease-out ${index * 50}ms both`,
                }}
              >
                {/* Icon */}
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <Icon 
                    className={cn(
                      'w-5 h-5 transition-all duration-200',
                      isActive 
                        ? (isDark ? 'text-cyan-400' : 'text-blue-600')
                        : ''
                    )} 
                  />
                </div>
                
                {/* Label - Shows when expanded */}
                <span className={cn(
                  "whitespace-nowrap transition-all duration-200",
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                )}>
                  {item.label}
                </span>

                {/* Active Indicator */}
                {isActive && isExpanded && (
                  <div className={cn(
                    "absolute right-3 w-1.5 h-1.5 rounded-full animate-pulse",
                    isDark ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-blue-600"
                  )} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle & User Section */}
        <div 
          className="shrink-0 p-2"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.1)'}` }}
        >
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-all duration-200",
              isDark 
                ? "text-gray-400 hover:text-white hover:bg-white/5"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </div>
            <span className={cn(
              "whitespace-nowrap transition-all duration-200",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            )}>
              {isDark ? 'LIGHT MODE' : 'DARK MODE'}
            </span>
          </button>

          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2 mt-1">
            {/* Avatar */}
            <div className="shrink-0">
              {userAvatar ? (
                <Image
                  src={userAvatar} 
                  alt={userName}
                  width={36}
                  height={36}
                  unoptimized
                  className={cn(
                    "w-9 h-9 rounded-full object-cover border",
                    isDark ? "border-cyan-400/30" : "border-blue-400/30"
                  )}
                />
              ) : (
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white font-mono font-bold text-sm border",
                  isDark 
                    ? "bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400/30"
                    : "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400/30"
                )}>
                  {userName?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
            </div>
            
            {/* User Name & Role */}
            <div className={cn(
              "whitespace-nowrap transition-all duration-200",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            )}>
              <div className={cn(
                "text-sm font-mono truncate",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {userName}
              </div>
              <div className={cn(
                "text-[10px] font-mono",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                {userRole.toUpperCase()}
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-all duration-200",
              isDark 
                ? "text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                : "text-gray-600 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <span className={cn(
              "whitespace-nowrap transition-all duration-200",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
            )}>
              LOGOUT
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar - Slide Out Drawer */}
      <aside
        className={cn(
          'lg:hidden fixed z-50 flex flex-col',
          'w-[280px] left-0 top-0 bottom-0',
          'transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          backgroundColor: isDark ? '#0a0e1a' : '#ffffff',
          borderRight: `1px solid ${isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        {/* Logo Area */}
        <div 
          className="h-[80px] flex items-center px-6 shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(0,0,0,0.1)'}` }}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "relative w-10 h-10 rounded-xl flex items-center justify-center",
              isDark 
                ? "bg-gradient-to-br from-blue-500 to-cyan-400"
                : "bg-gradient-to-br from-blue-600 to-blue-800"
            )}>
              <HardHat className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <div className={cn(
                "text-xl tracking-wider font-display",
                isDark ? "text-white" : "text-gray-900"
              )}>
                BLUE COLLAR
              </div>
              <div className={cn(
                "text-[10px] font-mono tracking-[0.3em]",
                isDark ? "text-cyan-400" : "text-blue-600"
              )}>
                BOT v2.0
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-lg font-mono text-sm tracking-wide',
                  'transition-all duration-200',
                  'border-l-2',
                  isActive 
                    ? (isDark ? 'text-cyan-400 border-cyan-400' : 'text-blue-600 border-blue-600')
                    : (isDark 
                        ? 'text-gray-400 border-transparent hover:text-white'
                        : 'text-gray-600 border-transparent hover:text-gray-900')
                )}
                style={{
                  backgroundColor: isActive 
                    ? (isDark ? 'rgba(34, 211, 238, 0.08)' : 'rgba(59, 130, 246, 0.08)')
                    : 'transparent',
                  animation: `slideInLeft 0.4s ease-out ${index * 50}ms both`,
                }}
              >
                <Icon 
                  className={cn(
                    'w-5 h-5',
                    isActive 
                      ? (isDark ? 'text-cyan-400' : 'text-blue-600')
                      : ''
                  )} 
                />
                <span className="whitespace-nowrap">{item.label}</span>
                {isActive && (
                  <div className={cn(
                    "ml-auto w-1.5 h-1.5 rounded-full animate-pulse",
                    isDark ? "bg-cyan-400" : "bg-blue-600"
                  )} />
                )}
              </Link>
            )
          })}
          
          {/* Theme Toggle in Mobile Menu */}
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-lg font-mono text-sm tracking-wide transition-all duration-200",
              isDark 
                ? "text-gray-400 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="whitespace-nowrap">
              {isDark ? 'LIGHT MODE' : 'DARK MODE'}
            </span>
          </button>
        </nav>

        {/* User Profile Section */}
        <div 
          className="shrink-0 p-4"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(0,0,0,0.1)'}` }}
        >
          <div className="flex items-center gap-3 mb-3 px-2">
            {userAvatar ? (
              <Image
                src={userAvatar} 
                alt={userName}
                width={40}
                height={40}
                unoptimized
                className={cn(
                  "w-10 h-10 rounded-full object-cover border",
                  isDark ? "border-cyan-400/30" : "border-blue-400/30"
                )}
              />
            ) : (
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-mono font-bold text-sm border",
                isDark 
                  ? "bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400/30"
                  : "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400/30"
              )}>
                {userName?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className={cn(
                "text-sm font-mono truncate",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {userName}
              </div>
              <div className={cn(
                "text-xs font-mono",
                isDark ? "text-gray-500" : "text-gray-400"
              )}>
                {userRole.toUpperCase()}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-mono text-sm transition-all duration-200",
              isDark 
                ? "text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                : "text-gray-600 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <LogOut className="w-4 h-4" />
            <span className="whitespace-nowrap">LOGOUT</span>
          </button>
        </div>
      </aside>
    </>
  )
}
