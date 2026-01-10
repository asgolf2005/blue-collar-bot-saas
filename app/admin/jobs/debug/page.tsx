import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SeedButton from './SeedButton'

export default async function JobsDebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, status, scheduled_start, total_cost, description')
    .eq('business_id', profile!.business_id)
    .order('scheduled_start', { ascending: false })
    .limit(50)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total, status')
    .eq('business_id', profile!.business_id)
    .limit(20)

  // Group jobs by status
  const statusCounts: Record<string, number> = {}
  jobs?.forEach(job => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1
  })

  return (
    <div className="p-8 space-y-8">
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Jobs Data Debug</h1>
          <SeedButton />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-ink mb-2">Total Jobs: {jobs?.length || 0}</h3>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-2">Status Breakdown:</h3>
            <div className="space-y-1">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="text-sm">
                  <span className="badge badge-scheduled mr-2">{status}</span>
                  <span className="text-muted">× {count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-2">Recent Jobs (first 10):</h3>
            <div className="space-y-2">
              {jobs?.slice(0, 10).map(job => (
                <div key={job.id} className="text-sm p-3 bg-surface-50 rounded-lg">
                  <div><strong>ID:</strong> {job.id.slice(0, 8)}...</div>
                  <div><strong>Status:</strong> <span className="badge badge-scheduled">{job.status}</span></div>
                  <div><strong>Date:</strong> {job.scheduled_start || 'No date'}</div>
                  <div><strong>Total:</strong> ${job.total_cost ? job.total_cost.toFixed(2) : '0.00'}</div>
                  <div><strong>Description:</strong> {job.description || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-2">Invoices: {invoices?.length || 0}</h3>
            <div className="space-y-1">
              {invoices?.map(inv => (
                <div key={inv.id} className="text-sm">
                  <span className="text-muted">{inv.id.slice(0, 8)}...</span>
                  <span className="mx-2">-</span>
                  <span className="badge badge-scheduled">{inv.status}</span>
                  <span className="mx-2">-</span>
                  <span className="font-mono">${Number(inv.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
