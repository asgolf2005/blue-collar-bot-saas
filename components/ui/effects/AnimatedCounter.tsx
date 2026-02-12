'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const animateValue = useCallback(() => {
    const start = 0
    const end = value
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function - easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      const currentValue = start + (end - start) * easeProgress
      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [duration, value])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          animateValue()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animateValue, hasAnimated])

  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals)
    }
    return Math.floor(num).toLocaleString()
  }

  return (
    <span ref={ref} className={`font-bold tabular-nums ${className}`}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  )
}
