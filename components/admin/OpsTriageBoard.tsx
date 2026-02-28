'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, Navigation, Check, Loader2 } from 'lucide-react'
import { startOfDay, endOfDay, format, isSameDay, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'
import { showToast } from '@/lib/utils/toast'

interface RosterTech {
    id: string
    full_name: string | null
    is_working: boolean
}

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

interface RiskUpdate {
    id: string
    level: RiskLevel
    title: string
    message: string
    time?: string
    timestamp?: number
}

const ROSTER_CACHE_TTL_MS = 60_000
const rosterCache = new Map<string, { cachedAt: number; technicians: RosterTech[] }>()
const rosterInflight = new Map<string, Promise<RosterTech[]>>()

const RISK_ORDER: Record<RiskLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

const RISK_ICON_COLOR: Record<RiskLevel, string> = {
    critical: 'text-rose-600 dark:text-rose-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-slate-500 dark:text-slate-400',
}

export function OpsTriageBoard({ selectedDate }: { selectedDate: Date }) {
    const { jobs } = useRealtimeJobsContext()
    const [nowMs, setNowMs] = useState(0)
    const isViewingToday = useMemo(() => nowMs > 0 && isSameDay(selectedDate, new Date(nowMs)), [selectedDate, nowMs])
    const start = startOfDay(selectedDate).getTime()
    const end = endOfDay(selectedDate).getTime()
    const workDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate])

    const [triageCollapsed, setTriageCollapsed] = useState(false)
    const [fleetCollapsed, setFleetCollapsed] = useState(false)
    const [techRoster, setTechRoster] = useState<RosterTech[]>([])
    const [rosterLoading, setRosterLoading] = useState(false)
    const [updatingTechIds, setUpdatingTechIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        const refreshNow = () => setNowMs(Date.now())
        refreshNow()
        const timer = window.setInterval(refreshNow, 60_000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        let active = true
        setRosterLoading(true)

        const loadRoster = async () => {
            const cached = rosterCache.get(workDateKey)
            if (cached && Date.now() - cached.cachedAt < ROSTER_CACHE_TTL_MS) {
                if (active) {
                    setTechRoster(cached.technicians)
                    setRosterLoading(false)
                }
                return
            }

            try {
                const request =
                    rosterInflight.get(workDateKey) ??
                    fetch(`/api/admin/technicians/working-status?date=${workDateKey}`, {
                        cache: 'no-store',
                    })
                        .then(async (response) => {
                            const payload = await response.json().catch(() => ({}))
                            if (!response.ok) {
                                throw new Error(payload?.error || 'Failed to load roster')
                            }
                            return Array.isArray(payload.technicians) ? payload.technicians : []
                        })
                        .finally(() => {
                            rosterInflight.delete(workDateKey)
                        })
                rosterInflight.set(workDateKey, request)
                const technicians = await request

                if (active) {
                    setTechRoster(technicians)
                    rosterCache.set(workDateKey, {
                        cachedAt: Date.now(),
                        technicians,
                    })
                }
            } catch (error) {
                if (active) {
                    showToast.error(error instanceof Error ? error.message : 'Failed to load roster')
                    setTechRoster([])
                }
            } finally {
                if (active) setRosterLoading(false)
            }
        }

        void loadRoster()
        return () => {
            active = false
        }
    }, [workDateKey])

    const dayJobs = useMemo(() => {
        return jobs.filter((job) => {
            if (!job.scheduled_start) return false

            const scheduledMs = new Date(job.scheduled_start).getTime()
            return Number.isFinite(scheduledMs) && scheduledMs >= start && scheduledMs <= end
        })
    }, [jobs, start, end])

    const fleetMap = useMemo(() => {
        const techs = new Map<string, {
            id: string
            name: string
            isWorking: boolean
            status: 'idle' | 'en_route' | 'on_site' | 'assigned' | 'off_duty'
            jobId?: string
            clientName?: string
        }>()

        for (const tech of techRoster) {
            techs.set(tech.id, {
                id: tech.id,
                name: tech.full_name || 'Technician',
                isWorking: tech.is_working,
                status: tech.is_working ? 'idle' : 'off_duty',
            })
        }

        dayJobs.forEach(job => {
            const techId = job.technician_id
            if (!techId) return
            const techName = job.technician?.full_name || 'Technician'

            const fallback = {
                id: techId,
                name: techName,
                isWorking: true,
                status: 'idle' as const,
            }

            const currentTech = techs.get(techId) || fallback
            if (!techs.has(techId)) {
                techs.set(techId, currentTech)
            }

            if (!currentTech.isWorking) {
                techs.set(techId, { ...currentTech, status: 'off_duty', clientName: undefined, jobId: undefined })
                return
            }

            if (isViewingToday) {
                if (job.status === 'in_progress' || job.status === 'arrived') {
                    techs.set(techId, { ...currentTech, status: 'on_site', jobId: job.id, clientName: job.customer?.name || 'Client' })
                } else if (job.status === 'on_the_way' && currentTech?.status !== 'on_site') {
                    techs.set(techId, { ...currentTech, status: 'en_route', jobId: job.id, clientName: job.customer?.name || 'Client' })
                }
            } else {
                if (currentTech.status === 'idle') {
                    techs.set(techId, { ...currentTech, status: 'assigned' })
                }
            }
        })

        const order: Record<string, number> = {
            on_site: 0,
            en_route: 1,
            assigned: 2,
            idle: 3,
            off_duty: 4,
        }

        return Array.from(techs.values()).sort((a, b) => {
            if (a.isWorking !== b.isWorking) return a.isWorking ? -1 : 1
            if (a.status !== b.status) return order[a.status] - order[b.status]
            return a.name.localeCompare(b.name)
        })
    }, [dayJobs, isViewingToday, techRoster])

    const riskUpdates = useMemo(() => {
        const list: RiskUpdate[] = []
        const openJobCountByTech = new Map<string, number>()

        dayJobs.forEach((job) => {
            if (!job.technician_id) return
            if (job.status === 'completed' || job.status === 'cancelled') return
            openJobCountByTech.set(job.technician_id, (openJobCountByTech.get(job.technician_id) || 0) + 1)
        })

        techRoster.forEach((tech) => {
            const openCount = openJobCountByTech.get(tech.id) || 0
            if (!tech.is_working && openCount > 0) {
                list.push({
                    id: `off-duty-assigned-${tech.id}`,
                    level: 'high',
                    title: 'Off-duty technician has assigned jobs',
                    message: `${tech.full_name || 'Technician'} has ${openCount} open job${openCount === 1 ? '' : 's'} today.`,
                })
            } else if (tech.is_working && openCount === 0) {
                list.push({
                    id: `working-no-jobs-${tech.id}`,
                    level: 'low',
                    title: 'Working technician has no assignments',
                    message: `${tech.full_name || 'Technician'} is marked working but has no scheduled jobs.`,
                })
            }
        })

        dayJobs.forEach((job) => {
            if (!job.scheduled_start) return

            const status = (job.status || 'scheduled').toLowerCase()
            const clientName = job.customer?.name || 'Client'
            const techName = job.technician?.full_name || 'Unassigned'
            const startMs = new Date(job.scheduled_start).getTime()
            const endMs = job.scheduled_end ? new Date(job.scheduled_end).getTime() : NaN
            const timeStr = format(new Date(job.scheduled_start), 'h:mm a')
            const isOpen = status !== 'completed' && status !== 'cancelled'

            if (!isOpen) return

            if (!job.technician_id) {
                const startsInMs = startMs - nowMs
                if (isViewingToday && nowMs > 0 && startsInMs <= 30 * 60 * 1000) {
                    list.push({
                        id: `unassigned-soon-${job.id}`,
                        level: startsInMs < 0 ? 'critical' : 'high',
                        title: startsInMs < 0 ? 'Unassigned job is past start time' : 'Unassigned job starts soon',
                        message: `${clientName} has no technician assigned.`,
                        time: timeStr,
                        timestamp: nowMs,
                    })
                } else if (!isViewingToday) {
                    list.push({
                        id: `unassigned-upcoming-${job.id}`,
                        level: 'medium',
                        title: 'Unassigned scheduled job',
                        message: `${clientName} is still unassigned for selected day.`,
                        time: timeStr,
                        timestamp: nowMs,
                    })
                }
            }

            if (isViewingToday && nowMs > 0 && status === 'scheduled' && startMs < nowMs - 15 * 60 * 1000) {
                const delayMin = Math.floor((nowMs - startMs) / (60 * 1000))
                list.push({
                    id: `delayed-start-${job.id}`,
                    level: delayMin >= 60 ? 'critical' : 'high',
                    title: 'Potential delayed start',
                    message: `${clientName} (${techName}) is ${delayMin}m behind schedule.`,
                    time: timeStr,
                    timestamp: nowMs,
                })
            }

            if (isViewingToday && nowMs > 0 && ['on_the_way', 'arrived', 'in_progress'].includes(status)) {
                const updatedAtRaw = (job as { updated_at?: string | null }).updated_at
                const updatedMs = updatedAtRaw ? new Date(updatedAtRaw).getTime() : NaN
                const anchorMs = Number.isFinite(updatedMs) ? updatedMs : startMs
                const elapsedMin = Math.floor((nowMs - anchorMs) / (60 * 1000))

                if (Number.isFinite(endMs) && endMs < nowMs - 15 * 60 * 1000) {
                    const overrunMin = Math.floor((nowMs - endMs) / (60 * 1000))
                    list.push({
                        id: `overrun-${job.id}`,
                        level: overrunMin >= 60 ? 'critical' : 'high',
                        title: 'Job running over planned window',
                        message: `${clientName} is ${overrunMin}m past scheduled end.`,
                        time: timeStr,
                        timestamp: nowMs,
                    })
                } else if (elapsedMin >= 150) {
                    list.push({
                        id: `long-active-${job.id}`,
                        level: 'medium',
                        title: 'Long-running active job',
                        message: `${clientName} has been active for ${elapsedMin}m (${techName}).`,
                        time: timeStr,
                        timestamp: nowMs,
                    })
                }
            }
        })

        return list
            .sort((a, b) => {
                if (a.level !== b.level) return RISK_ORDER[a.level] - RISK_ORDER[b.level]
                return (a.time || '').localeCompare(b.time || '')
            })
            .slice(0, 12)
    }, [dayJobs, isViewingToday, nowMs, techRoster])

    const riskCounts = useMemo(() => {
        return riskUpdates.reduce(
            (acc, update) => {
                acc[update.level] += 1
                return acc
            },
            { critical: 0, high: 0, medium: 0, low: 0 }
        )
    }, [riskUpdates])

    const hasMajorRisks = riskCounts.critical + riskCounts.high > 0
    const triageContentClass = useMemo(() => {
        if (riskUpdates.length <= 2) return 'max-h-none overflow-visible'
        if (riskUpdates.length <= 5) return 'max-h-[320px] overflow-y-auto'
        return 'max-h-[380px] overflow-y-auto'
    }, [riskUpdates.length])

    const toggleWorking = async (techId: string, nextWorking: boolean) => {
        setUpdatingTechIds(prev => {
            const next = new Set(prev)
            next.add(techId)
            return next
        })

        const previous = techRoster
        setTechRoster(prev => prev.map(tech => tech.id === techId ? { ...tech, is_working: nextWorking } : tech))

        try {
            const response = await fetch('/api/admin/technicians/working-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: workDateKey,
                    technicianId: techId,
                    isWorking: nextWorking,
                }),
            })
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to update technician status')
            }
        } catch (error) {
            setTechRoster(previous)
            showToast.error(error instanceof Error ? error.message : 'Failed to update technician status')
        } finally {
            setUpdatingTechIds(prev => {
                const next = new Set(prev)
                next.delete(techId)
                return next
            })
        }
    }

    // Format relative time
    const formatRelativeTime = (timestamp?: number) => {
        if (!timestamp) return null
        try {
            return formatDistanceToNow(timestamp, { addSuffix: true })
        } catch {
            return null
        }
    }

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Recent Updates */}
            <div className="admin-card overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
                {/* Header - Fixed h-10 height */}
                <button
                    type="button"
                    onClick={() => setTriageCollapsed(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 h-10 border-b border-slate-200/50 dark:border-white/5 hover:bg-white/20 dark:hover:bg-white/5 transition-colors shrink-0"
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("w-4 h-4", RISK_ICON_COLOR.high)} />
                        <span className="section-title">Recent Updates</span>
                    </div>
                    <span className="metric-label">
                        {triageCollapsed ? 'EXPAND' : 'COLLAPSE'}
                    </span>
                </button>

                <div className={cn(
                    "no-scrollbar px-4 pb-4 transition-opacity duration-300",
                    triageContentClass,
                    triageCollapsed ? "opacity-0 pointer-events-none delay-0 h-0 overflow-hidden" : "opacity-100 delay-200"
                )}>
                    {riskUpdates.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 mt-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-mono text-[10px] uppercase font-bold tracking-widest">No major delays detected</span>
                        </div>
                    ) : (
                        <div className="space-y-2 mt-3">
                            {/* Risk Count Chips */}
                            <div className="flex flex-wrap gap-1.5">
                                {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
                                    const count = riskCounts[level]
                                    if (count <= 0) return null
                                    if (!hasMajorRisks && (level === 'critical' || level === 'high')) return null
                                    return (
                                        <span
                                            key={level}
                                            className={cn(
                                                'inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider dark:border-slate-700 dark:bg-slate-900/70',
                                                RISK_ICON_COLOR[level]
                                            )}
                                        >
                                            {level.charAt(0).toUpperCase() + level.slice(1)} {count}
                                        </span>
                                    )
                                })}
                            </div>

                            {/* Risk Items - Neutral cards with icon-only color */}
                            {riskUpdates.map((update, index) => (
                                <div
                                    key={update.id}
                                    className={cn(
                                        "flex items-start gap-3 px-3 py-2.5 bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5",
                                        index !== riskUpdates.length - 1 && "border-b border-slate-100 dark:border-slate-700/50"
                                    )}
                                >
                                    <div className={cn('mt-0.5 shrink-0', RISK_ICON_COLOR[update.level])}>
                                        {update.level === 'critical' || update.level === 'high' ? (
                                            <AlertTriangle className="h-4 w-4" />
                                        ) : update.level === 'medium' ? (
                                            <AlertCircle className="h-4 w-4" />
                                        ) : (
                                            <Clock3 className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-sans text-xs font-semibold leading-tight text-slate-900 dark:text-slate-100">{update.title}</p>
                                        <p className="mt-0.5 font-sans text-[11px] leading-tight text-slate-600 dark:text-slate-400">{update.message}</p>
                                    </div>
                                    {update.timestamp ? (
                                        <span 
                                            className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0"
                                            title={update.time}
                                        >
                                            {formatRelativeTime(update.timestamp)}
                                        </span>
                                    ) : update.time ? (
                                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                                            {update.time}
                                        </span>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Fleet Roster */}
            <div className="admin-card overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col">
                {/* Header - Fixed h-10 height */}
                <button
                    type="button"
                    onClick={() => setFleetCollapsed(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 h-10 border-b border-slate-200/50 dark:border-white/5 hover:bg-white/20 dark:hover:bg-white/5 transition-colors shrink-0"
                >
                    <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-cyan-500" />
                        <span className="section-title">Fleet Roster</span>
                    </div>
                    <span className="metric-label">
                        {fleetCollapsed ? 'EXPAND' : 'COLLAPSE'}
                    </span>
                </button>

                <div className={cn(
                    "flex-1 overflow-y-auto no-scrollbar px-4 pb-4 transition-opacity duration-300",
                    fleetCollapsed ? "opacity-0 pointer-events-none delay-0 h-0" : "opacity-100 delay-200"
                )}>
                    <div className="space-y-1 mt-3">
                        {rosterLoading && (
                            <div className="text-center py-4 font-mono text-[10px] uppercase text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                Loading roster...
                            </div>
                        )}
                        {!rosterLoading && fleetMap.length === 0 && (
                            <div className="text-center py-4 font-mono text-[10px] uppercase text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">No active agents</div>
                        )}
                        {fleetMap.map(tech => (
                            <div key={tech.id} className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold font-mono text-slate-500 dark:text-slate-300 border border-white/50 dark:border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                                    {tech.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-sans text-sm font-semibold text-slate-900 dark:text-white truncate">{tech.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            tech.status === 'off_duty' ? "bg-rose-500 dark:bg-rose-400" :
                                                tech.status === 'assigned' || tech.status === 'idle' ? "bg-slate-300 dark:bg-slate-600" :
                                                tech.status === 'en_route' ? "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" :
                                                    "bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.5)]"
                                        )} />
                                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                                            {tech.status === 'off_duty' ? 'Not Working Today' :
                                                tech.status === 'idle' ? 'Standby' :
                                                tech.status === 'assigned' ? 'Scheduled' :
                                                    tech.status === 'en_route' ? `En Route - ${tech.clientName}` :
                                                        `On Site - ${tech.clientName}`
                                            }
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void toggleWorking(tech.id, !tech.isWorking)}
                                    disabled={updatingTechIds.has(tech.id)}
                                    className={cn(
                                        "relative inline-flex h-7 w-20 shrink-0 items-center rounded-full border px-1 transition-colors",
                                        tech.isWorking
                                            ? "border-emerald-300 bg-emerald-100/70 dark:border-emerald-400/30 dark:bg-emerald-500/20"
                                            : "border-slate-300 bg-slate-200/70 dark:border-slate-600 dark:bg-slate-700/60",
                                        updatingTechIds.has(tech.id) ? "opacity-60 cursor-wait" : "hover:opacity-90"
                                    )}
                                    title={tech.isWorking ? 'Mark not working today' : 'Mark working today'}
                                >
                                    <span className={cn(
                                        "absolute flex h-5 w-5 items-center justify-center rounded-full border bg-white text-[10px] shadow-sm transition-transform",
                                        tech.isWorking ? "translate-x-12 border-emerald-300 text-emerald-600" : "translate-x-0 border-slate-300 text-slate-500"
                                    )}>
                                        {updatingTechIds.has(tech.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : tech.isWorking ? <Check className="h-3 w-3" /> : 'X'}
                                    </span>
                                    <span className={cn(
                                        "w-full text-center pl-5 font-mono text-[8px] uppercase tracking-wider font-bold",
                                        tech.isWorking ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-300"
                                    )}>
                                        {tech.isWorking ? 'Working' : 'Not'}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
