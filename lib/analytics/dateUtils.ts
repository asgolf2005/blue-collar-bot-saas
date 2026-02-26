/**
 * Shared date utilities for analytics
 * Ensures consistent date handling across all analytics pages
 */

export type DateRangeKey = '7d' | '14d' | '30d' | '6m' | '1y' | 'all'

export const ADMIN_RANGE_OPTIONS: Array<{
  key: DateRangeKey
  label: string
  shortLabel: string
}> = [
  { key: '7d', label: '7 Days', shortLabel: '7 Days' },
  { key: '14d', label: '14 Days', shortLabel: '14 Days' },
  { key: '30d', label: '30 Days', shortLabel: '30 Days' },
  { key: '6m', label: '6 Months', shortLabel: '6 Months' },
  { key: '1y', label: '1 Year', shortLabel: '1 Year' },
  { key: 'all', label: 'All Time', shortLabel: 'All Time' },
]

export function resolveDateRangeKey(raw: string | string[] | null | undefined, fallback: DateRangeKey = '30d'): DateRangeKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return fallback
  return ADMIN_RANGE_OPTIONS.some(option => option.key === value)
    ? (value as DateRangeKey)
    : fallback
}

export function getRangeLookbackDays(range: DateRangeKey): number {
  switch (range) {
    case '7d':
      return 7
    case '14d':
      return 14
    case '30d':
      return 30
    case '6m':
      return 180
    case '1y':
    case 'all':
      return 365
    default:
      return 30
  }
}

export interface DateRange {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
}

/**
 * Get date range for analytics queries
 * Returns current period and previous period for trend comparison
 */
export function getDateRange(range: DateRangeKey): DateRange {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  
  const start = new Date(end)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  
  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7)
      prevStart.setDate(prevEnd.getDate() - 7)
      break
    case '14d':
      start.setDate(end.getDate() - 14)
      prevStart.setDate(prevEnd.getDate() - 14)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      prevStart.setDate(prevEnd.getDate() - 30)
      break
    case '6m':
      start.setMonth(end.getMonth() - 6)
      prevStart.setMonth(prevEnd.getMonth() - 6)
      break
    case '1y':
      start.setFullYear(end.getFullYear() - 1)
      prevStart.setFullYear(prevEnd.getFullYear() - 1)
      break
    case 'all':
      // For 'all', return a very early date
      start.setFullYear(2000, 0, 1)
      prevStart.setFullYear(1999, 0, 1)
      break
    default:
      start.setDate(end.getDate() - 30)
      prevStart.setDate(prevEnd.getDate() - 30)
  }
  
  start.setHours(0, 0, 0, 0)
  prevStart.setHours(0, 0, 0, 0)
  prevEnd.setHours(23, 59, 59, 999)
  
  return { start, end, prevStart, prevEnd }
}

/**
 * Format date for display in charts
 */
export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
}

/**
 * Format date for SQL queries (YYYY-MM-DD)
 */
export function formatSQLDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Check if a date string falls within a range
 */
export function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  const date = new Date(dateStr)
  return date >= start && date <= end
}

/**
 * Generate all dates in a range for chart data
 */
export function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(start)
  
  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

/**
 * Get the start of day
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the end of day
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
