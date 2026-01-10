'use client'

import { Job, Customer } from '@/lib/types'
import JobCard from './JobCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CalendarX } from 'lucide-react'

interface JobWithCustomer extends Job {
  customer: Customer
}

export default function TodayJobsList({ jobs }: { jobs: JobWithCustomer[] }) {
  if (jobs.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState
          icon={<CalendarX className="w-full h-full" />}
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
