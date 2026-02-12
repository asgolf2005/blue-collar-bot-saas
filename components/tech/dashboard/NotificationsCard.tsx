'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string | null
  read: boolean
  created_at: string
}

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    icon: 'text-primary'
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    icon: 'text-warning'
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    icon: 'text-success'
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    icon: 'text-info'
  }
}

export default function NotificationsCard() {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const loadNotifications = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const items = data || []
      setNotifications(items as Notification[])
      setUnreadCount(items.filter((item: Notification) => !item.read).length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)
      await loadNotifications(user.id)
    }

    void load()
  }, [loadNotifications, supabase.auth])

  const markAllAsRead = async () => {
    if (!userId) return
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (!error) {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const target = notifications.find((item) => item.id === notificationId)
    if (!target || target.read) {
      return
    }
    await supabase.rpc('mark_notification_read', { p_notification_id: notificationId })
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    )
    setUnreadCount((prev) => Math.max(prev - 1, 0))
  }

  const typeConfig: Record<string, { icon: any; color: keyof typeof colorClasses }> = {
    job_assigned: { icon: Calendar, color: 'primary' },
    job_status_changed: { icon: Info, color: 'info' },
    invoice_sent: { icon: CheckCircle, color: 'success' },
    payment_received: { icon: CheckCircle, color: 'success' },
    appointment_reminder: { icon: AlertCircle, color: 'warning' },
  }

  const getTimeAgo = (timestamp: string) =>
    formatDistanceToNow(new Date(timestamp), { addSuffix: true })

  return (
    <div className="rounded-3xl bg-white dark:bg-surface-900 p-6 shadow-elevation-premium-2 border border-surface-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink dark:text-surface-100 mb-1">Work Notifications</h3>
          <p className="text-sm text-muted">{unreadCount} unread</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
          <Bell className="w-5 h-5 text-primary" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full flex items-center justify-center text-white text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-8 text-center text-muted">
            <div className="w-6 h-6 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-muted">
            <Bell className="w-10 h-10 mx-auto mb-3 text-surface-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const config = typeConfig[notification.type] || { icon: Info, color: 'info' }
            const Icon = config.icon
            const colors = colorClasses[config.color]
            const timeAgo = getTimeAgo(notification.created_at)

            const content = (
              <div
                className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 dark:border-white/10 hover:border-primary/30 hover:bg-surface-50 dark:hover:bg-white/5 transition-all motion-base group"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-ink dark:text-surface-100 text-sm mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-muted mb-2 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted/70">
                    {timeAgo}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
                )}
              </div>
            )
            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link}
                className="block"
                onClick={() => markAsRead(notification.id)}
              >
                {content}
              </Link>
            ) : (
              <div key={notification.id} onClick={() => markAsRead(notification.id)}>
                {content}
              </div>
            )
          })
        )}
      </div>

      {/* View All Button */}
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="w-full mt-4 py-2.5 px-4 rounded-xl border border-surface-200 dark:border-white/10 text-sm font-medium text-ink dark:text-surface-100 hover:bg-surface-50 dark:hover:bg-white/5 hover:border-primary/30 transition-all"
        >
          Mark all as read
        </button>
      )}
    </div>
  )
}
