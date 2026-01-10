'use client'

import { Target, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CompletionProgressProps {
  completed: number
  total: number
}

export default function CompletionProgress({ completed, total }: CompletionProgressProps) {
  const [progress, setProgress] = useState(0)
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  useEffect(() => {
    // Animate progress on mount
    const timer = setTimeout(() => {
      setProgress(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  // Calculate SVG circle properties
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="rounded-3xl bg-white dark:bg-surface-900 p-6 shadow-elevation-premium-2 border border-surface-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink dark:text-surface-100 mb-1">Monthly Progress</h3>
          <p className="text-sm text-muted">Jobs completed this month</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-success" />
        </div>
      </div>

      {/* Circular Progress */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative w-48 h-48">
          {/* Background Circle */}
          <svg className="w-full h-full -rotate-90">
            {/* Background track with stripes */}
            <defs>
              <pattern id="stripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="4" className="text-surface-200 dark:text-white/5" />
              </pattern>
            </defs>
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="url(#stripes)"
              strokeWidth="12"
              opacity="0.3"
            />
            {/* Progress arc */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-ink dark:text-surface-100 mb-1">
              {progress}%
            </div>
            <div className="text-sm text-muted font-medium">Jobs Completed</div>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full mt-6 pt-6 border-t border-surface-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] shadow-sm shadow-blue-500/30"></div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Completed</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{completed}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-surface-200 dark:bg-white/10 relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                  }}
                />
              </div>
              <span className="text-sm text-muted">In Progress</span>
            </div>
            <span className="text-sm font-semibold text-ink dark:text-surface-100">{total - completed}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Total This Month</span>
            </div>
            <span className="text-sm font-bold text-success">{total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
