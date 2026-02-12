'use client'

import { useEffect, useState } from 'react'

interface JobStatusBadgeProps {
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_way' | 'arrived'
  withPulse?: boolean
  animated?: boolean
}

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    className: 'badge-scheduled',
    transitionClass: 'status-transition-scheduled',
  },
  on_way: {
    label: 'On the Way',
    className: 'badge-electric',
    transitionClass: 'status-transition-on-way',
  },
  arrived: {
    label: 'Arrived',
    className: 'badge-profit',
    transitionClass: 'status-transition-arrived',
  },
  in_progress: {
    label: 'In Progress',
    className: 'badge-in-progress',
    transitionClass: 'status-transition-in-progress',
  },
  completed: {
    label: 'Completed',
    className: 'badge-completed',
    transitionClass: 'status-transition-completed',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'badge-cancelled',
    transitionClass: 'status-transition-cancelled',
  },
}

export default function JobStatusBadge({ status, withPulse = false, animated = true }: JobStatusBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevStatus, setPrevStatus] = useState(status)

  useEffect(() => {
    if (animated && prevStatus !== status) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true)
      setPrevStatus(status)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [status, prevStatus, animated])

  const config = statusConfig[status]
  const className = isAnimating
    ? `badge ${config.transitionClass}`
    : `badge ${config.className}`

  return (
    <span className={className}>
      {withPulse && (status === 'in_progress' || status === 'on_way') && (
        <span className="status-dot status-dot-active" />
      )}
      {config.label}
    </span>
  )
}
