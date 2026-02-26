'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LocalDateTimeText } from '@/components/ui/LocalDateTimeText'
import { SlidingSegmentedControl } from '@/components/ui/SlidingSegmentedControl'
import { cn } from '@/lib/utils'

type JobsTimingFilter = 'all' | 'upcoming' | 'past'

const TIMING_OPTIONS: Array<{ value: JobsTimingFilter; label: string }> = [
    { value: 'all', label: 'All Time' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
]

interface JobArchiveData {
    id: string
    status: string
    scheduled_start: string | null
    customer?: { name?: string | null } | null
    technician?: { full_name?: string | null } | null
    services?: Array<{ service?: { name?: string | null } | null }>
}

export function JobsArchiveClient({ jobs, initialNowMs = 0 }: { jobs: JobArchiveData[]; initialNowMs?: number }) {
    const [timingFilter, setTimingFilter] = useState<JobsTimingFilter>('all')
    const [nowMs, setNowMs] = useState(initialNowMs)

    useEffect(() => {
        const refreshNow = () => setNowMs(Date.now())
        const timer = window.setInterval(refreshNow, 60_000)
        return () => window.clearInterval(timer)
    }, [])

    const visibleJobs = jobs.filter((job) => {
        if (timingFilter === 'all') return true
        if (!job.scheduled_start) return false
        const scheduledMs = new Date(job.scheduled_start).getTime()
        if (!Number.isFinite(scheduledMs)) return false
        if (timingFilter === 'past') return scheduledMs < nowMs
        if (timingFilter === 'upcoming') return scheduledMs >= nowMs
        return true
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-end p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-md max-w-max ml-auto">
                <SlidingSegmentedControl
                    options={TIMING_OPTIONS}
                    value={timingFilter}
                    onChange={setTimingFilter}
                    ariaLabel="Jobs timing"
                    indicatorClassName="bg-white dark:bg-slate-700 shadow-sm rounded-xl"
                    buttonBaseClassName="px-6 py-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold transition-colors"
                    activeClassName="text-slate-900 dark:text-white"
                    inactiveClassName="text-slate-500 hover:text-slate-700 dark:text-slate-200"
                />
            </div>

            <table className="w-full min-w-[900px] border-collapse bg-white dark:bg-slate-900/40 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
                <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b border-slate-200/50 dark:border-slate-700/50">
                        <th className="px-6 py-5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
                            Timestamp
                        </th>
                        <th className="px-6 py-5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
                            Client Entity
                        </th>
                        <th className="px-6 py-5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
                            Assigned Agent
                        </th>
                        <th className="px-6 py-5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
                            Current State
                        </th>
                        <th className="px-6 py-5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">
                            Operation
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                    {visibleJobs.map((job) => (
                        <tr
                            key={job.id}
                            data-test="job-card"
                            className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <td className="px-6 py-5 font-mono text-[11px] text-slate-700 dark:text-slate-300 tracking-wider">
                                <Link href={`/admin/jobs/${job.id}`} className="hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors inline-block group-hover:scale-105 origin-left">
                                    <LocalDateTimeText value={job.scheduled_start} fallback="--:--:--" />
                                </Link>
                            </td>
                            <td className="px-6 py-5 font-sans text-sm font-medium text-slate-800 dark:text-slate-200">
                                {job.customer?.name || 'Unknown Object'}
                            </td>
                            <td className="px-6 py-5 font-sans text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold font-mono text-slate-500 dark:text-slate-400 shrink-0 shadow-inner">
                                        {job.technician?.full_name ? job.technician.full_name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    {job.technician?.full_name || 'Awaiting Assignment'}
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <StatusBadge status={job.status} />
                            </td>
                            <td className="px-6 py-5 font-sans text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {job.services?.[0]?.service?.name || 'Standard Protocol'}
                            </td>
                        </tr>
                    ))}
                    {visibleJobs.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-24 text-center">
                                <div className="inline-flex flex-col items-center justify-center opacity-50">
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 mb-6 animate-spin-slow" />
                                    <span className="font-mono text-xs tracking-widest text-slate-500 dark:text-slate-400 uppercase">Archive Empty</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { colors: string }> = {
        scheduled: { colors: 'text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-400/30' },
        on_the_way: { colors: 'text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/30 line-through decoration-amber-500/50' },
        arrived: { colors: 'text-orange-700 bg-orange-50 border border-orange-200 dark:text-orange-300 dark:bg-orange-400/10 dark:border-orange-400/30' },
        in_progress: { colors: 'text-cyan-700 bg-cyan-50 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-400/10 dark:border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' },
        completed: { colors: 'text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-400/10 dark:border-emerald-400/30' },
        cancelled: { colors: 'text-slate-600 bg-slate-100 border border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/30 opacity-75' },
    }

    const config = statusConfig[status] || statusConfig.scheduled
    const label = status === 'on_the_way' ? 'EN ROUTE' : status.replace('_', ' ').toUpperCase()

    return (
        <span className={cn(
            "inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 font-mono text-[9px] tracking-widest font-bold uppercase transition-all shadow-sm",
            config.colors
        )}>
            {label}
        </span>
    )
}
