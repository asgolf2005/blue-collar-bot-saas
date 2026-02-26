'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCheck,
  DollarSign,
  RefreshCw,
  Search,
  Sparkles,
} from '@/components/ui/icons'
import { ActionButton, ActionIconButton } from '@/components/ui/ActionSystem'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/notifications/types'
import { formatNotificationTime } from '@/lib/notifications/types'
import { EmptyNotifications } from '@/components/ui/EmptyState'
import type { RealtimeChannel } from '@supabase/supabase-js'

type NotificationsPageVariant = 'standard' | 'admin' | 'tech'
type NotificationFilter = 'all' | 'unread' | 'read'
type NotificationCategory = 'all' | 'dispatch' | 'status' | 'schedule' | 'billing' | 'other'

interface NotificationsPageClientProps {
  userId: string
  initialNotifications: Notification[]
  title?: string
  description?: string
  variant?: NotificationsPageVariant
}

export default function NotificationsPageClient({
  userId,
  initialNotifications,
  title = 'Notifications',
  description = 'Updates about jobs, assignments, and payments.',
  variant = 'standard',
}: NotificationsPageClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [category, setCategory] = useState<NotificationCategory>('all')
  const [query, setQuery] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'unread' && notification.read) return false
      if (filter === 'read' && !notification.read) return false

      if (category !== 'all' && getNotificationCategory(notification.type) !== category) {
        return false
      }

      const normalizedQuery = query.trim().toLowerCase()
      if (!normalizedQuery) return true

      return (
        notification.title.toLowerCase().includes(normalizedQuery) ||
        notification.message.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [category, filter, notifications, query])

  const groupedNotifications = useMemo(() => groupNotificationsByDay(filteredNotifications), [filteredNotifications])

  const categoryCounts = useMemo(() => {
    return notifications.reduce<Record<NotificationCategory, number>>(
      (acc, notification) => {
        const typeCategory = getNotificationCategory(notification.type)
        acc[typeCategory] += 1
        return acc
      },
      {
        all: notifications.length,
        dispatch: 0,
        status: 0,
        schedule: 0,
        billing: 0,
        other: 0,
      }
    )
  }, [notifications])

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

  if (variant === 'admin') {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="admin-card relative overflow-hidden border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50/60 px-6 py-5 shadow-elevation-1 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/50 bg-cyan-100/80 dark:border-cyan-700/60 dark:bg-cyan-900/40">
                <Sparkles className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
              </div>
              <div>
                <h1 className="admin-page-header mb-1">{title.toUpperCase()}</h1>
                <p className="font-sans text-sm text-slate-600 dark:text-slate-300">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/90 bg-gradient-to-b from-slate-50 via-white to-slate-200/80 px-3 py-1.5 font-mono text-xs text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(148,163,184,0.35),0_8px_20px_-16px_rgba(15,23,42,0.55)] dark:border-slate-500/80 dark:from-slate-300/25 dark:via-slate-200/15 dark:to-slate-900 dark:text-slate-100">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-slate-300/60 blur-[1px] dark:bg-slate-200/35" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-white/80 bg-gradient-to-b from-white via-slate-200 to-slate-400 dark:border-slate-200/60 dark:from-slate-100 dark:via-slate-300 dark:to-slate-500" />
                </span>
                <span className="uppercase tracking-[0.12em]">{unreadCount} unread</span>
              </div>
              {unreadCount > 0 && (
                <ActionButton
                  stylePreset="ambient"
                  intent="primary"
                  size="sm"
                  onClick={markAllAsRead}
                  className="px-3"
                  icon={<CheckCheck className="h-3.5 w-3.5" />}
                >
                  Clear unread
                </ActionButton>
              )}
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
            <MetricChip label="Total" value={notifications.length} />
            <MetricChip label="Unread" value={unreadCount} />
            <MetricChip label="Read" value={notifications.length - unreadCount} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="admin-card h-fit border-slate-200/80 p-4 dark:border-slate-700/80">
            <div className="mb-4">
              <p className="font-display text-lg uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Signal Console
              </p>
              <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
                Filter noise and surface the important alerts.
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title or message"
                className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 font-sans text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="mb-4 inline-flex w-full rounded-full border border-slate-300 bg-slate-100 p-1 dark:border-slate-600 dark:bg-slate-800">
              {(['all', 'unread', 'read'] as NotificationFilter[]).map((item) => {
                const active = filter === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                    }`}
                  >
                    {item === 'all' ? 'All' : item === 'unread' ? 'Unread' : 'Read'}
                  </button>
                )
              })}
            </div>

            <div className="space-y-1.5">
              {(
                ['all', 'dispatch', 'status', 'schedule', 'billing', 'other'] as NotificationCategory[]
              ).map((item) => {
                const active = category === item
                const meta = getCategoryMeta(item)
                const count = categoryCounts[item]
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? 'border-cyan-500/40 bg-cyan-500/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="font-sans text-xs font-medium text-slate-700 dark:text-slate-200">{meta.label}</span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{count}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="admin-card overflow-hidden border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80">
              <div>
                <p className="font-display text-lg uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  Timeline
                </p>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
                  {filteredNotifications.length} matching signal{filteredNotifications.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-gradient-to-b from-emerald-100/90 via-emerald-100/60 to-emerald-200/40 px-3 py-1 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_14px_-10px_rgba(16,185,129,0.9)] dark:from-emerald-300/20 dark:via-emerald-300/10 dark:to-slate-900 dark:text-emerald-200">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-emerald-100 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Live</span>
              </div>
            </div>

            {groupedNotifications.length === 0 ? (
              <div className="p-8">
                <EmptyNotifications />
              </div>
            ) : (
              <div className="max-h-[72vh] overflow-y-auto px-4 py-4">
                {groupedNotifications.map((group) => (
                  <div key={group.key} className="mb-5 last:mb-0">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="space-y-2">
                      {group.items.map((notification) => {
                        const categoryForItem = getNotificationCategory(notification.type)
                        const categoryTone = getCategoryTone(categoryForItem)
                        const item = (
                          <div
                            className={`group relative rounded-lg border px-4 py-3 transition ${
                              notification.read
                                ? 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70'
                                : 'border-cyan-400/30 bg-cyan-50/70 hover:bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(notification.type, 'compact')}

                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <p className="line-clamp-1 font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {notification.title}
                                  </p>
                                  <p className="shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>

                                <p className="line-clamp-2 font-sans text-xs text-slate-600 dark:text-slate-300">
                                  {notification.message}
                                </p>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${categoryTone}`}
                                  >
                                    {getCategoryMeta(categoryForItem).label}
                                  </span>

                                  {notification.link ? (
                                    <span className="inline-flex items-center gap-1 font-sans text-xs font-medium text-cyan-600 transition group-hover:text-cyan-500 dark:text-cyan-300 dark:group-hover:text-cyan-200">
                                      Open
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {!notification.read && (
                              <ActionIconButton
                                stylePreset="industrial"
                                intent="secondary"
                                size="xs"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="absolute right-3 top-3 h-6 w-6 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                title="Mark as read"
                                icon={<Check className="h-3.5 w-3.5" />}
                              />
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
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    )
  }

  if (variant === 'tech') {
    return (
      <div className="space-y-5 animate-fade-in-up">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.22),transparent_42%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Field Signal Feed</p>
              <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.12em] text-slate-900 dark:text-white">{title}</h1>
              <p className="mt-1 font-sans text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:w-[360px]">
              <MetricChip label="Total" value={notifications.length} />
              <MetricChip label="Unread" value={unreadCount} />
              <MetricChip label="Read" value={notifications.length - unreadCount} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-2xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Filters</p>
              {unreadCount > 0 ? (
                <ActionIconButton
                  stylePreset="ambient"
                  intent="secondary"
                  size="sm"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="h-8 w-8 rounded-full"
                  icon={<CheckCheck className="h-4 w-4" />}
                />
              ) : null}
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search alerts"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 font-sans text-sm text-slate-800 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="mb-3 inline-flex w-full rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              {(['all', 'unread', 'read'] as NotificationFilter[]).map((item) => {
                const active = filter === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`flex-1 rounded-full px-3 py-1.5 font-sans text-xs font-semibold transition ${
                      active
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                    }`}
                  >
                    {item === 'all' ? 'All' : item === 'unread' ? 'Unread' : 'Read'}
                  </button>
                )
              })}
            </div>

            <div className="space-y-1.5">
              {(
                ['all', 'dispatch', 'status', 'schedule', 'billing', 'other'] as NotificationCategory[]
              ).map((item) => {
                const active = category === item
                const meta = getCategoryMeta(item)
                const count = categoryCounts[item]
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-cyan-400/40 bg-cyan-500/10'
                        : 'border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-700 dark:bg-slate-950/30 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="font-sans text-xs font-medium text-slate-700 dark:text-slate-200">{meta.label}</span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{count}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="font-display text-2xl uppercase tracking-[0.1em] text-slate-900 dark:text-white">Timeline</p>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
                  {filteredNotifications.length} alert{filteredNotifications.length === 1 ? '' : 's'} matching current filters
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            {groupedNotifications.length === 0 ? (
              <div className="p-8">
                <EmptyNotifications />
              </div>
            ) : (
              <div className="max-h-[74vh] overflow-y-auto px-4 py-4">
                {groupedNotifications.map((group) => (
                  <div key={group.key} className="mb-5 last:mb-0">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="space-y-2">
                      {group.items.map((notification) => {
                        const categoryForItem = getNotificationCategory(notification.type)
                        const categoryTone = getCategoryTone(categoryForItem)
                        const item = (
                          <div
                            className={`group relative rounded-xl border px-4 py-3 transition ${
                              notification.read
                                ? 'border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-700 dark:bg-slate-950/30 dark:hover:bg-slate-900'
                                : 'border-cyan-400/35 bg-cyan-500/10 hover:bg-cyan-500/15'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(notification.type, 'compact')}
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <p className="line-clamp-1 font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {notification.title}
                                  </p>
                                  <p className="shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>
                                <p className="line-clamp-2 font-sans text-xs text-slate-600 dark:text-slate-300">
                                  {notification.message}
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${categoryTone}`}
                                  >
                                    {getCategoryMeta(categoryForItem).label}
                                  </span>
                                  {notification.link ? (
                                    <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-cyan-600 transition group-hover:text-cyan-500 dark:text-cyan-300 dark:group-hover:text-cyan-200">
                                      Open
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {!notification.read && (
                              <ActionIconButton
                                stylePreset="industrial"
                                intent="secondary"
                                size="xs"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="absolute right-3 top-3 h-6 w-6 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                title="Mark as read"
                                icon={<Check className="h-3.5 w-3.5" />}
                              />
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
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    )
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
          <ActionButton
            stylePreset="ambient"
            intent="secondary"
            size="md"
            onClick={markAllAsRead}
            className="rounded-xl"
            icon={<CheckCheck className="w-4 h-4" />}
          >
            Mark all read
          </ActionButton>
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
                  {getNotificationIcon(notification.type, 'default')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink line-clamp-1">{notification.title}</p>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted/70 mt-2">{formatNotificationTime(notification.created_at)}</p>
                  </div>
                  {!notification.read && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  {!notification.read && (
                    <ActionIconButton
                      stylePreset="ambient"
                      intent="secondary"
                      size="sm"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="absolute right-4 top-4 h-7 w-7 rounded-lg"
                      title="Mark as read"
                      icon={<Check className="w-4 h-4 text-muted" />}
                    />
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

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/70">
      <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

function getNotificationIcon(type: string, size: 'default' | 'compact' = 'default') {
  const wrapperSize = size === 'compact' ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl'
  const iconSize = size === 'compact' ? 'h-4 w-4' : 'h-5 w-5'

  switch (type) {
    case 'job_assigned':
    case 'new_assignment':
      return (
        <div className={`${wrapperSize} flex shrink-0 items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-300`}>
          <Briefcase className={iconSize} />
        </div>
      )
    case 'job_status_changed':
      return (
        <div className={`${wrapperSize} flex shrink-0 items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-300`}>
          <RefreshCw className={iconSize} />
        </div>
      )
    case 'schedule_changed':
    case 'appointment_reminder':
      return (
        <div className={`${wrapperSize} flex shrink-0 items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-300`}>
          <Calendar className={iconSize} />
        </div>
      )
    case 'payment_received':
    case 'invoice_sent':
      return (
        <div className={`${wrapperSize} flex shrink-0 items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`}>
          <DollarSign className={iconSize} />
        </div>
      )
    default:
      return (
        <div className={`${wrapperSize} flex shrink-0 items-center justify-center bg-slate-500/10 text-slate-600 dark:text-slate-300`}>
          <Bell className={iconSize} />
        </div>
      )
  }
}

function getCategoryMeta(category: NotificationCategory) {
  switch (category) {
    case 'dispatch':
      return { label: 'Dispatch' }
    case 'status':
      return { label: 'Status' }
    case 'schedule':
      return { label: 'Schedule' }
    case 'billing':
      return { label: 'Billing' }
    case 'other':
      return { label: 'Other' }
    default:
      return { label: 'All' }
  }
}

function getCategoryTone(category: NotificationCategory) {
  switch (category) {
    case 'dispatch':
      return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
    case 'status':
      return 'border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
    case 'schedule':
      return 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'billing':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    default:
      return 'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300'
  }
}

function getNotificationCategory(type: string): NotificationCategory {
  switch (type) {
    case 'job_assigned':
    case 'new_assignment':
      return 'dispatch'
    case 'job_status_changed':
      return 'status'
    case 'schedule_changed':
    case 'appointment_reminder':
      return 'schedule'
    case 'payment_received':
    case 'invoice_sent':
      return 'billing'
    default:
      return 'other'
  }
}

function groupNotificationsByDay(notifications: Notification[]) {
  const groups = new Map<string, Notification[]>()

  for (const notification of notifications) {
    const created = new Date(notification.created_at)
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
    const items = groups.get(key) ?? []
    items.push(notification)
    groups.set(key, items)
  }

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      let label: string
      if (key === todayKey) {
        label = 'Today'
      } else if (key === yesterdayKey) {
        label = 'Yesterday'
      } else {
        const date = new Date(`${key}T00:00:00`)
        label = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }

      return { key, label, items }
    })
}
