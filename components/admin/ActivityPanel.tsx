'use client'

import { useState, useCallback } from 'react'
import { 
  Clock, 
  CheckCircle2, 
  User, 
  Wrench, 
  AlertCircle, 
  RefreshCw,
  Inbox,
  MoreHorizontal,
  Loader2
} from '@/components/ui/lucide'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'

// Activity Types
type ActivityType = 'job' | 'technician' | 'system' | 'all'

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  subtitle: string
  timestamp: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_way' | 'active' | 'info' | 'warning'
  avatar?: string
  icon?: React.ElementType
}

interface ActivityPanelProps {
  activities?: ActivityItem[]
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  isLoading?: boolean
  className?: string
}

// Mock data generator for demo
const generateMockActivities = (): ActivityItem[] => [
  {
    id: '1',
    type: 'job',
    title: 'Job #1234 completed',
    subtitle: 'Alex Rivera finished job at 4:30 PM',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    status: 'completed',
    avatar: 'A',
  },
  {
    id: '2',
    type: 'technician',
    title: 'Sarah Chen is on the way',
    subtitle: 'Heading to 123 Main St, ETA 15 min',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'on_way',
    avatar: 'S',
  },
  {
    id: '3',
    type: 'system',
    title: 'Payment received',
    subtitle: 'Invoice #INV-5678 paid ($450.00)',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'active',
    icon: CheckCircle2,
  },
  {
    id: '4',
    type: 'job',
    title: 'Job #1235 started',
    subtitle: 'David Park began work at 3:45 PM',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: 'in_progress',
    avatar: 'D',
  },
  {
    id: '5',
    type: 'system',
    title: 'New appointment scheduled',
    subtitle: 'Client: Robert Taylor - Tomorrow 9:00 AM',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    status: 'scheduled',
    icon: Clock,
  },
  {
    id: '6',
    type: 'technician',
    title: 'Lisa Wong checked in',
    subtitle: 'Arrived at job site - 456 Oak Ave',
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
    status: 'active',
    avatar: 'L',
  },
  {
    id: '7',
    type: 'job',
    title: 'Job #1233 cancelled',
    subtitle: 'Client request - rescheduled to Friday',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'cancelled',
    avatar: 'C',
  },
  {
    id: '8',
    type: 'system',
    title: 'Low inventory alert',
    subtitle: 'HVAC filters below minimum threshold',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: 'warning',
    icon: AlertCircle,
  },
]

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Filter tabs configuration
const filterTabs: { value: ActivityType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'job', label: 'Jobs' },
  { value: 'technician', label: 'Technicians' },
  { value: 'system', label: 'System' },
]

// Activity Item Component
function ActivityItemCard({ 
  activity, 
  index 
}: { 
  activity: ActivityItem
  index: number 
}) {
  const Icon = activity.icon || (activity.type === 'job' ? Wrench : activity.type === 'technician' ? User : AlertCircle)
  
  const getAvatarColor = (letter: string) => {
    const colors = [
      'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%)',
      'linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(5, 150, 105) 100%)',
      'linear-gradient(135deg, rgb(245, 158, 11) 0%, rgb(217, 119, 6) 100%)',
      'linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(124, 58, 237) 100%)',
      'linear-gradient(135deg, rgb(236, 72, 153) 0%, rgb(219, 39, 119) 100%)',
    ]
    return colors[letter.charCodeAt(0) % colors.length]
  }

  return (
    <div
      className="group flex items-start gap-4 p-4 rounded-lg transition-all duration-200 hover:bg-white/5"
      style={{
        animation: `fadeInUp 0.4s ease-out ${index * 80}ms both`,
      }}
    >
      {/* Avatar/Icon */}
      <div className="flex-shrink-0">
        {activity.avatar ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-mono font-bold text-sm"
            style={{ background: getAvatarColor(activity.avatar) }}
          >
            {activity.avatar}
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ 
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
            }}
          >
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-mono text-sm font-semibold text-white whitespace-nowrap">
              {activity.title}
            </p>
            <p className="font-mono text-xs text-gray-400 mt-0.5 whitespace-nowrap">
              {activity.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
              {formatRelativeTime(activity.timestamp)}
            </span>
            <StatusBadge 
              status={activity.status} 
              size="sm" 
              pulse={['in_progress', 'on_way', 'active'].includes(activity.status)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState({ filter }: { filter: ActivityType }) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4"
      style={{ animation: 'fadeIn 0.4s ease-out' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          background: 'rgba(34, 211, 238, 0.05)',
          border: '1px solid rgba(34, 211, 238, 0.2)',
        }}
      >
        <Inbox className="w-8 h-8 text-cyan-400/50" />
      </div>
      <p className="font-mono text-sm text-gray-400 text-center">
        No recent {filter === 'all' ? 'activity' : filter + ' activity'}
      </p>
      <p className="font-mono text-xs text-gray-600 text-center mt-1">
        Check back later for updates
      </p>
    </div>
  )
}

// Main Activity Panel Component
export default function ActivityPanel({
  activities: propActivities,
  onLoadMore,
  hasMore = false,
  isLoading: propLoading = false,
  className,
}: ActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityType>('all')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const activities = propActivities || generateMockActivities()

  // Filter activities
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter)

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || isLoadingMore) return
    setIsLoadingMore(true)
    await onLoadMore()
    setIsLoadingMore(false)
  }, [onLoadMore, isLoadingMore])

  return (
    <div 
      className={cn("rounded-xl overflow-hidden flex flex-col", className)}
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        border: '1px solid rgba(34, 211, 238, 0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(34, 211, 238, 0.1)' }}
      >
        <div className="flex items-center gap-3">
          <h3 
            className="font-mono text-sm font-semibold text-white tracking-wider"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.125rem' }}
          >
            ACTIVITY FEED
          </h3>
          <div className="flex items-center gap-1.5">
            <span 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: 'rgb(34, 211, 238)',
                boxShadow: '0 0 8px rgba(34, 211, 238, 0.8)',
              }}
            />
            <span className="font-mono text-xs text-cyan-400">LIVE</span>
          </div>
        </div>
        <button 
          className="p-2 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all duration-200"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div 
        className="px-3 py-3 flex items-center gap-1 overflow-x-auto"
        style={{ 
          borderBottom: '1px solid rgba(34, 211, 238, 0.1)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {filterTabs.map((tab) => (
          <button type="button"
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'px-4 py-1.5 rounded-full font-mono text-xs font-medium whitespace-nowrap transition-all duration-200',
              filter === tab.value 
                ? 'text-cyan-400' 
                : 'text-gray-400 hover:text-white'
            )}
            style={{
              backgroundColor: filter === tab.value 
                ? 'rgba(34, 211, 238, 0.1)' 
                : 'transparent',
              border: filter === tab.value 
                ? '1px solid rgba(34, 211, 238, 0.3)' 
                : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto max-h-[480px]">
        {propLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="divide-y divide-cyan-400/5">
            {filteredActivities.map((activity, index) => (
              <ActivityItemCard 
                key={activity.id} 
                activity={activity} 
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {(hasMore || onLoadMore) && (
        <div 
          className="px-4 py-3 flex justify-center"
          style={{ borderTop: '1px solid rgba(34, 211, 238, 0.1)' }}
        >
          <button type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all duration-200 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>Load More</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}


