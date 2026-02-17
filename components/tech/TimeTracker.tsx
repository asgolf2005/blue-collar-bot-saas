'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

import { differenceInMinutes, format, formatDistanceToNow } from 'date-fns'

interface TimeTrackerProps {
  jobId: string
}

interface TimeEntry {
  id?: string
  job_id: string
  technician_id: string
  clock_in: string
  clock_out?: string | null
  break_minutes?: number
}

export default function TimeTracker({ jobId }: TimeTrackerProps) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [history, setHistory] = useState<TimeEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakStart, setBreakStart] = useState<Date | null>(null)
  const [totalBreakMinutes, setTotalBreakMinutes] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadActiveEntry = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('job_id', jobId)
        .eq('technician_id', user.id)
        .is('clock_out', null)
        .single()

      if (data) {
        setActiveEntry(data)
        setTotalBreakMinutes(data.break_minutes || 0)
      }
    } catch (error) {
      // No active entry found
    }
  }, [jobId, supabase])

  useEffect(() => {
    loadActiveEntry()
  }, [loadActiveEntry])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('job_id', jobId)
        .eq('technician_id', user.id)
        .not('clock_out', 'is', null)
        .order('clock_in', { ascending: false })
        .limit(30)

      if (error) throw error
      setHistory(data || [])
    } catch (e) {
      // Keep UI stable even if history fails to load.
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [jobId, supabase])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleClockIn = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newEntry: TimeEntry = {
        job_id: jobId,
        technician_id: user.id,
        clock_in: new Date().toISOString(),
        break_minutes: 0,
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert(newEntry)
        .select()
        .single()

      if (error) throw error

      setActiveEntry(data)
      setTotalBreakMinutes(0)
      void loadHistory()
    } catch (error: any) {
      alert('Failed to clock in: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeEntry) return
    setLoading(true)

    try {
      const clockOutTime = new Date().toISOString()

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime,
          break_minutes: totalBreakMinutes,
        })
        .eq('id', activeEntry.id)

      if (error) throw error

      setActiveEntry(null)
      setIsOnBreak(false)
      setBreakStart(null)
      setTotalBreakMinutes(0)
      void loadHistory()
    } catch (error: any) {
      alert('Failed to clock out: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBreak = () => {
    if (isOnBreak && breakStart) {
      const breakDuration = differenceInMinutes(new Date(), breakStart)
      setTotalBreakMinutes(totalBreakMinutes + breakDuration)
      setBreakStart(null)
      setIsOnBreak(false)
    } else {
      setBreakStart(new Date())
      setIsOnBreak(true)
    }
  }

  const getWorkDuration = () => {
    if (!activeEntry) return 0

    const totalMinutes = differenceInMinutes(currentTime, new Date(activeEntry.clock_in))
    const currentBreak = isOnBreak && breakStart ? differenceInMinutes(currentTime, breakStart) : 0
    const workMinutes = totalMinutes - totalBreakMinutes - currentBreak

    return Math.max(0, workMinutes)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatDurationDetailed = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const calcNetMinutes = useCallback((entry: TimeEntry) => {
    if (!entry.clock_out) return 0
    const total = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in))
    const breaks = entry.break_minutes || 0
    return Math.max(0, total - breaks)
  }, [])

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, { date: Date; entries: TimeEntry[]; totalMinutes: number }>()

    for (const entry of history) {
      const d = new Date(entry.clock_in)
      const key = format(d, 'yyyy-MM-dd')
      const existing = groups.get(key)
      const net = calcNetMinutes(entry)
      if (existing) {
        existing.entries.push(entry)
        existing.totalMinutes += net
      } else {
        groups.set(key, { date: d, entries: [entry], totalMinutes: net })
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [calcNetMinutes, history])

  const WorkLog = () => (
    <div className="pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Work Log</p>
        {!historyLoading && history.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 entries</p>
        )}
      </div>

      {historyLoading ? (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          Loading history...
        </div>
      ) : history.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          No time entries yet. Clock in and clock out to create a record.
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {groupedHistory.map((group) => (
            <div key={format(group.date, 'yyyy-MM-dd')} className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{format(group.date, 'EEE, d MMM')}</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDuration(group.totalMinutes)}</p>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {group.entries.map((entry) => {
                  const start = new Date(entry.clock_in)
                  const end = entry.clock_out ? new Date(entry.clock_out) : null
                  const breaks = entry.break_minutes || 0
                  const net = calcNetMinutes(entry)

                  return (
                    <div key={entry.id || entry.clock_in} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {format(start, 'h:mm a')}
                          {end ? ` - ${format(end, 'h:mm a')}` : ''}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Break {breaks}m
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDuration(net)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (!activeEntry) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.12),transparent_55%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.16),transparent_55%)]" />
        <div className="relative mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Time Tracking</h3>
        </div>
        <div className="relative text-center py-6">
          <p className="mb-4 text-slate-600 dark:text-slate-300">Not clocked in yet</p>
          <button type="button"
            onClick={handleClockIn}
            disabled={loading}
            className="group relative h-12 w-full overflow-hidden rounded-2xl font-semibold text-white transition-opacity active:scale-[0.98] disabled:opacity-50"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 transition-opacity group-hover:opacity-100 dark:from-cyan-500 dark:to-blue-500" />
            <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
            <span className="relative inline-flex items-center justify-center gap-2">Clock In</span>
          </button>
        </div>

        <div className="relative">
          <WorkLog />
        </div>
      </div>
    )
  }

  const workMinutes = getWorkDuration()

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.12),transparent_55%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.16),transparent_55%)]" />

      <div className="relative mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Time Tracking</h3>
        <div className="flex items-center gap-1.5">
          <div
            className={`h-2 w-2 rounded-full ${isOnBreak ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.55)]'}`}
          />
          <span className={`text-xs font-semibold uppercase tracking-wider ${isOnBreak ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {isOnBreak ? 'Break' : 'Active'}
          </span>
        </div>
      </div>

      <div className="relative space-y-4">
        {/* Timer Display */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div className="font-display-soft text-5xl tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            {formatDurationDetailed(workMinutes)}
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Clocked in {formatDistanceToNow(new Date(activeEntry.clock_in), { addSuffix: true })}
          </p>
        </div>

        {/* Break Info */}
        {totalBreakMinutes > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-400/25 dark:bg-amber-400/10">
            <span className="text-sm text-amber-800 dark:text-amber-200">Break time</span>
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {formatDuration(totalBreakMinutes)}
              {isOnBreak && breakStart && (
                <span className="text-amber-700/60 dark:text-amber-200/60"> + current</span>
              )}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={handleToggleBreak}
            className={`h-12 flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all active:scale-[0.98] ${
              isOnBreak
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400'
                : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15'
            }`}
          >
            {isOnBreak ? 'End Break' : 'Take Break'}
          </button>

          <button type="button"
            onClick={handleClockOut}
            disabled={loading}
            className="h-12 flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-red-800 font-semibold hover:bg-red-100 transition-all active:scale-[0.98] disabled:opacity-50 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15"
          >
            Clock Out
          </button>
        </div>

        <WorkLog />
      </div>
    </div>
  )
}
