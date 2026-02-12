'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AnalyticsDebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const businessId = profile.business_id

  // Raw query - get all jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, status, total_cost, created_at')
    .eq('business_id', businessId)

  // Raw query - get all invoices  
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, status, total, created_at, paid_at')
    .eq('business_id', businessId)

  // Calculate manually
  const jobCount = jobs?.length || 0
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
  const paidInvoices = invoices?.filter(i => i.status === 'paid') || []
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="font-display text-4xl text-slate-900 dark:text-white">Analytics Debug</h1>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h2 className="font-mono text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">User Context</h2>
        <p className="font-mono text-xs">User ID: {user.id}</p>
        <p className="font-mono text-xs">Business ID: {businessId}</p>
        <p className="font-mono text-xs">Role: {profile.role}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 p-4">
          <h2 className="font-mono text-sm font-bold text-cyan-800 dark:text-cyan-200 mb-2">Jobs</h2>
          <p className="font-display text-4xl text-cyan-600">{jobCount}</p>
          <p className="font-mono text-xs text-cyan-700 dark:text-cyan-400">
            Completed: {completedJobs}
          </p>
          {jobsError && <p className="text-red-500 text-xs mt-2">{jobsError.message}</p>}
        </div>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-4">
          <h2 className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-200 mb-2">Revenue</h2>
          <p className="font-display text-4xl text-emerald-600">${totalRevenue.toLocaleString()}</p>
          <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
            Paid Invoices: {paidInvoices.length}
          </p>
          {invoicesError && <p className="text-red-500 text-xs mt-2">{invoicesError.message}</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
        <h2 className="font-mono text-sm font-bold mb-2">All Jobs</h2>
        {jobs && jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-left py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-1">{j.id.slice(0, 8)}...</td>
                    <td className="py-1">{j.status}</td>
                    <td className="py-1 text-right">${j.total_cost || 0}</td>
                    <td className="py-1">{new Date(j.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 font-mono text-sm">No jobs found for business_id: {businessId}</p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
        <h2 className="font-mono text-sm font-bold mb-2">All Invoices</h2>
        {invoices && invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-left py-2">Paid At</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-1">{i.id.slice(0, 8)}...</td>
                    <td className="py-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        i.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        i.status === 'sent' ? 'bg-cyan-100 text-cyan-700' :
                        i.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="py-1 text-right">${i.total || 0}</td>
                    <td className="py-1">{i.paid_at ? new Date(i.paid_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 font-mono text-sm">No invoices found for business_id: {businessId}</p>
        )}
      </div>

      <Link 
        href="/admin/analytics"
        className="inline-block px-4 py-2 bg-cyan-600 text-white rounded-lg font-mono text-sm"
      >
        ← Back to Analytics
      </Link>
    </div>
  )
}
