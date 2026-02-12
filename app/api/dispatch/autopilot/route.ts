import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Mode = 'preview' | 'apply'
type JobUrgency = 'low' | 'medium' | 'high' | null

interface Technician {
  id: string
  full_name: string | null
}

interface JobRecord {
  id: string
  customer_id: string | null
  technician_id: string | null
  status: string
  scheduled_start: string | null
  scheduled_end: string | null
  urgency: JobUrgency
}

interface Recommendation {
  jobId: string
  customerName: string
  scheduledStart: string | null
  currentStatus: string
  suggestedTechnicianId: string
  suggestedTechnicianName: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
}

const ACTIVE_STATUSES = new Set(['scheduled', 'on_the_way', 'arrived', 'in_progress'])

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

function parseWindow(job: JobRecord): { start: Date; end: Date } | null {
  if (!job.scheduled_start) return null
  const start = new Date(job.scheduled_start)
  if (Number.isNaN(start.getTime())) return null
  const end = job.scheduled_end ? new Date(job.scheduled_end) : addMinutes(start, 120)
  if (Number.isNaN(end.getTime()) || end <= start) {
    return { start, end: addMinutes(start, 120) }
  }
  return { start, end }
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

function confidenceFrom(score: number, deltaToSecond: number): 'high' | 'medium' | 'low' {
  if (score >= 115 || deltaToSecond >= 16) return 'high'
  if (score >= 100 || deltaToSecond >= 8) return 'medium'
  return 'low'
}

function urgencyBoost(urgency: JobUrgency, dayLoad: number) {
  if (urgency === 'high') return Math.max(0, 22 - dayLoad * 5)
  if (urgency === 'medium') return Math.max(0, 12 - dayLoad * 3)
  return Math.max(0, 4 - dayLoad * 1.5)
}

function startOfDayMs(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function toDateLabel(value: string | null) {
  if (!value) return 'unscheduled time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unscheduled time'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { mode?: Mode; horizonDays?: number }
    const mode: Mode = body.mode === 'apply' ? 'apply' : 'preview'
    const horizonDays = Math.max(1, Math.min(30, Number(body.horizonDays) || 14))

    const { data: profile } = await supabase
      .from('users')
      .select('id, role, business_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const horizonEnd = addMinutes(now, horizonDays * 24 * 60)
    const historicalStart = addMinutes(now, -120 * 24 * 60)

    const [techRes, upcomingRes, completedRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name')
        .eq('business_id', profile.business_id)
        .eq('role', 'tech')
        .order('full_name', { ascending: true }),
      supabase
        .from('jobs')
        .select('id, customer_id, technician_id, status, scheduled_start, scheduled_end, urgency')
        .eq('business_id', profile.business_id)
        .gte('scheduled_start', now.toISOString())
        .lte('scheduled_start', horizonEnd.toISOString())
        .order('scheduled_start', { ascending: true }),
      supabase
        .from('jobs')
        .select('id, customer_id, technician_id, scheduled_start')
        .eq('business_id', profile.business_id)
        .eq('status', 'completed')
        .gte('scheduled_start', historicalStart.toISOString())
        .not('technician_id', 'is', null),
    ])

    if (techRes.error) throw techRes.error
    if (upcomingRes.error) throw upcomingRes.error
    if (completedRes.error) throw completedRes.error

    const technicians = (techRes.data || []) as Technician[]
    const upcomingJobs = (upcomingRes.data || []) as JobRecord[]
    const completedJobs = (completedRes.data || []) as Array<{
      id: string
      customer_id: string | null
      technician_id: string | null
      scheduled_start: string | null
    }>

    if (technicians.length === 0) {
      return NextResponse.json({
        summary: {
          mode,
          horizonDays,
          unassignedJobs: 0,
          recommendations: 0,
          message: 'No technicians available',
        },
        recommendations: [] as Recommendation[],
      })
    }

    const candidateJobs = upcomingJobs.filter((job) => !job.technician_id && ACTIVE_STATUSES.has(job.status))

    if (candidateJobs.length === 0) {
      return NextResponse.json({
        summary: {
          mode,
          horizonDays,
          unassignedJobs: 0,
          recommendations: 0,
          message: 'No unassigned upcoming jobs in range',
        },
        recommendations: [] as Recommendation[],
      })
    }

    const allJobIds = [
      ...new Set([...upcomingJobs.map((j) => j.id), ...completedJobs.map((j) => j.id)]),
    ]
    const allCustomerIds = [...new Set(candidateJobs.map((j) => j.customer_id).filter(Boolean))] as string[]

    const [servicesRes, customersRes] = await Promise.all([
      allJobIds.length
        ? supabase.from('job_services').select('job_id, service_id').in('job_id', allJobIds)
        : Promise.resolve({ data: [], error: null } as any),
      allCustomerIds.length
        ? supabase.from('customers').select('id, name').in('id', allCustomerIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])

    if (servicesRes.error) throw servicesRes.error
    if (customersRes.error) throw customersRes.error

    const serviceRows = (servicesRes.data || []) as Array<{ job_id: string; service_id: string }>
    const customerRows = (customersRes.data || []) as Array<{ id: string; name: string }>

    const servicesByJob = new Map<string, Set<string>>()
    for (const row of serviceRows) {
      const current = servicesByJob.get(row.job_id) || new Set<string>()
      current.add(row.service_id)
      servicesByJob.set(row.job_id, current)
    }

    const customerNameById = new Map(customerRows.map((c) => [c.id, c.name]))

    const activeJobsByTech = new Map<string, JobRecord[]>()
    for (const tech of technicians) {
      activeJobsByTech.set(tech.id, [])
    }
    for (const job of upcomingJobs) {
      if (!job.technician_id || !ACTIVE_STATUSES.has(job.status)) continue
      if (!activeJobsByTech.has(job.technician_id)) activeJobsByTech.set(job.technician_id, [])
      activeJobsByTech.get(job.technician_id)!.push(job)
    }

    const techServiceScore = new Map<string, Map<string, number>>()
    const techCustomerHistory = new Map<string, Map<string, number>>()
    for (const row of completedJobs) {
      if (!row.technician_id) continue

      if (!techCustomerHistory.has(row.technician_id)) {
        techCustomerHistory.set(row.technician_id, new Map())
      }
      if (row.customer_id) {
        const customerMap = techCustomerHistory.get(row.technician_id)!
        customerMap.set(row.customer_id, (customerMap.get(row.customer_id) || 0) + 1)
      }

      const serviceIds = servicesByJob.get(row.id)
      if (!serviceIds || serviceIds.size === 0) continue
      if (!techServiceScore.has(row.technician_id)) {
        techServiceScore.set(row.technician_id, new Map())
      }
      const serviceMap = techServiceScore.get(row.technician_id)!
      for (const serviceId of serviceIds) {
        serviceMap.set(serviceId, (serviceMap.get(serviceId) || 0) + 1)
      }
    }

    const recommendations: Recommendation[] = []

    for (const job of candidateJobs) {
      const window = parseWindow(job)
      if (!window) continue
      const dayMs = startOfDayMs(window.start)
      const candidateServiceIds = servicesByJob.get(job.id) || new Set<string>()

      let best:
        | {
            tech: Technician
            score: number
            reasons: string[]
          }
        | null = null
      let secondScore = -Infinity

      for (const tech of technicians) {
        const techJobs = activeJobsByTech.get(tech.id) || []
        let hasConflict = false
        let sameDayLoad = 0
        let nearestGapMin = Number.POSITIVE_INFINITY

        for (const techJob of techJobs) {
          const techWindow = parseWindow(techJob)
          if (!techWindow) continue
          if (startOfDayMs(techWindow.start) === dayMs) {
            sameDayLoad += 1
          }
          if (overlaps(window.start, window.end, techWindow.start, techWindow.end)) {
            hasConflict = true
            break
          }
          const gap = Math.min(
            Math.abs((window.start.getTime() - techWindow.end.getTime()) / 60000),
            Math.abs((techWindow.start.getTime() - window.end.getTime()) / 60000)
          )
          nearestGapMin = Math.min(nearestGapMin, gap)
        }

        if (hasConflict) continue

        const totalWindowLoad = techJobs.length
        const serviceHistoryMap = techServiceScore.get(tech.id)
        const customerHistoryMap = techCustomerHistory.get(tech.id)

        let serviceMatchScoreRaw = 0
        for (const serviceId of candidateServiceIds) {
          serviceMatchScoreRaw += serviceHistoryMap?.get(serviceId) || 0
        }
        const serviceFitBoost = Math.min(28, serviceMatchScoreRaw * 2.5)
        const customerHistoryBoost = Math.min(14, ((job.customer_id && customerHistoryMap?.get(job.customer_id)) || 0) * 4)
        const routeContinuityBoost =
          nearestGapMin <= 120 ? 10 : nearestGapMin <= 240 ? 5 : 0
        const workloadPenalty = sameDayLoad * 9 + totalWindowLoad * 1.5
        const score =
          100 -
          workloadPenalty +
          serviceFitBoost +
          customerHistoryBoost +
          routeContinuityBoost +
          urgencyBoost(job.urgency, sameDayLoad)

        const reasons: string[] = []
        if (serviceFitBoost > 0) reasons.push('strong service fit')
        if (customerHistoryBoost > 0) reasons.push('worked with this customer before')
        if (sameDayLoad <= 1) reasons.push('lighter same-day workload')
        if (routeContinuityBoost > 0) reasons.push('good route continuity')
        if (reasons.length === 0) reasons.push('best available slot with no conflict')

        if (!best || score > best.score) {
          secondScore = best ? best.score : secondScore
          best = { tech, score, reasons }
        } else if (score > secondScore) {
          secondScore = score
        }
      }

      if (!best) continue

      recommendations.push({
        jobId: job.id,
        customerName: (job.customer_id && customerNameById.get(job.customer_id)) || 'Unknown customer',
        scheduledStart: job.scheduled_start,
        currentStatus: job.status,
        suggestedTechnicianId: best.tech.id,
        suggestedTechnicianName: best.tech.full_name || 'Technician',
        score: Math.round(best.score),
        confidence: confidenceFrom(best.score, best.score - secondScore),
        reasons: best.reasons,
      })

      if (mode === 'apply') {
        const staged = activeJobsByTech.get(best.tech.id) || []
        staged.push({
          ...job,
          technician_id: best.tech.id,
        })
        activeJobsByTech.set(best.tech.id, staged)
      }
    }

    let appliedCount = 0
    let skippedCount = 0

    if (mode === 'apply' && recommendations.length > 0) {
      for (const rec of recommendations) {
        const { data, error } = await supabase
          .from('jobs')
          .update({ technician_id: rec.suggestedTechnicianId })
          .eq('id', rec.jobId)
          .eq('business_id', profile.business_id)
          .is('technician_id', null)
          .select('id')

        if (error) {
          skippedCount += 1
          continue
        }

        if ((data || []).length > 0) {
          appliedCount += 1
        } else {
          skippedCount += 1
        }
      }

      if (appliedCount > 0) {
        const assigned = recommendations.slice(0, appliedCount)
        const notifications = assigned.map((rec) => ({
          user_id: rec.suggestedTechnicianId,
          type: 'job_assigned' as const,
          title: 'New job auto-assigned',
          message: `Dispatch autopilot assigned ${rec.customerName} on ${toDateLabel(rec.scheduledStart)}.`,
          link: `/tech/jobs/${rec.jobId}`,
        }))
        await supabase.from('notifications').insert(notifications)
      }
    }

    return NextResponse.json({
      summary: {
        mode,
        horizonDays,
        unassignedJobs: candidateJobs.length,
        recommendations: recommendations.length,
        appliedCount,
        skippedCount,
      },
      recommendations,
    })
  } catch (error: any) {
    console.error('Dispatch autopilot error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run dispatch autopilot' },
      { status: 500 }
    )
  }
}
