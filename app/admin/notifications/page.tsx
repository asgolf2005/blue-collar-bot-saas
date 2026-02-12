'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { 
  Bell, 
  CheckCheck,
  Check,
  Package,
  DollarSign,
  Info,
  ArrowRight,
  X,
  Filter,
  Clock
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

// Types
interface Notification {
  id: string
  title: string
  message: string
  type: 'job' | 'system' | 'billing'
  read: boolean
  link: string | null
  created_at: string
}

// Mock data for demo
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New job assigned',
    message: 'Toilet repair at Acme Corp',
    type: 'job',
    read: false,
    link: '/admin/jobs/1',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Payment received',
    message: '$450 from Robert Wilson for INV-001',
    type: 'billing',
    read: false,
    link: '/admin/invoices/1',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'System update',
    message: 'New features available in your dashboard',
    type: 'system',
    read: true,
    link: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    title: 'Job completed',
    message: 'HVAC installation completed by Mike',
    type: 'job',
    read: true,
    link: '/admin/jobs/2',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    title: 'Invoice overdue',
    message: 'INV-002 is now 5 days overdue',
    type: 'billing',
    read: false,
    link: '/admin/invoices/2',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '6',
    title: 'Schedule changed',
    message: 'Job rescheduled for tomorrow at 2 PM',
    type: 'job',
    read: true,
    link: '/admin/schedule',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  },
]

type TypeFilter = 'all' | 'job' | 'system' | 'billing'

export default function NotificationsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [notifications, setNotifications] = useState(mockNotifications)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (typeFilter === 'all') return notifications
    return notifications.filter(n => n.type === typeFilter)
  }, [notifications, typeFilter])

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      today: [],
      yesterday: [],
      earlier: []
    }

    filteredNotifications.forEach(notification => {
      const date = parseISO(notification.created_at)
      if (isToday(date)) {
        groups.today.push(notification)
      } else if (isYesterday(date)) {
        groups.yesterday.push(notification)
      } else {
        groups.earlier.push(notification)
      }
    })

    return groups
  }, [filteredNotifications])

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Dismiss notification
  const dismissNotification = (id: string) => {
    setDismissingId(id)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      setDismissingId(null)
    }, 300)
  }

  // Format current date
  const now = new Date()
  const sysTime = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).toUpperCase().replace(/,/g, '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-slate-900 dark:text-white tracking-wide">
            ALERTS
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1 tracking-widest">
            SYS.TIME: {sysTime} | {unreadCount} UNREAD
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={markAllAsRead}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white font-mono text-xs px-5 py-2.5 rounded-full transition-all"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            MARK ALL READ
          </Button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="TOTAL ALERTS"
          value={notifications.length}
          icon={Bell}
          color="blue"
        />
        <MetricCard
          label="UNREAD"
          value={unreadCount}
          icon={Info}
          color="amber"
        />
        <MetricCard
          label="READ"
          value={notifications.length - unreadCount}
          icon={Check}
          color="emerald"
        />
        <MetricCard
          label="TODAY"
          value={groupedNotifications.today.length}
          icon={Clock}
          color="cyan"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-2" />
          {(['all', 'job', 'system', 'billing'] as TypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-full font-mono text-xs capitalize transition-colors ${
                typeFilter === type
                  ? 'bg-blue-600 dark:bg-cyan-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                No notifications found
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Today */}
            {groupedNotifications.today.length > 0 && (
              <NotificationGroup 
                title="Today" 
                notifications={groupedNotifications.today}
                onDismiss={dismissNotification}
                dismissingId={dismissingId}
              />
            )}

            {/* Yesterday */}
            {groupedNotifications.yesterday.length > 0 && (
              <NotificationGroup 
                title="Yesterday" 
                notifications={groupedNotifications.yesterday}
                onDismiss={dismissNotification}
                dismissingId={dismissingId}
              />
            )}

            {/* Earlier */}
            {groupedNotifications.earlier.length > 0 && (
              <NotificationGroup 
                title="Earlier" 
                notifications={groupedNotifications.earlier}
                onDismiss={dismissNotification}
                dismissingId={dismissingId}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Notification Group
function NotificationGroup({ 
  title, 
  notifications,
  onDismiss,
  dismissingId
}: { 
  title: string
  notifications: Notification[]
  onDismiss: (id: string) => void
  dismissingId: string | null
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-xs text-slate-500 dark:text-slate-400 tracking-wider uppercase px-1">
        {title}
      </h3>
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationCard 
            key={notification.id} 
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
            isDismissing={dismissingId === notification.id}
          />
        ))}
      </div>
    </div>
  )
}

// Notification Card
function NotificationCard({ 
  notification, 
  onDismiss,
  isDismissing
}: { 
  notification: Notification
  onDismiss: () => void
  isDismissing: boolean
}) {
  const colors = getNotificationColors(notification.type)
  
  const CardContent = (
    <div className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
      notification.read 
        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
        : 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-400/20'
    } ${isDismissing ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}>
      
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600 dark:bg-cyan-500" />
      )}
      
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
        {getNotificationIcon(notification.type, `w-5 h-5 ${colors.text}`)}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={`font-mono text-sm font-medium ${
              notification.read 
                ? 'text-slate-700 dark:text-slate-300' 
                : 'text-slate-900 dark:text-white'
            }`}>
              {notification.title}
            </h3>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {notification.message}
            </p>
          </div>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
            {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3">
          {notification.link && (
            <Link 
              href={notification.link}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 font-mono text-xs hover:bg-blue-200 dark:hover:bg-blue-400/20 transition-colors"
            >
              View Job
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )

  if (notification.link) {
    return (
      <Link href={notification.link} className="block group">
        {CardContent}
      </Link>
    )
  }

  return CardContent
}

// Metric Card
function MetricCard({ 
  label, 
  value, 
  icon: Icon,
  color
}: { 
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, { light: string; dark: string }> = {
    blue: { light: 'text-blue-600', dark: 'dark:text-blue-400' },
    cyan: { light: 'text-cyan-600', dark: 'dark:text-cyan-400' },
    emerald: { light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
    amber: { light: 'text-amber-600', dark: 'dark:text-amber-400' },
  }
  const c = colors[color]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${c.light} ${c.dark}`} />
        </div>
        <div>
          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">{label}</div>
          <div className={`font-display text-3xl ${c.light} ${c.dark}`}>{value}</div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getNotificationIcon(type: string, className: string) {
  switch (type) {
    case 'job':
      return <Package className={className} />
    case 'system':
      return <Info className={className} />
    case 'billing':
      return <DollarSign className={className} />
    default:
      return <Bell className={className} />
  }
}

function getNotificationColors(type: string) {
  switch (type) {
    case 'job':
      return {
        bg: 'bg-blue-100 dark:bg-blue-400/10',
        text: 'text-blue-600 dark:text-blue-400'
      }
    case 'system':
      return {
        bg: 'bg-amber-100 dark:bg-amber-400/10',
        text: 'text-amber-600 dark:text-amber-400'
      }
    case 'billing':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-400/10',
        text: 'text-emerald-600 dark:text-emerald-400'
      }
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-700',
        text: 'text-slate-600 dark:text-slate-400'
      }
  }
}
