'use client'

import { useEffect, useState } from 'react'
import { Clock } from '@/components/ui/icons'

interface ETABadgeProps {
  minutes: number
  label?: string
  className?: string
}

export default function ETABadge({ minutes, label = 'ETA', className = '' }: ETABadgeProps) {
  const [displayMinutes, setDisplayMinutes] = useState(minutes)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (displayMinutes !== minutes) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true)

      // Small delay before updating the number to show the animation
      const timer = setTimeout(() => {
        setDisplayMinutes(minutes)
        setIsAnimating(false)
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [minutes, displayMinutes])

  return (
    <span className={`eta-badge ${className}`}>
      <Clock className="w-4 h-4" />
      <span className="font-medium">{label}:</span>
      <span className={`font-bold font-mono ${isAnimating ? 'eta-minutes' : ''}`} key={displayMinutes}>
        {displayMinutes} min
      </span>
    </span>
  )
}

