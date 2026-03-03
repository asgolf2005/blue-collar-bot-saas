'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Sparkles, CheckCircle2 } from 'lucide-react'

interface AIVoiceLoggerProps {
    onTranscriptionComplete: (text: string) => void | Promise<void>
    label?: string
}

export default function AIVoiceLogger({
    onTranscriptionComplete,
    label = "Tap to speak notes & materials"
}: AIVoiceLoggerProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [time, setTime] = useState(0)

    // Demo timer
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRecording) {
            interval = setInterval(() => {
                setTime((t) => t + 1)
            }, 1000)
        } else {
            setTime(0)
        }
        return () => clearInterval(interval)
    }, [isRecording])

    const handleToggle = async () => {
        if (isProcessing) return

        if (isRecording) {
            setIsRecording(false)
            setIsProcessing(true)

            // Simulate AI Processing time for parsing voice to structured data
            setTimeout(async () => {
                setIsProcessing(false)
                await onTranscriptionComplete("Simulated transcription: Replaced 4in pipe and tested pressure.")
            }, 1500)
        } else {
            setIsRecording(true)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="w-full flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/50 dark:border-slate-800 backdrop-blur">
            <AnimatePresence mode="wait">
                {!isRecording && !isProcessing && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center"
                    >
                        <button
                            type="button"
                            onClick={handleToggle}
                            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-blue-500/25 flex items-center justify-center group transition-transform active:scale-95"
                        >
                            <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none" />
                            <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-white" />

                            {/* Subtle idle pulse */}
                            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl -z-10 group-hover:bg-blue-500/30 transition-colors" />
                        </button>
                        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {label}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 font-mono tracking-wider uppercase">
                            AI automatically structures data
                        </p>
                    </motion.div>
                )}

                {isRecording && (
                    <motion.div
                        key="recording"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center text-center max-w-[280px]"
                    >
                        <div className="relative">
                            {/* Active recording rings */}
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 border-4 border-red-500 rounded-full"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                className="absolute inset-0 border-4 border-red-500 rounded-full"
                            />

                            <button
                                type="button"
                                onClick={handleToggle}
                                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 shadow-xl shadow-red-500/40 flex items-center justify-center transition-transform active:scale-95 z-10"
                            >
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-md" />
                            </button>
                        </div>

                        <p className="mt-6 font-mono text-xl sm:text-2xl font-bold text-red-500 tracking-widest tabular-nums">
                            {formatTime(time)}
                        </p>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            "Replaced the main valve..."
                        </p>
                    </motion.div>
                )}

                {isProcessing && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            AI is structuring your notes...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
