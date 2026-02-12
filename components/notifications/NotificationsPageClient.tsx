'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/notifications/types'
import { formatNotificationTime } from '@/lib/notifications/types'
import { EmptyNotifications } from '@/components/ui/EmptyState'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationsPageClientProps {
  userId: string
  initialNotifications: Notification[]
  title?: string
  description?: string
}

export default function NotificationsPageClient({
  userId,
  initialNotifications,
  title = 'Notifications',
  description = 'Updates about jobs, assignments, and payments.',
}: NotificationsPageClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = async () => {
      channel = supabase
        .channel(`notifications:user_id=eq.${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev])
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification
            setNotifications((prev) =>
              prev.map((item) => (item.id === updatedNotification.id ? updatedNotification : item))
            )
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, supabase])

  async function markAsRead(notificationId: string) {
    await supabase.rpc('mark_notification_read', { p_notification_id: notificationId })
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    )
  }

  async function markAllAsRead() {
    await supabase.rpc('mark_all_notifications_read')
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-elevation-2">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
            <p className="text-sm text-muted">{description}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-50/80 border border-surface-200 text-sm font-semibold text-ink hover:bg-surface-100 hover:border-surface-300 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-8">
            <EmptyNotifications />
          </div>
        ) : (
          <div className="divide-y divide-surface-200">
            {notifications.map((notification) => {
              const item = (
                <div
                  className={`relative flex items-start gap-4 px-5 py-4 transition-colors ${
                    notification.read ? 'bg-transparent' : 'bg-primary/5'
                  } hover:bg-surface-50`}
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink line-clamp-1">{notification.title}</p>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted/70 mt-2">{formatNotificationTime(notification.created_at)}</p>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  {!notification.read && (
                    <button
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="absolute right-4 top-4 p-1 rounded-lg hover:bg-surface-200 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 text-muted" />
                    </button>
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
                  {item}
                </Link>
              ) : (
                <div key={notification.id} onClick={() => markAsRead(notification.id)}>
                  {item}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'job_assigned':
    case 'new_assignment':
      return (
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
          </svg>
        </div>
      )
    case 'job_status_changed':
      return (
        <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
      )
    case 'schedule_changed':
    case 'appointment_reminder':
      return (
        <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
          </svg>
        </div>
      )
    case 'payment_received':
    case 'invoice_sent':
      return (
        <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-muted" />
        </div>
      )
  }
}
