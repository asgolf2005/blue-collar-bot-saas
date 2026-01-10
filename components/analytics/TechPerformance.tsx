import { createClient } from '@/lib/supabase/server'
import { Users, Star } from 'lucide-react'

interface TechPerformanceProps {
  businessId: string
  rangeStart: string
  rangeEnd: string
  rangeLabel: string
}

export default async function TechPerformance({ businessId, rangeStart, rangeEnd, rangeLabel }: TechPerformanceProps) {
  const supabase = await createClient()

  const startDate = new Date(rangeStart)
  const endDate = new Date(rangeEnd)

  // Get all technicians
  const { data: techs } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('business_id', businessId)
    .eq('role', 'tech')

  if (!techs || techs.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-ink">Technician Performance</h3>
            <p className="text-sm text-muted">Performance metrics by technician</p>
          </div>
          <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center border border-success/20">
            <Users className="w-5 h-5 text-success" />
          </div>
        </div>

        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No technicians found</p>
          <p className="text-sm text-muted mt-1">
            Add technicians to see performance metrics
          </p>
        </div>
      </div>
    )
  }

  // Get jobs for each tech
  interface TechStats {
    id: string
    name: string
    email: string
    totalJobs: number
    completedJobs: number
    completionRate: number
  }

  const techStats: TechStats[] = await Promise.all(
    techs.map(async (tech) => {
      // Get all jobs assigned to this tech
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('business_id', businessId)
        .eq('technician_id', tech.id)
        .gte('scheduled_start', startDate.toISOString())
        .lte('scheduled_start', endDate.toISOString())

      const totalJobs = jobs?.length || 0
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
      const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

      return {
        id: tech.id,
        name: tech.full_name || tech.email,
        email: tech.email,
        totalJobs,
        completedJobs,
        completionRate,
      }
    })
  )

  // Sort by completion rate, then by total jobs
  techStats.sort((a, b) => {
    if (b.completionRate !== a.completionRate) {
      return b.completionRate - a.completionRate
    }
    return b.totalJobs - a.totalJobs
  })

  const maxJobs = Math.max(...techStats.map(t => t.totalJobs), 1)
  const avgCompletionRate = techStats.length > 0
    ? Math.round(techStats.reduce((sum, t) => sum + t.completionRate, 0) / techStats.length)
    : 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink">Technician Performance</h3>
          <p className="text-sm text-muted">{rangeLabel}</p>
        </div>
        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center border border-success/20">
          <Users className="w-5 h-5 text-success" />
        </div>
      </div>

      {/* Tech list */}
      <div className="space-y-4 mb-6">
        {techStats.map((tech, index) => {
          const widthPercent = (tech.totalJobs / maxJobs) * 100

          return (
            <div key={tech.id}>
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-surface-100 rounded-full flex-shrink-0 border border-surface-200">
                    <span className="text-xs font-semibold text-surface-600">
                      {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink truncate">{tech.name}</p>
                    <p className="text-xs text-muted truncate">{tech.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted">{tech.completedJobs}/{tech.totalJobs} jobs</p>
                    <p className="text-xs font-semibold text-ink">{tech.completionRate}% complete</p>
                  </div>
                  {tech.completionRate >= 90 && tech.totalJobs > 0 && (
                    <Star className="w-4 h-4 text-warning fill-warning" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface-100 rounded-full h-2 mb-1">
                <div
                  className="bg-gradient-to-r from-success to-success/70 h-2 rounded-full transition-all"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>

              {/* Completion bar */}
              <div className="w-full bg-surface-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    tech.completionRate >= 90
                      ? 'bg-success'
                      : tech.completionRate >= 70
                      ? 'bg-warning'
                      : 'bg-warning/70'
                  }`}
                  style={{ width: `${tech.completionRate}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-surface-200">
        <div>
          <p className="text-xs text-muted">Total Techs</p>
          <p className="text-lg font-semibold text-ink">{techStats.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Avg Completion</p>
          <p className="text-lg font-semibold text-ink">{avgCompletionRate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted">Total Jobs</p>
          <p className="text-lg font-semibold text-ink">
            {techStats.reduce((sum, t) => sum + t.totalJobs, 0)}
          </p>
        </div>
      </div>

      {/* Top performer */}
      {techStats.length > 0 && techStats[0].totalJobs > 0 && (
        <div className="mt-4 p-3 bg-success/10 rounded-xl border border-success/20">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-success fill-success" />
            <span className="text-sm font-medium text-success">
              Top Performer: {techStats[0].name}
            </span>
          </div>
          <p className="text-xs text-success mt-1 ml-6">
            {techStats[0].completedJobs}/{techStats[0].totalJobs} jobs • {techStats[0].completionRate}% completion rate
          </p>
        </div>
      )}
    </div>
  )
}

