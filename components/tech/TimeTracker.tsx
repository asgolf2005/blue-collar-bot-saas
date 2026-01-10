'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Play, Pause, StopCircle } from 'lucide-react'
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
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadActiveEntry()
  }, [jobId])

  const loadActiveEntry = async () => {
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
  }

  const handleClockIn = async () => {
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
    }
  }

  const handleClockOut = async () => {
    if (!activeEntry) return

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

  if (!activeEntry) {
    return (
      <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-muted mr-2" />
          <h2 className="font-semibold text-ink">Time Tracking</h2>
        </div>

        <div className="text-center py-6">
          <Clock className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted mb-4">Not clocked in</p>
          <button
            onClick={handleClockIn}
            className="w-full flex items-center justify-center py-3 px-4 bg-primary text-white dark:text-midnight-950 font-medium rounded-xl hover:bg-primary/90 transition"
          >
            <Play className="w-5 h-5 mr-2" />
            Clock In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-50/90 backdrop-blur-xl rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center mb-4">
        <Clock className="w-5 h-5 text-muted mr-2" />
        <h2 className="font-semibold text-ink">Time Tracking</h2>
      </div>

      {/* Active Timer */}
      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-2"></div>
          <span className="text-sm font-medium text-surface-600">
            {isOnBreak ? 'On Break' : 'Working'}
          </span>
        </div>
        <div className="text-3xl font-bold text-warning mb-1">
          {formatDuration(getWorkDuration())}
        </div>
        <p className="text-sm text-muted">
          Clocked in {formatDistanceToNow(new Date(activeEntry.clock_in), { addSuffix: true })}
        </p>
      </div>

      {/* Break Info */}
      {totalBreakMinutes > 0 && (
        <div className="bg-surface-100 border border-surface-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-surface-600">
            <span className="font-medium">Break Time:</span> {formatDuration(totalBreakMinutes)}
            {isOnBreak && breakStart && (
              <span> + {formatDuration(differenceInMinutes(currentTime, breakStart))} (current)</span>
            )}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleToggleBreak}
          className={`flex items-center justify-center py-3 px-4 rounded-xl font-medium transition ${
            isOnBreak
              ? 'bg-success hover:bg-success/90 text-white dark:text-midnight-950'
              : 'bg-primary hover:bg-primary/90 text-white dark:text-midnight-950'
          }`}
        >
          {isOnBreak ? (
            <>
              <Play className="w-4 h-4 mr-2" />
              End Break
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Take Break
            </>
          )}
        </button>

        <button
          onClick={handleClockOut}
          className="flex items-center justify-center py-3 px-4 rounded-xl bg-danger hover:bg-danger/90 text-white dark:text-midnight-950 font-medium transition"
        >
          <StopCircle className="w-4 h-4 mr-2" />
          Clock Out
        </button>
      </div>
    </div>
  )
}
