'use client'

import { useEffect, useState } from 'react'
import { formatDistance, formatDuration } from '@/lib/maps/eta-calculator'

interface TechnicianETAProps {
  jobId: string
  jobAddress: string
  techName: string
}

interface ETAData {
  distance: number
  duration: number
  arrivalTime: string
  isMoving: boolean
}

export default function TechnicianETA({ jobId, jobAddress, techName }: TechnicianETAProps) {
  const [eta, setEta] = useState<ETAData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchETA = async () => {
      try {
        const response = await fetch(`/api/tracking/eta?job_id=${jobId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch ETA')
        }

        const data = await response.json()
        setEta(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching ETA:', err)
        setError('Unable to calculate ETA')
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchETA()

    // Update every 30 seconds
    interval = setInterval(fetchETA, 30000)

    return () => clearInterval(interval)
  }, [jobId])

  if (isLoading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    )
  }

  if (error || !eta) {
    return (
      <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-muted">Your technician will arrive soon</div>
      </div>
    )
  }

  const arrivalTime = new Date(eta.arrivalTime)
  const minutesAway = Math.ceil(eta.duration / 60)

  return (
    <div className="card p-4 border-l-4 border-primary">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {techName} is on the way
          </h3>
          <p className="text-sm text-muted mt-1">Heading to {jobAddress}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ETA */}
        <div className="p-3 bg-primary/5 rounded-lg">
          <div className="mb-1 text-xs text-muted uppercase">Estimated Arrival</div>
          <div className="text-2xl font-bold text-primary">
            {minutesAway < 60 ? `${minutesAway} min` : formatDuration(eta.duration)}
          </div>
          <div className="text-xs text-muted mt-1">
            {arrivalTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>

        {/* Distance */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="mb-1 text-xs text-muted uppercase">Distance Away</div>
          <div className="text-2xl font-bold">
            {formatDistance(eta.distance)}
          </div>
          <div className="text-xs text-muted mt-1">
            {eta.isMoving ? 'In transit' : 'Not moving'}
          </div>
        </div>
      </div>

      {minutesAway <= 10 && (
        <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-sm text-success font-medium">
            Heads up: your technician will arrive in about {minutesAway} minutes.
          </p>
        </div>
      )}

      <p className="text-xs text-muted mt-4 text-center">
        Updated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
  )
}
