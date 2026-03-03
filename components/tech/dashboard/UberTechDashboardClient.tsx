'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation, Briefcase, Plus, User, FileText, Wrench, Wallet, Calendar, CheckCircle2, Circle, Send, Sparkles } from 'lucide-react'
import { format, isSameDay } from 'date-fns'

import SwipeAction from './SwipeAction'
import AIContextCard from './AIContextCard'
import AIVoiceLogger from './AIVoiceLogger'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { createClient } from '@/lib/supabase/client'

// -- Types & Helpers (borrowed from TodayViewClient) --
type JobStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

interface RawJob {
    id: string
    status?: JobStatus
    scheduled_start?: string | null
    description?: string | null
    total_cost?: number | null
    customer?: any
    services?: any
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

function normalizeJob(job: RawJob) {
    if (!job.scheduled_start || !job.id) return null
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    return {
        id: job.id,
        scheduled_start: job.scheduled_start,
        status: (job.status || 'scheduled') as JobStatus,
        description: job.description || 'Service Appointment',
        total_cost: job.total_cost || 0,
        customer: {
            id: customer?.id || '',
            name: customer?.name || 'Unknown Customer',
            phone: customer?.phone || null,
            address: customer?.address || null,
        }
    }
}

export default function UberTechDashboardClient({
    nowIso,
    todayJobs,
    tomorrowJobs = [],
    userName,
}: {
    nowIso: string
    todayJobs: any[]
    tomorrowJobs?: any[]
    userName: string
}) {
    const supabase = createClient()
    const { isLoaded, loadError } = useGoogleMaps()

    // -- Map Refs --
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<google.maps.Map | null>(null)
    const markerRef = useRef<google.maps.Marker | null>(null)

    // -- State Logic --
    const now = useMemo(() => new Date(nowIso), [nowIso])
    const [liveJobs, setLiveJobs] = useState(() =>
        todayJobs.map(normalizeJob).filter(Boolean).sort((a, b) =>
            new Date(a!.scheduled_start).getTime() - new Date(b!.scheduled_start).getTime()
        )
    )

    const activeJob = useMemo(() => {
        // 1. Find a job already in progress or en route
        const working = liveJobs.find(j =>
            j?.status === 'on_the_way' || j?.status === 'arrived' || j?.status === 'in_progress'
        )
        if (working) return working

        // 2. Otherwise find the next absolute scheduled job today that isn't done
        const upcoming = liveJobs.find(j =>
            j?.status === 'scheduled' && new Date(j.scheduled_start).getTime() >= now.getTime()
        )
        return upcoming || null
    }, [liveJobs, now])


    // -- The 4 UI States --
    const uiState = useMemo(() => {
        if (!activeJob) return 'OFF_DUTY'
        if (activeJob.status === 'scheduled') return 'AWAITING_NEXT'
        if (activeJob.status === 'on_the_way') return 'EN_ROUTE'
        if (activeJob.status === 'arrived' || activeJob.status === 'in_progress') return 'WORKSPACE'
        return 'OFF_DUTY'
    }, [activeJob])

    // -- Empty State Data --
    const completedRevenue = useMemo(() => {
        return liveJobs
            .filter(j => j?.status === 'completed')
            .reduce((sum, j) => sum + (j?.total_cost || 0), 0)
    }, [liveJobs])

    const completedCount = useMemo(() => {
        return liveJobs.filter(j => j?.status === 'completed').length
    }, [liveJobs])

    const nextTomorrowJob = useMemo(() => {
        const jobs = tomorrowJobs.map(normalizeJob).filter(Boolean).sort((a, b) =>
            new Date(a!.scheduled_start).getTime() - new Date(b!.scheduled_start).getTime()
        )
        return jobs[0] || null
    }, [tomorrowJobs])

    const [checklist, setChecklist] = useState({
        odometer: false,
        restock: false,
        timesheet: false,
    })
    const isEodReady = checklist.odometer && checklist.restock && checklist.timesheet
    const [eodSubmitted, setEodSubmitted] = useState(false)

    // -- Map Initialization & Updates --
    useEffect(() => {
        if (!isLoaded || !mapContainerRef.current) return
        if (!mapRef.current) {
            mapRef.current = new google.maps.Map(mapContainerRef.current, {
                zoom: 13,
                center: { lat: 37.7749, lng: -122.4194 }, // SF fallback
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
                styles: [
                    // Sleek dark mode map style
                    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
                    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
                    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
                ]
            })
        }

        // Update map marker based on active job address
        if (activeJob?.customer?.address) {
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode({ address: activeJob.customer.address }, (results, status) => {
                if (status === 'OK' && results?.[0]?.geometry?.location && mapRef.current) {
                    const loc = results[0].geometry.location

                    if (markerRef.current) markerRef.current.setMap(null)

                    markerRef.current = new google.maps.Marker({
                        map: mapRef.current,
                        position: loc,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: uiState === 'EN_ROUTE' ? '#06b6d4' : '#10b981', // Cyan when driving, Emerald when there
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                            scale: 12,
                        }
                    })

                    // Offset center slightly to account for bottom sheet
                    const span = mapRef.current.getBounds()?.toSpan()
                    const latOffset = span ? span.lat() * 0.2 : 0
                    mapRef.current.panTo({ lat: loc.lat() - latOffset, lng: loc.lng() })
                }
            })
        }

    }, [isLoaded, activeJob, uiState])


    // -- Job Actions --
    const updateJobStatus = async (jobId: string, newStatus: JobStatus) => {
        await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId)
        setLiveJobs(prev => prev.map(j => j?.id === jobId ? { ...j, status: newStatus } : j))
    }

    // --- RENDER LAYERS ---

    return (
        <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden font-sans flex flex-col">

            {/* 1. BACKGROUND Map Layer */}
            <div
                className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${uiState === 'WORKSPACE' ? 'opacity-30 blur-md scale-105' : 'opacity-100 blur-0 scale-100'}`}
            >
                <div ref={mapContainerRef} className="w-full h-full" />

                {/* Map Dark overlay to ensure foreground contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
            </div>


            {/* 2. FOREGROUND Bottom Sheet Layer */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end pointer-events-none">
                <AnimatePresence mode="popLayout">

                    {/* STATE 1: AWAITING NEXT */}
                    {uiState === 'AWAITING_NEXT' && activeJob && (
                        <motion.div
                            layoutId="bottom-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-slate-900/90 backdrop-blur-2xl border-t border-slate-700/50 rounded-t-[40px] p-5 pb-[env(safe-area-inset-bottom,24px)] pointer-events-auto shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]"
                        >
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

                            <p className="text-cyan-400 font-mono text-xs uppercase tracking-[0.2em] font-bold mb-2">
                                Up Next • {format(new Date(activeJob.scheduled_start), 'h:mm a')}
                            </p>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {activeJob.customer.name}
                            </h2>
                            <p className="text-slate-400 text-sm mb-5 flex items-center gap-2 line-clamp-1">
                                <Navigation className="w-4 h-4" />
                                {activeJob.customer.address || 'Address pending'}
                            </p>

                            <SwipeAction
                                label="Head to Job"
                                color="blue"
                                onConfirm={() => updateJobStatus(activeJob.id, 'on_the_way')}
                            />
                        </motion.div>
                    )}

                    {/* STATE 2: EN ROUTE */}
                    {uiState === 'EN_ROUTE' && activeJob && (
                        <motion.div
                            key="en_route"
                            layoutId="bottom-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="px-4 pb-[env(safe-area-inset-bottom,24px)] pt-4 pointer-events-auto flex flex-col gap-4"
                        >
                            {/* Context Card floats above the sheet */}
                            <AIContextCard
                                customerName={activeJob.customer.name}
                                jobType={activeJob.description || 'Service'}
                                distanceMsg="5.2 mi"
                                etaMsg="14 min"
                                aiNote="Loyal customer. Last job was a condenser repair 6 months ago. Watch out for their dog, Buster."
                            />

                            <div className="bg-slate-900/90 backdrop-blur-2xl border flex border-slate-700/50 rounded-3xl p-4 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
                                <SwipeAction
                                    label="Slide to Arrive"
                                    color="emerald"
                                    onConfirm={() => updateJobStatus(activeJob.id, 'arrived')}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 3: WORKSPACE */}
                    {(uiState === 'WORKSPACE') && activeJob && (
                        <motion.div
                            key="workspace"
                            layoutId="bottom-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
                            className="bg-slate-950/95 backdrop-blur-3xl border-t border-slate-800 rounded-t-[40px] p-5 pb-[env(safe-area-inset-bottom,24px)] pointer-events-auto h-[85dvh] flex flex-col"
                        >
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4 shrink-0" />

                            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <p className="text-emerald-400 font-mono text-xs uppercase tracking-[0.2em] font-bold">
                                        Job In Progress
                                    </p>
                                </div>

                                <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">
                                    {activeJob.customer.name}
                                </h2>

                                <div className="flex gap-2 mb-6">
                                    <span className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                                        <User className="w-4 h-4" /> Client
                                    </span>
                                    <span className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg text-sm flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4" /> {activeJob.description || 'Service'}
                                    </span>
                                </div>

                                {/* AI Voice Logger is the centerpiece */}
                                <div className="mb-6">
                                    <AIVoiceLogger
                                        onTranscriptionComplete={(text) => console.log('Parsed text:', text)}
                                    />
                                </div>

                                {/* Simulated Parsed Materials */}
                                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 mb-8">
                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-cyan-400" />
                                        AI Parsed Ledger
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-slate-400 text-sm">
                                            <span className="flex items-center gap-2"><Wrench className="w-4 h-4" /> Labor (1.5 hrs)</span>
                                            <span className="text-white font-mono">$150.00</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-400 text-sm">
                                            <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> 4in PVC Pipe (1x)</span>
                                            <span className="text-white font-mono">$45.00</span>
                                        </div>
                                        <div className="h-px bg-slate-800 w-full my-3" />
                                        <div className="flex items-center justify-between font-bold">
                                            <span className="text-white text-base">Total Estimated</span>
                                            <span className="text-emerald-400 text-lg font-mono">$195.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Bottom Action */}
                            <div className="pt-4 mt-auto shrink-0 bg-slate-950 border-t border-slate-900">
                                <SwipeAction
                                    label="Complete & Bill"
                                    color="emerald"
                                    onConfirm={() => updateJobStatus(activeJob.id, 'completed')}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 4: OFF DUTY (No active/upcoming jobs) - Premium End of Day */}
                    {uiState === 'OFF_DUTY' && (
                        <motion.div
                            key="off_duty"
                            layoutId="bottom-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="bg-slate-950/95 backdrop-blur-3xl border-t border-slate-800 rounded-t-[40px] p-5 pb-[env(safe-area-inset-bottom,24px)] pointer-events-auto flex flex-col h-[88dvh]"
                        >
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-4 shrink-0" />

                            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                                    Day Complete 🎉
                                </h2>

                                {/* Financial Recap */}
                                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/20 border border-emerald-500/20 rounded-3xl p-5 mb-4 relative overflow-hidden group shadow-lg shadow-emerald-500/5">
                                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                                    <div className="flex items-center gap-3 mb-2">
                                        <Wallet className="w-5 h-5 text-emerald-400" />
                                        <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Revenue Generated</p>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-4xl font-mono font-bold text-white">${completedRevenue.toFixed(0)}</p>
                                        <p className="text-slate-400 font-medium text-sm">across {completedCount} jobs</p>
                                    </div>
                                </div>

                                {/* Tomorrow's Prelude */}
                                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-cyan-400" />
                                            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Tomorrow's Prelude</p>
                                        </div>
                                    </div>
                                    {nextTomorrowJob ? (
                                        <div>
                                            <p className="text-white font-bold text-lg mb-1">{nextTomorrowJob.customer.name}</p>
                                            <p className="text-slate-400 text-sm">{nextTomorrowJob.description}</p>
                                            <p className="text-sm font-mono text-cyan-400 mt-2">{format(new Date(nextTomorrowJob.scheduled_start), 'h:mm a')}</p>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm">No jobs scheduled yet. Enjoy the evening!</p>
                                    )}
                                </div>

                                {/* Interactive EOD Checklist */}
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">End of Day Checklist</p>
                                    <div className="space-y-2">
                                        {(Object.keys(checklist) as (keyof typeof checklist)[]).map((key) => {
                                            const labels: Record<string, string> = {
                                                odometer: 'Log final odometer reading',
                                                restock: 'Restock common parts',
                                                timesheet: 'Submit timesheet',
                                            }
                                            const isChecked = checklist[key]
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setChecklist(p => ({ ...p, [key]: !p[key] }))}
                                                    disabled={eodSubmitted}
                                                    className={cx(
                                                        "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                                                        isChecked
                                                            ? "bg-slate-800/80 border-slate-700"
                                                            : "bg-slate-900 border-slate-800 hover:border-slate-700",
                                                        eodSubmitted && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isChecked ? (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                        </motion.div>
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-slate-600" />
                                                    )}
                                                    <span className={cx(
                                                        "text-sm font-medium transition-colors",
                                                        isChecked ? "text-slate-300 line-through decoration-slate-600" : "text-slate-200"
                                                    )}>
                                                        {labels[key]}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Admin Submission */}
                            <div className="pt-4 mt-auto shrink-0 bg-slate-950 border-t border-slate-900">
                                <AnimatePresence mode="wait">
                                    {eodSubmitted ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold"
                                        >
                                            <Sparkles className="w-5 h-5" />
                                            Report Submitted to Admin
                                        </motion.div>
                                    ) : (
                                        <motion.button
                                            whileTap={isEodReady ? { scale: 0.98 } : {}}
                                            onClick={() => { if (isEodReady) setEodSubmitted(true) }}
                                            disabled={!isEodReady}
                                            className={cx(
                                                "w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all shadow-lg",
                                                isEodReady
                                                    ? "bg-cyan-600 text-white shadow-cyan-500/25 hover:bg-cyan-500"
                                                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                                            )}
                                        >
                                            <Send className="w-5 h-5" />
                                            Submit EOD Report
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
