'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface SwipeActionProps {
    onConfirm: () => void | Promise<void>
    label: string
    color?: 'blue' | 'emerald' | 'amber' | 'slate'
    loading?: boolean
}

export default function SwipeAction({
    onConfirm,
    label,
    color = 'blue',
    loading = false,
}: SwipeActionProps) {
    const [isSuccess, setIsSuccess] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)

    const x = useMotionValue(0)
    const controls = useAnimation()

    const knobWidth = 56
    const maxDrag = Math.max(0, containerWidth - knobWidth - 8) // 4px padding each side

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth)
        }
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerWidth(entry.contentRect.width)
            }
        })
        if (containerRef.current) observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    const handleDragEnd = async (event: any, info: any) => {
        // If dragged past 80% to the right
        if (info.offset.x > maxDrag * 0.8) {
            await controls.start({ x: maxDrag })
            setIsSuccess(true)
            await onConfirm()
            // Reset after 2s if still mounted
            setTimeout(() => {
                setIsSuccess(false)
                controls.start({ x: 0 })
            }, 2000)
        } else {
            controls.start({ x: 0 })
        }
    }

    // Dynamic styling based on drag position
    const opacity = useTransform(x, [0, maxDrag * 0.8], [1, 0])
    const bgOpacity = useTransform(x, [0, maxDrag], [0.1, 1])

    const colorVariants = {
        blue: {
            bg: 'bg-blue-500/10 dark:bg-blue-400/10',
            activeBg: 'bg-blue-500',
            text: 'text-blue-600 dark:text-blue-400',
            knob: 'bg-blue-500',
            shadow: 'shadow-blue-500/25'
        },
        emerald: {
            bg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
            activeBg: 'bg-emerald-500',
            text: 'text-emerald-700 dark:text-emerald-400',
            knob: 'bg-emerald-500',
            shadow: 'shadow-emerald-500/25'
        },
        amber: {
            bg: 'bg-amber-500/10 dark:bg-amber-400/10',
            activeBg: 'bg-amber-500',
            text: 'text-amber-700 dark:text-amber-500',
            knob: 'bg-amber-500',
            shadow: 'shadow-amber-500/25'
        },
        slate: {
            bg: 'bg-slate-500/10 dark:bg-slate-400/10',
            activeBg: 'bg-slate-700 dark:bg-slate-600',
            text: 'text-slate-600 dark:text-slate-400',
            knob: 'bg-slate-700 dark:bg-slate-600',
            shadow: 'shadow-slate-500/20'
        }
    }

    const activeColor = colorVariants[color]

    return (
        <div
            ref={containerRef}
            className={`relative h-16 w-full rounded-2xl overflow-hidden flex items-center justify-center border border-white/20 dark:border-white/5 backdrop-blur-md ${activeColor.bg}`}
        >
            {/* Background fill that grows as you drag */}
            <motion.div
                className={`absolute inset-y-0 left-0 ${activeColor.activeBg}`}
                style={{ width: x, opacity: bgOpacity }}
            />

            <motion.span
                style={{ opacity }}
                className={`relative z-10 font-bold uppercase tracking-[0.2em] text-[13px] ${activeColor.text} pointer-events-none`}
            >
                {isSuccess ? 'Confirmed' : loading ? 'Processing' : label}
            </motion.span>

            <motion.div
                drag={isSuccess || loading ? false : "x"}
                dragConstraints={{ left: 0, right: maxDrag }}
                dragElastic={0.05}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className={`absolute left-1 top-1 bottom-1 w-14 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing z-20 ${activeColor.knob} ${activeColor.shadow} shadow-lg`}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSuccess ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <ChevronRight className="w-6 h-6 text-white" />
                )}
            </motion.div>
        </div>
    )
}
