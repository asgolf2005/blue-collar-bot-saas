'use client'

import { ReactNode, useEffect, useState } from 'react'

interface AnimatedJobCardProps {
  children: ReactNode
  isNew?: boolean
  showNewBadge?: boolean
  className?: string
}

export default function AnimatedJobCard({
  children,
  isNew = false,
  showNewBadge = false,
  className = '',
}: AnimatedJobCardProps) {
  const [shouldAnimate, setShouldAnimate] = useState(isNew)

  useEffect(() => {
    if (isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldAnimate(true)
      // Remove animation class after it completes
      const timer = setTimeout(() => setShouldAnimate(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  return (
    <div className={`relative ${shouldAnimate ? 'new-job-card' : ''} ${className}`}>
      {showNewBadge && isNew && (
        <span className="new-job-badge">NEW</span>
      )}
      {children}
    </div>
  )
}
