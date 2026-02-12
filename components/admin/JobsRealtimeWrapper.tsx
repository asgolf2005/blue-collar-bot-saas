'use client'

import { JobsRealtimeProvider } from './JobsRealtimeProvider'
import type { Job } from '@/lib/types'

interface JobsRealtimeWrapperProps {
  children: React.ReactNode
  businessId: string
  initialJobs?: Job[]
}

/**
 * JobsRealtimeWrapper
 * 
 * Client component wrapper for JobsRealtimeProvider.
 * Use this in server components (like admin pages) to enable real-time updates.
 * 
 * Example usage in a server page:
 * ```tsx
 * export default async function JobsPage() {
 *   const jobs = await fetchJobs()
 *   const businessId = await getBusinessId()
 *   
 *   return (
 *     <JobsRealtimeWrapper businessId={businessId} initialJobs={jobs}>
 *       <JobsList />
 *     </JobsRealtimeWrapper>
 *   )
 * }
 * ```
 */
export function JobsRealtimeWrapper({
  children,
  businessId,
  initialJobs = [],
}: JobsRealtimeWrapperProps) {
  return (
    <JobsRealtimeProvider businessId={businessId} initialJobs={initialJobs}>
      {children}
    </JobsRealtimeProvider>
  )
}
