'use client'

import React from 'react'
import { Sparkles, Navigation, Clock, ShieldAlert } from 'lucide-react'

interface AIContextCardProps {
    customerName: string
    jobType: string
    distanceMsg: string
    etaMsg: string
    aiNote?: string
}

export default function AIContextCard({
    customerName,
    jobType,
    distanceMsg,
    etaMsg,
    aiNote
}: AIContextCardProps) {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl shadow-cyan-500/20 border border-slate-700/50">
            {/* Dynamic Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-[0.2em] font-bold mb-1">
                            En Route
                        </p>
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {customerName}
                        </h2>
                        <p className="text-slate-400 font-medium mt-1 text-xs bg-slate-800/50 inline-flex px-3 py-1 rounded-full border border-slate-700/50">
                            {jobType}
                        </p>
                    </div>

                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                        <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </div>
                </div>

                {/* Dynamic Metric Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">ETA</p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-white transition-all">{etaMsg}</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Navigation className="w-4 h-4 text-slate-400" />
                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Distance</p>
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-white mt-1 transition-all">{distanceMsg}</p>
                    </div>
                </div>

                {/* AI Briefing Snippet */}
                {aiNote ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 sm:p-4 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold mb-1">AI Context Brief</p>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                                    {aiNote}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
                        <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                        <p className="text-xs sm:text-sm text-slate-400">Standard service protocol applies.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
