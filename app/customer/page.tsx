import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, addDays } from 'date-fns'
import KeyboardShortcutsCard from '@/components/ui/KeyboardShortcutsCard'
import { Wrench } from '@/components/ui/lucide'

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, business:businesses(id, name, phone, email)')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    // Instead of redirecting to login, show a helpful error message
    return (
      <div className="rounded-2xl bg-surface-50/90 backdrop-blur-xl border border-warning/30 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2">Customer Profile Not Found</h2>
          <p className="text-muted mb-6">
            Your account exists, but you don&apos;t have a customer profile yet.
            Please contact the business to have your account linked to a customer profile.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Logged in as: <span className="text-surface-600">{user.email}</span>
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warning/10 text-warning font-semibold text-sm border border-warning/20 hover:bg-warning/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign Out
            </Link>
          </div>
      </div>
    )
  }

  // Get active jobs
  const { data: activeJobs } = await supabase
    .from('jobs')
    .select(`*, customer:customers(*), technician:users!jobs_technician_id_fkey(*)`)
    .eq('customer_id', customer.id)
    .in('status', ['on_the_way', 'arrived', 'in_progress'])
    .order('scheduled_start', { ascending: true })
    .limit(1)

  const activeJob = activeJobs?.[0]

  // Get upcoming appointments
  const { data: upcomingJobs } = await supabase
    .from('jobs')
    .select('*, customer:customers(*), technician:users!jobs_technician_id_fkey(*)')
    .eq('customer_id', customer.id)
    .gte('scheduled_start', new Date().toISOString())
    .lte('scheduled_start', addDays(new Date(), 30).toISOString())
    .not('status', 'in', '("on_the_way","arrived","in_progress","completed","cancelled")')
    .order('scheduled_start', { ascending: true })
    .limit(3)

  // Get outstanding invoices
  const { data: outstandingInvoices } = await supabase
    .from('invoices')
    .select('*, customer:customers(*)')
    .eq('customer_id', customer.id)
    .in('status', ['sent', 'overdue'])
    .order('issue_date', { ascending: false })
    .limit(3)

  const { data: recentJobs } = await supabase
    .from('jobs')
    .select('id, description, scheduled_start, status, technician:users!jobs_technician_id_fkey(full_name)')
    .eq('customer_id', customer.id)
    .eq('status', 'completed')
    .order('scheduled_start', { ascending: false })
    .limit(3)

  const { count: totalJobCount } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customer.id)

  const totalUpcoming = upcomingJobs?.length || 0
  const totalOutstanding = outstandingInvoices?.length || 0
  const business = customer.business as any
  const lastServiceDate = recentJobs?.[0]?.scheduled_start

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'on_the_way':
        return { text: 'Technician is on the way', color: 'warning', icon: 'navigation' }
      case 'arrived':
        return { text: 'Technician has arrived', color: 'success', icon: 'pin' }
      case 'in_progress':
        return { text: 'Work in progress', color: 'primary', icon: 'wrench' }
      default:
        return { text: 'Active job', color: 'muted', icon: 'clock' }
    }
  }

  return (
    <div>
      {/* Active Job Alert */}
      {activeJob && (
        <Link
          href={`/customer/appointments/${activeJob.id}`}
          className="block mb-6 p-5 rounded-3xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/25 hover:border-blue-500/50 transition-all group shadow-lg shadow-blue-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              {activeJob.status === 'on_the_way' && (
                <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              )}
              {activeJob.status === 'arrived' && (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {activeJob.status === 'in_progress' && (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {getStatusConfig(activeJob.status).text}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {activeJob.description || 'Service appointment'}
              </p>
              {activeJob.technician && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  Tech: <span className="text-blue-600 dark:text-blue-400 font-medium">{activeJob.technician.full_name}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeJob.eta_minutes && activeJob.status === 'on_the_way' && (
                <div className="text-right">
                  <div className="text-xs text-slate-500">ETA</div>
                  <div className="text-lg font-bold text-amber-500">
                    {activeJob.eta_minutes < 60
                      ? `${activeJob.eta_minutes}m`
                      : `${Math.floor(activeJob.eta_minutes / 60)}h`}
                  </div>
                </div>
              )}
              <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </Link>
      )}

      {/* Welcome Header */}
      <div className="mb-6 page-enter">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Welcome back{customer.name ? `, ${customer.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening with your service</p>
          </div>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-3 mb-6 page-enter stagger-1">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Next Visit</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {upcomingJobs?.[0]?.scheduled_start
              ? format(new Date(upcomingJobs[0].scheduled_start), 'MMM d')
              : 'Not scheduled'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {upcomingJobs?.[0]?.scheduled_start
              ? format(new Date(upcomingJobs[0].scheduled_start), 'h:mm a')
              : 'Call to book a visit'}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Service History</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {totalJobCount || 0} jobs
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Last visit {lastServiceDate ? format(new Date(lastServiceDate), 'MMM d, yyyy') : 'N/A'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6 page-enter stagger-2">
        {/* Contact */}
        <a
          href={`tel:${business.phone}`}
          className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Need Help?</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">Call Us</div>
        </a>

        {/* Upcoming */}
        <Link
          href="/customer/appointments"
          className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Upcoming</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{totalUpcoming} Appt{totalUpcoming !== 1 ? 's' : ''}</div>
        </Link>

        {/* Invoices */}
        <Link
          href="/customer/invoices"
          className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all group"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg ${
            totalOutstanding > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25' : 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/25'
          }`}>
            {totalOutstanding > 0 ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{totalOutstanding > 0 ? 'Outstanding' : 'Invoices'}</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {totalOutstanding > 0 ? `${totalOutstanding} Due` : 'All Paid'}
          </div>
        </Link>

        {/* Account */}
        <Link
          href="/customer/profile"
          className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-slate-400/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z" />
            </svg>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Account</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Profile</div>
        </Link>
      </div>

      {/* Keyboard Shortcuts Card */}
      <div className="mb-6 page-enter stagger-2-5">
        <KeyboardShortcutsCard role="customer" defaultExpanded={false} />
      </div>

      {/* Recent Service */}
      <div className="mb-6 page-enter stagger-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recent Service</h2>
          <Link href="/customer/history" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
            View history
          </Link>
        </div>
        {recentJobs && recentJobs.length > 0 ? (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.description || 'Service Completed'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {job.scheduled_start ? format(new Date(job.scheduled_start), 'MMM d, yyyy') : 'Date recorded'}
                    </p>
                    {(job.technician as any)?.full_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tech: {(job.technician as any).full_name}</p>
                    )}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full">
                    Completed
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">No service history yet</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Completed visits will appear here</p>
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="mb-6 page-enter stagger-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upcoming</h2>
          <Link href="/customer/appointments" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
            View all
          </Link>
        </div>

        {upcomingJobs && upcomingJobs.length > 0 ? (
          <div className="space-y-3">
            {upcomingJobs.map((job) => (
              <Link
                key={job.id}
                href={`/customer/appointments/${job.id}`}
                className="block p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[50px] px-3 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                    <div className="text-lg font-bold text-white">
                      {job.scheduled_start ? format(new Date(job.scheduled_start), 'd') : '--'}
                    </div>
                    <div className="text-xs text-blue-100">
                      {job.scheduled_start ? format(new Date(job.scheduled_start), 'MMM') : ''}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {job.description || 'Service Appointment'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {job.scheduled_start ? format(new Date(job.scheduled_start), 'EEEE, h:mm a') : 'Time TBD'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">No upcoming appointments</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Call us to schedule service</p>
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Call to Schedule
              </a>
            )}
          </div>
        )}
      </div>

      {/* Outstanding Invoices */}
      {outstandingInvoices && outstandingInvoices.length > 0 && (
        <div className="page-enter stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outstanding Invoices</h2>
            <Link href="/customer/invoices" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {outstandingInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/customer/invoices/${invoice.id}`}
                className="block p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-elevation-1 border border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Due {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'on receipt'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {parseFloat(invoice.total.toString()).toFixed(2)}
                      </div>
                      <div className={`text-xs font-bold ${
                        invoice.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {invoice.status === 'overdue' ? 'Overdue' : 'Due'}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


