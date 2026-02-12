'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/notifications/types'
import { formatNotificationTime } from '@/lib/notifications/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationBellProps {
  userId: string
  initialNotifications?: Notification[]
  basePath?: string
  placement?: 'top' | 'bottom'
  align?: 'left' | 'right'
}

export default function NotificationBell({
  userId,
  initialNotifications = [],
  basePath = '/notifications',
  placement = 'bottom',
  align = 'right',
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  const playNotificationSound = useCallback(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYV')
    audio.volume = 0.3
    audio.play().catch(() => {
      // Ignore errors if audio playback is blocked
    })
  }, [])

  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data && !error) {
      setNotifications(data)
    }
  }, [supabase, userId])

  // Load notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadNotifications])

  // Real-time notification subscription
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

            // Play notification sound (optional)
            playNotificationSound()
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
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
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
  }, [playNotificationSound, userId, supabase])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markAsRead(notificationId: string) {
    await supabase.rpc('mark_notification_read', { p_notification_id: notificationId })

    // Update local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }

  async function markAllAsRead() {
    await supabase.rpc('mark_all_notifications_read')

    // Update local state
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'job_assigned':
      case 'new_assignment':
        return (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        )
      case 'job_status_changed':
        return (
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        )
      case 'schedule_changed':
        return (
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
            </svg>
          </div>
        )
      case 'payment_received':
        return (
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted" />
          </div>
        )
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-surface-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-ink" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute w-96 max-w-[calc(100vw-2rem)] bg-surface-50 rounded-2xl border border-surface-200 shadow-elevation-3 z-50 overflow-hidden ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'left' ? 'left-0' : 'right-0'}`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-muted">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted" />
                </div>
                <p className="text-muted text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative px-4 py-3 border-b border-surface-200 hover:bg-surface-100 transition-colors ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => {
                        markAsRead(notification.id)
                        setIsOpen(false)
                      }}
                      className="block"
                    >
                      <NotificationItem notification={notification} />
                    </Link>
                  ) : (
                    <div onClick={() => markAsRead(notification.id)}>
                      <NotificationItem notification={notification} />
                    </div>
                  )}

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}

                  {/* Mark as read button */}
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="absolute right-3 top-3 p-1 hover:bg-surface-200 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 text-muted" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-surface-200 bg-surface-50">
              <Link
                href={basePath}
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary hover:text-primary/80 font-medium block text-center"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <div className="flex items-start gap-3 pl-4">
      {/* Icon based on type */}
      {getNotificationIcon(notification.type)}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink line-clamp-1">{notification.title}</p>
        <p className="text-xs text-muted mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted/70 mt-1">{formatNotificationTime(notification.created_at)}</p>
      </div>
    </div>
  )
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'job_assigned':
    case 'new_assignment':
      return (
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
          </svg>
        </div>
      )
    case 'job_status_changed':
      return (
        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
      )
    case 'schedule_changed':
      return (
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
          </svg>
        </div>
      )
    case 'payment_received':
      return (
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-muted" />
        </div>
      )
  }
}
