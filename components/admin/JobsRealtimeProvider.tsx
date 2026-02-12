'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useRealtimeJobsUnified } from '@/hooks/useRealtimeJobsUnified'
import { RealtimeToastContainer, useRealtimeToasts } from '@/components/ui/RealtimeToast'
import type { Job, JobStatus } from '@/lib/types'

interface JobsRealtimeContextType {
  jobs: Job[]
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: string | null
  lastUpdate: Date | null
  refetch: () => Promise<void>
  enableNotifications: boolean
  setEnableNotifications: (enabled: boolean) => void
}

const JobsRealtimeContext = createContext<JobsRealtimeContextType | null>(null)

interface JobsRealtimeProviderProps {
  children: ReactNode
  businessId: string
  initialJobs?: Job[]
  enableNotifications?: boolean
}

/**
 * JobsRealtimeProvider
 * 
 * Provides real-time job updates throughout the admin dashboard.
 * Includes toast notifications for status changes and connection status.
 * 
 * Usage:
 * ```tsx
 * <JobsRealtimeProvider businessId="uuid" initialJobs={jobs}>
 *   <YourComponent />
 * </JobsRealtimeProvider>
 * ```
 */
export function JobsRealtimeProvider({
  children,
  businessId,
  initialJobs = [],
  enableNotifications: initialEnableNotifications = true,
}: JobsRealtimeProviderProps) {
  const [enableNotifications, setEnableNotifications] = useState(initialEnableNotifications)
  const { toasts, dismissToast, showStatusChange, showNewJob, showError } = useRealtimeToasts()
  const prevJobsRef = useRef<Map<string, Job>>(new Map())
  const initializedRef = useRef(false)

  // Set up real-time subscription
  const { jobs, isConnected, error, connectionStatus, refetch, lastUpdate } = useRealtimeJobsUnified({
    businessId,
    initialJobs,
  })

  // Show toasts from job diff events
  useEffect(() => {
    const currentJobsMap = new Map(jobs.map((job) => [job.id, job]))

    if (!initializedRef.current) {
      prevJobsRef.current = currentJobsMap
      initializedRef.current = true
      return
    }

    if (enableNotifications) {
      for (const [jobId, currentJob] of currentJobsMap.entries()) {
        const prevJob = prevJobsRef.current.get(jobId)
        if (!prevJob) {
          showNewJob(currentJob.id, currentJob.customer?.name)
          continue
        }

        if (prevJob.status !== currentJob.status) {
          showStatusChange(currentJob.id, currentJob.status as JobStatus)
        }
      }
    }

    prevJobsRef.current = currentJobsMap
  }, [enableNotifications, jobs, showNewJob, showStatusChange])

  // Show connection error toast
  useEffect(() => {
    if (connectionStatus === 'error' && enableNotifications) {
      showError('Real-time updates disconnected. Changes may not appear instantly.')
    }
  }, [connectionStatus, enableNotifications, showError])

  const value: JobsRealtimeContextType = {
    jobs,
    isConnected,
    connectionStatus,
    error,
    lastUpdate,
    refetch,
    enableNotifications,
    setEnableNotifications,
  }

  return (
    <JobsRealtimeContext.Provider value={value}>
      {children}
      <RealtimeToastContainer toasts={toasts} onDismiss={dismissToast} />
    </JobsRealtimeContext.Provider>
  )
}

/**
 * Hook to access real-time job data within the admin dashboard
 * Must be used within a JobsRealtimeProvider
 */
export function useRealtimeJobsContext(): JobsRealtimeContextType {
  const context = useContext(JobsRealtimeContext)
  
  if (!context) {
    throw new Error('useRealtimeJobsContext must be used within a JobsRealtimeProvider')
  }
  
  return context
}

/**
 * Hook for filtered real-time jobs
 * Returns jobs filtered by status
 */
export function useFilteredRealtimeJobs(statusFilter?: JobStatus | JobStatus[]) {
  const { jobs, ...rest } = useRealtimeJobsContext()
  
  const filteredJobs = statusFilter 
    ? Array.isArray(statusFilter)
      ? jobs.filter(job => statusFilter.includes(job.status))
      : jobs.filter(job => job.status === statusFilter)
    : jobs
  
  return { jobs: filteredJobs, ...rest }
}
