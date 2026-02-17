import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  CheckCircle2,
  Calendar,
  User,
  Target,
  TrendingUp,
  Award,
} from '@/components/ui/lucide'
import { getDateRange, formatDisplayDate } from '@/lib/analytics/dateUtils'

interface JobWithDetails {
  id: string
  status: string
  total_cost: number | null
  created_at: string
  scheduled_start: string | null
  completed_at: string | null
  customer_name: string
  technician_name: string
  service_name: string
  description: string | null
}

function isWithinRange(value: string | null | undefined, start: Date, end: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= start && date <= end
}

export default async function CompletionDetailPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined }
}) {
  const params = searchParams ? await Promise.resolve(searchParams) : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.business_id) {
    redirect('/login')
  }

  const businessId = profile.business_id
  const rawRange = Array.isArray(params?.range) ? params?.range[0] : params?.range
  const validRanges = new Set(['7d', '30d', '90d', 'ytd'])
  const range = validRanges.has(rawRange || '') ? (rawRange as '7d' | '30d' | '90d' | 'ytd') : '30d'
  const dateRange = getDateRange(range as any)

  // Fetch all business data, then apply range filter in memory
  const { data: jobsData = [] } = await supabase
    .from('jobs')
    .select('*')
    .eq('business_id', businessId)

  const { data: customersData = [] } = await supabase
    .from('customers')
    .select('id, name')
    .eq('business_id', businessId)

  const { data: usersData = [] } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('business_id', businessId)

  const { data: servicesData = [] } = await supabase
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)

  const jobIds = (jobsData || []).map(job => job.id)
  const { data: jobServicesData = [] } = jobIds.length
    ? await supabase
        .from('job_services')
        .select('job_id, service_id')
        .in('job_id', jobIds)
    : { data: [] as Array<{ job_id: string; service_id: string }> }

  // Build lookup maps
  const customerMap = new Map((customersData || []).map(c => [c.id, c.name]))
  const userMap = new Map((usersData || []).map(u => [u.id, u.full_name]))
  const serviceMap = new Map((servicesData || []).map(s => [s.id, s.name]))
  const jobServiceNames = new Map<string, string[]>()

  ;(jobServicesData || []).forEach(row => {
    const serviceName = row.service_id ? serviceMap.get(row.service_id) : null
    if (!serviceName) return
    const existing = jobServiceNames.get(row.job_id) || []
    existing.push(serviceName)
    jobServiceNames.set(row.job_id, existing)
  })

  // Transform jobs
  const allJobs: JobWithDetails[] = (jobsData || []).map((j: any) => ({
    id: j.id,
    status: j.status,
    total_cost: j.total_cost,
    created_at: j.created_at,
    scheduled_start: j.scheduled_start,
    completed_at: j.status === 'completed' ? (j.scheduled_end || j.updated_at || j.created_at) : null,
    customer_name: customerMap.get(j.customer_id) || 'Unknown',
    technician_name: j.technician_id ? userMap.get(j.technician_id) || 'Unknown' : 'Unassigned',
    service_name: (jobServiceNames.get(j.id) || [])[0] || 'General Service',
    description: j.description
  }))

  const filteredJobs = allJobs.filter(job =>
    isWithinRange(job.scheduled_start || job.created_at, dateRange.start, dateRange.end)
  )
  
  const totalJobs = filteredJobs.length
  const completedJobs = filteredJobs.filter(j => j.status === 'completed')
  const completionRate = totalJobs > 0 ? Math.round((completedJobs.length / totalJobs) * 100) : 0

  // Calculate completion by technician
  const techStats = new Map<string, { 
    name: string; 
    id: string;
    completed: number; 
    total: number; 
    revenue: number;
  }>()
  
  filteredJobs.forEach(job => {
    const techId = job.technician_name.replace(/\s+/g, '-').toLowerCase()
    const techName = job.technician_name
    
    if (!techStats.has(techId)) {
      techStats.set(techId, { name: techName, id: techId, completed: 0, total: 0, revenue: 0 })
    }
    
    const tech = techStats.get(techId)!
    tech.total++
    
    if (job.status === 'completed') {
      tech.completed++
      tech.revenue += job.total_cost || 0
    }
  })

  const technicianBreakdown = Array.from(techStats.values())
    .sort((a, b) => b.completed - a.completed)

  // Recent completed jobs
  const recentCompleted = filteredJobs
    .filter(j => j.status === 'completed')
    .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())
    .slice(0, 5)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href={`/admin/analytics?range=${range}`}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-mono text-xs">Back to Analytics</span>
            </Link>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-white tracking-wide">
            COMPLETION RATE
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-400/10 rounded-xl px-6 py-4 border border-blue-200 dark:border-blue-400/20">
            <p className="font-mono text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">Completion</p>
            <p className="font-display text-3xl text-blue-600 dark:text-blue-400">{completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-400/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Completed</p>
              <p className="font-display text-2xl text-slate-900 dark:text-white">{completedJobs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-400/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Total</p>
              <p className="font-display text-2xl text-slate-900 dark:text-white">{totalJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase">Rate</p>
              <p className="font-display text-2xl text-slate-900 dark:text-white">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Technician */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">By Technician</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Completion rate by team member</p>
            </div>
          </div>

          <div className="space-y-4">
            {technicianBreakdown.length === 0 ? (
              <p className="font-mono text-sm text-slate-500 text-center py-8">No technician data</p>
            ) : (
              technicianBreakdown.map((tech) => {
                const rate = tech.total > 0 ? Math.round((tech.completed / tech.total) * 100) : 0
                const maxCompleted = Math.max(...technicianBreakdown.map(t => t.completed), 1)
                const barWidth = (tech.completed / maxCompleted) * 100
                
                return (
                  <div key={tech.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-mono text-xs font-bold">
                          {tech.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{tech.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                          {tech.completed}/{tech.total}
                        </span>
                        <span className="font-mono text-xs text-slate-500 ml-2">({rate}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500 w-16 text-right">
                        {formatCurrency(tech.revenue)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Completed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-400/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display text-xl text-slate-900 dark:text-white">Recently Completed</h2>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Last 5 finished jobs</p>
              </div>
            </div>
            <Link 
              href="/admin/jobs?status=completed"
              className="font-mono text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
            >
              View All â†’
            </Link>
          </div>

          <div className="space-y-3">
            {recentCompleted.length === 0 ? (
              <p className="font-mono text-sm text-slate-500 text-center py-8">No completed jobs</p>
            ) : (
              recentCompleted.map((job, index) => (
                <Link 
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="block p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-mono text-sm text-slate-900 dark:text-white">
                          {job.customer_name}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {job.service_name}
                        </p>
                        <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          {formatCurrency(job.total_cost || 0)}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      {job.completed_at 
                        ? new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'No date'
                      }
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


