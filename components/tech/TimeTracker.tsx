'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Play, Pause, StopCircle, Timer } from 'lucide-react'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'

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

  if (!activeEntry) {
    return (
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Time Tracking</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600">
            <Timer className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-400 mb-4">Not clocked in yet</p>
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            Clock In
          </button>
        </div>
      </div>
    )
  }

  const workMinutes = getWorkDuration()

  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Time Tracking</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isOnBreak ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isOnBreak ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isOnBreak ? 'Break' : 'Active'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Timer Display */}
        <div className="text-center py-6 px-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
          <div className="text-5xl font-bold text-white tabular-nums tracking-tight drop-shadow-lg">
            {formatDurationDetailed(workMinutes)}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Clocked in {formatDistanceToNow(new Date(activeEntry.clock_in), { addSuffix: true })}
          </p>
        </div>

        {/* Break Info */}
        {totalBreakMinutes > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="text-sm text-amber-400">Break time</span>
            <span className="text-sm font-bold text-amber-400">
              {formatDuration(totalBreakMinutes)}
              {isOnBreak && breakStart && (
                <span className="text-amber-400/60"> + current</span>
              )}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleToggleBreak}
            className={`h-12 flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-[0.98] ${
              isOnBreak
                ? 'bg-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                : 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
            }`}
          >
            {isOnBreak ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isOnBreak ? 'End Break' : 'Take Break'}
          </button>

          <button
            onClick={handleClockOut}
            disabled={loading}
            className="h-12 flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <StopCircle className="w-4 h-4" />
            Clock Out
          </button>
        </div>
      </div>
    </div>
  )
}
