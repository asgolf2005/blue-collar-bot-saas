'use client'

import { Job, Customer } from '@/lib/types'
import JobCard from './JobCard'
import { EmptyState } from '@/components/ui/EmptyState'

interface JobWithCustomer extends Job {
  customer: Customer
}

export default function TodayJobsList({ jobs }: { jobs: JobWithCustomer[] }) {
  if (jobs.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v1.5M17.25 3v1.5M3 8.25h18M4.5 6.75h15a1.5 1.5 0 011.5 1.5v11.25a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19.5V8.25a1.5 1.5 0 011.5-1.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l6 6m0-6l-6 6" />
            </svg>
          }
          title="No jobs today"
          description="You have no scheduled jobs for today. Check back later or view your full schedule."
          variant="default"
          size="md"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job, index) => (
        <div
          key={job.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <JobCard job={job} />
        </div>
      ))}
    </div>
  )
}
