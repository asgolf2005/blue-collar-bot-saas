'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Navigation, Ban, Truck, PlayCircle, XCircle, Check, Loader2 } from 'lucide-react'
import { startOfDay, endOfDay, format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'
import { showToast } from '@/lib/utils/toast'

interface RosterTech {
    id: string
    full_name: string | null
    is_working: boolean
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
            try {
                const response = await fetch(`/api/admin/technicians/working-status?date=${workDateKey}`, {
                    cache: 'no-store',
                })
                const payload = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load roster')
                }
                if (active) {
                    setTechRoster(Array.isArray(payload.technicians) ? payload.technicians : [])
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

    const alerts = useMemo(() => {
        const list: Array<{ id: string, type: 'critical' | 'warning' | 'info' | 'success' | 'muted', message: string, time?: string }> = []

        dayJobs.forEach(j => {
            const timeStr = j.scheduled_start ? new Date(j.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined
            const client = j.customer?.name || 'Client'

            if (j.status === 'scheduled') {
                if (!j.technician?.full_name) {
                    list.push({ id: `unassigned-${j.id}`, type: 'warning', message: `${client} - Awaiting Assignment`, time: timeStr })
                } else if (isViewingToday && nowMs > 0 && j.scheduled_start && new Date(j.scheduled_start).getTime() < nowMs) {
                    list.push({ id: `late-${j.id}`, type: 'critical', message: `${client} - SLA Risk (Late Start)`, time: timeStr })
                }
            } else if (j.status === 'on_the_way') {
                list.push({ id: `enroute-${j.id}`, type: 'info', message: `${client} - Tech En Route`, time: timeStr })
            } else if (j.status === 'in_progress' || j.status === 'arrived') {
                list.push({ id: `progress-${j.id}`, type: 'info', message: `${client} - Work In Progress`, time: timeStr })
            } else if (j.status === 'completed') {
                list.push({ id: `completed-${j.id}`, type: 'success', message: `${client} - Completed`, time: timeStr })
            } else if (j.status === 'cancelled') {
                list.push({ id: `cancelled-${j.id}`, type: 'muted', message: `${client} - Cancelled`, time: timeStr })
            }
        })

        return list
    }, [dayJobs, nowMs, isViewingToday])

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

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Triage Alerts */}
            <div className={cn(
                "bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 rounded-3xl overflow-hidden shadow-inner transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
                triageCollapsed ? "flex-none h-[64px] shrink-0" : "flex flex-col flex-1 min-h-[140px] max-h-[300px]"
            )}>
                <button
                    type="button"
                    onClick={() => setTriageCollapsed(prev => !prev)}
                    className="w-full flex items-center justify-between p-5 hover:bg-rose-500/5 transition-colors h-[64px] shrink-0"
                >
                    <h3 className="font-display text-sm font-bold tracking-[0.2em] text-rose-600 dark:text-rose-400 uppercase drop-shadow-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Active Triage
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-500 font-bold hover:text-rose-400">
                        {triageCollapsed ? 'EXPAND' : 'COLLAPSE'}
                    </span>
                </button>

                <div className={cn(
                    "flex-1 overflow-y-auto no-scrollbar px-5 pb-5 space-y-2 transition-opacity duration-300",
                    triageCollapsed ? "opacity-0 pointer-events-none delay-0" : "opacity-100 delay-200"
                )}>
                    {alerts.length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Systems Nominal</span>
                        </div>
                    ) : (
                        alerts.map((alert, idx) => {
                            const Icon = alert.type === 'success' ? CheckCircle2 :
                                alert.type === 'critical' || alert.type === 'warning' ? Ban :
                                    alert.type === 'muted' ? XCircle :
                                        alert.message.includes('En Route') ? Truck : PlayCircle

                            return (
                                <div
                                    key={alert.id}
                                    className={cn(
                                        "flex items-start gap-3 px-3 py-2.5 rounded-xl border backdrop-blur-sm",
                                        alert.type === 'critical'
                                            ? "bg-rose-100/50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                                            : alert.type === 'warning'
                                                ? "bg-amber-100/50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300"
                                                : alert.type === 'success'
                                                    ? "bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                                    : alert.type === 'muted'
                                                        ? "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400"
                                                        : "bg-cyan-100/50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 shadow-[0_0_5px_rgba(6,182,212,0.1)]"
                                    )}
                                >
                                    <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-sans text-xs font-semibold leading-tight">{alert.message}</p>
                                        {alert.time && <p className="font-mono text-[9px] mt-1 opacity-75">{alert.time}</p>}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Fleet Roster */}
            <div className={cn(
                "bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-white/5 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
                fleetCollapsed ? "flex-none h-[64px] shrink-0" : "flex flex-col flex-1 min-h-[140px] max-h-[300px]"
            )}>
                <button
                    type="button"
                    onClick={() => setFleetCollapsed(prev => !prev)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/20 dark:hover:bg-white/5 transition-colors h-[64px] shrink-0"
                >
                    <h3 className="font-display text-sm font-bold tracking-[0.2em] text-slate-800 dark:text-slate-200 uppercase drop-shadow-sm flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-cyan-500" />
                        Fleet Roster
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500 font-bold hover:text-cyan-400">
                        {fleetCollapsed ? 'EXPAND' : 'COLLAPSE'}
                    </span>
                </button>

                <div className={cn(
                    "flex-1 overflow-y-auto no-scrollbar px-5 pb-5 space-y-1 transition-opacity duration-300",
                    fleetCollapsed ? "opacity-0 pointer-events-none delay-0" : "opacity-100 delay-200"
                )}>
                    {rosterLoading && (
                        <div className="text-center py-4 font-mono text-[10px] uppercase text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            Loading roster...
                        </div>
                    )}
                    {!rosterLoading && fleetMap.length === 0 && (
                        <div className="text-center py-4 font-mono text-[10px] uppercase text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No active agents</div>
                    )}
                    {fleetMap.map(tech => (
                        <div key={tech.id} className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
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
    )
}

