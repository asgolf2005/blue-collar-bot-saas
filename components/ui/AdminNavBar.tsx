'use client'

import { Search, Share2 } from '@/components/ui/icons'
import NotificationBell from '@/components/NotificationBell'

interface AdminNavBarProps {
  title?: string
  subtitle?: string
  profileName: string | null
  userId?: string | null
}

export default function AdminNavBar({
  title = 'Dashboard',
  subtitle = 'Operations overview',
  profileName,
  userId,
}: AdminNavBarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, customers..."
                className="h-10 w-64 rounded-lg border border-gray-200 bg-gray-50 px-9 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <button
            className="h-10 w-10 rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            aria-label="Share dashboard"
          >
            <Share2 className="mx-auto h-4 w-4" />
          </button>

          {userId && (
            <NotificationBell userId={userId} basePath="/admin/notifications" placement="bottom" />
          )}

          <div className="h-10 w-10 rounded-full bg-[#1565C0] text-white flex items-center justify-center text-sm font-semibold">
            {profileName?.charAt(0) || 'A'}
          </div>
        </div>
      </div>
    </div>
  )
}

