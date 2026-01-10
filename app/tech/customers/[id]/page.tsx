import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default async function TechCustomerPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tech') {
    redirect('/tech/today')
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, address, created_at')
    .eq('id', params.id)
    .single()

  if (error || !customer) {
    notFound()
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, description, status, scheduled_start, scheduled_end')
    .eq('customer_id', customer.id)
    .eq('technician_id', user.id)
    .order('scheduled_start', { ascending: false })

  const totalJobs = jobs?.length || 0
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
  const upcomingJobs = jobs?.filter(j => j.scheduled_start && new Date(j.scheduled_start) > new Date()).length || 0

  const statusColors: Record<string, string> = {
    scheduled: 'bg-primary/10 text-primary border border-primary/20',
    on_the_way: 'bg-warning/10 text-warning border border-warning/20',
    arrived: 'bg-info/10 text-info border border-info/20',
    in_progress: 'bg-warning/10 text-warning border border-warning/20',
    completed: 'bg-success/10 text-success border border-success/20',
    cancelled: 'bg-danger/10 text-danger border border-danger/20',
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/tech/today"
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink">{customer.name}</h1>
          <p className="text-surface-500 text-sm">
            Customer since {format(new Date(customer.created_at), 'MMMM dd, yyyy')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Jobs</p>
              <p className="text-2xl font-bold text-ink">{totalJobs}</p>
            </div>
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Completed</p>
              <p className="text-2xl font-bold text-success">{completedJobs}</p>
            </div>
            <Calendar className="w-8 h-8 text-success" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Upcoming</p>
              <p className="text-2xl font-bold text-info">{upcomingJobs}</p>
            </div>
            <Calendar className="w-8 h-8 text-info" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-ink mb-4">Contact Information</h2>
          <div className="space-y-3">
            {customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-surface-500 mt-0.5" />
                <div>
                  <p className="text-sm text-surface-500">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-primary hover:text-primary/80">
                    {customer.email}
                  </a>
                </div>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-surface-500 mt-0.5" />
                <div>
                  <p className="text-sm text-surface-500">Phone</p>
                  <a href={`tel:${customer.phone}`} className="text-primary hover:text-primary/80">
                    {customer.phone}
                  </a>
                </div>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-surface-500 mt-0.5" />
                <div>
                  <p className="text-sm text-surface-500">Address</p>
                  <p className="text-ink">{customer.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Jobs</h2>
            <span className="text-sm text-muted">{totalJobs} total</span>
          </div>

          {jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/tech/jobs/${job.id}`}
                  className="block p-4 bg-surface-50 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-ink">{job.description || 'Untitled Job'}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[job.status] || 'bg-surface-200 text-surface-600'}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-surface-500">
                    {job.scheduled_start && (
                      <span>{format(new Date(job.scheduled_start), 'MMM dd, yyyy')}</span>
                    )}
                    {job.scheduled_end && (
                      <span>{format(new Date(job.scheduled_end), 'h:mm a')}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted" />
              </div>
              <p className="text-ink font-medium mb-1">No jobs yet</p>
              <p className="text-sm text-muted">Jobs with this customer will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
