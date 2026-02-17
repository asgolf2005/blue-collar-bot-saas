import { createClient } from '@/lib/supabase/server'
import { Users, Star, Trophy } from '@/components/ui/lucide'

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
      <div className="relative bg-[#0d1220] border border-emerald-500/30 rounded-xl overflow-hidden group hover:border-emerald-500/50 transition-all duration-500">
        {/* Blueprint grid background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500/50 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500/50 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500/50 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500/50 rounded-br-lg" />

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                TECHNICIAN PERFORMANCE
              </h3>
              <p className="text-sm text-emerald-500/60 font-mono mt-1">
                PERFORMANCE METRICS BY TECHNICIAN
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="text-center py-12">
            <Users className="w-12 h-12 text-emerald-500/30 mx-auto mb-3" />
            <p className="text-white/50 font-mono">NO TECHNICIANS FOUND</p>
            <p className="text-sm text-emerald-500/40 font-mono mt-1">
              ADD TECHNICIANS TO SEE PERFORMANCE METRICS
            </p>
          </div>
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

  // Get completion rate color
  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return { bg: 'from-emerald-500 to-emerald-400', glow: 'rgba(16,185,129,0.5)', text: 'text-emerald-400' }
    if (rate >= 70) return { bg: 'from-amber-500 to-amber-400', glow: 'rgba(245,158,11,0.5)', text: 'text-amber-400' }
    return { bg: 'from-rose-500 to-rose-400', glow: 'rgba(244,63,94,0.5)', text: 'text-rose-400' }
  }

  return (
    <div className="relative bg-[#0d1220] border border-emerald-500/30 rounded-xl overflow-hidden group hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500/50 rounded-br-lg" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              TECHNICIAN PERFORMANCE
            </h3>
            <p className="text-sm text-emerald-500/60 font-mono mt-1">
              {rangeLabel.toUpperCase()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Tech list */}
        <div className="space-y-4 mb-6">
          {techStats.map((tech, index) => {
            const widthPercent = (tech.totalJobs / maxJobs) * 100
            const color = getCompletionColor(tech.completionRate)
            const isTopPerformer = index === 0 && tech.totalJobs > 0

            return (
              <div key={tech.id} className={`p-3 rounded-lg ${isTopPerformer ? 'bg-emerald-500/5 border border-emerald-500/20' : ''}`}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 border font-bold text-xs font-mono"
                      style={{ 
                        background: color.glow.replace('0.5', '0.1'),
                        borderColor: color.glow.replace('0.5', '0.3'),
                        color: color.text.replace('text-', ''),
                        boxShadow: `0 0 8px ${color.glow}`,
                      }}
                    >
                      {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate flex items-center gap-2">
                        {tech.name}
                        {isTopPerformer && (
                          <Trophy className="w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' }} />
                        )}
                      </p>
                      <p className="text-xs text-white/40 font-mono truncate">{tech.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-white/40 font-mono">{tech.completedJobs}/{tech.totalJobs} jobs</p>
                      <p className="text-xs font-semibold font-mono" style={{ color: color.text.replace('text-', '') }}>
                        {tech.completionRate}% complete
                      </p>
                    </div>
                    {tech.completionRate >= 90 && tech.totalJobs > 0 && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' }} />
                    )}
                  </div>
                </div>

                {/* Job count bar */}
                <div className="w-full bg-black/50 rounded-full h-2 mb-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all relative"
                    style={{ 
                      width: `${widthPercent}%`,
                      background: `linear-gradient(90deg, ${color.glow.replace('0.5', '0.8')}, ${color.glow.replace('0.5', '0.4')})`,
                      boxShadow: `0 0 10px ${color.glow}`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>

                {/* Completion bar */}
                <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${tech.completionRate}%`,
                      background: color.glow.replace('0.5', '0.8'),
                      boxShadow: `0 0 6px ${color.glow}`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-500/20">
          <div className="text-center">
            <p className="text-xs text-emerald-500/60 font-mono uppercase tracking-wider mb-1">Total Techs</p>
            <p className="text-xl font-bold text-white font-mono">{techStats.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-emerald-500/60 font-mono uppercase tracking-wider mb-1">Avg Completion</p>
            <p className="text-xl font-bold text-white font-mono">{avgCompletionRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-emerald-500/60 font-mono uppercase tracking-wider mb-1">Total Jobs</p>
            <p className="text-xl font-bold text-white font-mono">
              {techStats.reduce((sum, t) => sum + t.totalJobs, 0)}
            </p>
          </div>
        </div>

        {/* Top performer */}
        {techStats.length > 0 && techStats[0].totalJobs > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' }} />
              <span className="text-sm font-medium text-white">
                TOP PERFORMER: <span className="text-amber-400">{techStats[0].name}</span>
              </span>
            </div>
            <p className="text-xs text-white/40 mt-1 ml-6 font-mono">
              {techStats[0].completedJobs}/{techStats[0].totalJobs} JOBS â€¢ {techStats[0].completionRate}% COMPLETION RATE
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


