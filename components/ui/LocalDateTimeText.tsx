'use client'

import { format } from 'date-fns'
import { useMemo } from 'react'

interface LocalDateTimeTextProps {
  value?: string | null
  fallback?: string
  pattern?: string
}

export function LocalDateTimeText({
  value,
  fallback = 'No date',
  pattern = 'MMM d, yyyy - h:mm a',
}: LocalDateTimeTextProps) {
  const text = useMemo(() => {
    if (!value) return fallback
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return fallback
    return format(parsed, pattern)
  }, [fallback, pattern, value])

  return <span suppressHydrationWarning>{text}</span>
}
