'use client'

import { useEffect, useCallback, useState } from 'react'
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Play, 
  AlertCircle,
  X,
  Briefcase
} from '@/components/ui/icons'
import type { JobStatus } from '@/lib/types'

interface Toast {
  id: string
  type: 'status-change' | 'new-job' | 'arrival' | 'completion' | 'error'
  title: string
  message: string
  jobId?: string
  timestamp: Date
  isExiting?: boolean
}

interface RealtimeToastProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  autoDismiss?: boolean
  dismissDelay?: number
}

const statusConfig: Record<JobStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  scheduled: {
    icon: <Clock className="w-5 h-5" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  on_the_way: {
    icon: <MapPin className="w-5 h-5" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  arrived: {
    icon: <MapPin className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  in_progress: {
    icon: <Play className="w-5 h-5" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  completed: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  cancelled: {
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
}

const toastTypeConfig: Record<Toast['type'], { borderColor: string; defaultIcon: React.ReactNode; accentColor: string }> = {
  'status-change': {
    borderColor: 'border-l-cyan-400',
    defaultIcon: <Clock className="w-5 h-5" />,
    accentColor: 'bg-cyan-400',
  },
  'new-job': {
    borderColor: 'border-l-emerald-400',
    defaultIcon: <Briefcase className="w-5 h-5" />,
    accentColor: 'bg-emerald-400',
  },
  'arrival': {
    borderColor: 'border-l-amber-400',
    defaultIcon: <MapPin className="w-5 h-5" />,
    accentColor: 'bg-amber-400',
  },
  'completion': {
    borderColor: 'border-l-emerald-400',
    defaultIcon: <CheckCircle2 className="w-5 h-5" />,
    accentColor: 'bg-emerald-400',
  },
  'error': {
    borderColor: 'border-l-rose-400',
    defaultIcon: <AlertCircle className="w-5 h-5" />,
    accentColor: 'bg-rose-400',
  },
}

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: Toast
  onDismiss: (id: string) => void 
}) {
  const config = toastTypeConfig[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`
        relative flex items-start gap-3 
        min-w-[320px] max-w-[400px]
        p-4 rounded-lg
        bg-slate-900/95 backdrop-blur-md
        border border-slate-700/50
        border-l-4 ${config.borderColor}
        shadow-lg shadow-black/20
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:-translate-y-0.5
        animate-toast-in
        ${toast.isExiting ? 'animate-toast-out' : ''}
      `}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 p-2 rounded-full
        ${toast.type === 'new-job' ? 'bg-emerald-500/10 text-emerald-400' : ''}
        ${toast.type === 'arrival' ? 'bg-amber-500/10 text-amber-400' : ''}
        ${toast.type === 'completion' ? 'bg-emerald-500/10 text-emerald-400' : ''}
        ${toast.type === 'status-change' ? 'bg-cyan-500/10 text-cyan-400' : ''}
        ${toast.type === 'error' ? 'bg-rose-500/10 text-rose-400' : ''}
      `}>
        {config.defaultIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white whitespace-normal break-words leading-snug">
          {toast.title}
        </h4>
        <p className="text-sm text-slate-400 mt-1 whitespace-normal break-words leading-relaxed">
          {toast.message}
        </p>
        <span className="text-xs text-slate-500 mt-2 block">
          {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Dismiss Button */}
      <button type="button"
        onClick={() => onDismiss(toast.id)}
        className="
          flex-shrink-0 p-1 rounded-md
          text-slate-500 hover:text-white
          hover:bg-slate-800
          transition-all duration-200
        "
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-b-lg overflow-hidden">
        <div
          className={`
            h-full ${config.accentColor} animate-progress-shrink
          `}
        />
      </div>
    </div>
  )
}

/**
 * RealtimeToast Container Component
 * Manages and displays toast notifications for real-time updates
 */
export function RealtimeToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

/**
 * Hook for managing toast notifications
 */
export function useRealtimeToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp' | 'isExiting'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts((prev) => [...prev, { ...toast, id, timestamp: new Date(), isExiting: false }])
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    // Mark as exiting for animation
    setToasts((prev) => 
      prev.map(t => t.id === id ? { ...t, isExiting: true } : t)
    )
    
    // Actually remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Status change toast helper
  const showStatusChange = useCallback((jobId: string, status: JobStatus, customerName?: string) => {
    const statusMessages: Record<JobStatus, { title: string; message: string }> = {
      scheduled: {
        title: 'Job Scheduled',
        message: `Job #${jobId.slice(0, 8)}${customerName ? ` for ${customerName}` : ''} has been scheduled.`,
      },
      on_the_way: {
        title: 'Technician En Route',
        message: `Technician is on the way to Job #${jobId.slice(0, 8)}${customerName ? ` - ${customerName}` : ''}.`,
      },
      arrived: {
        title: 'Technician Arrived',
        message: `Technician has arrived at Job #${jobId.slice(0, 8)}${customerName ? ` - ${customerName}` : ''}.`,
      },
      in_progress: {
        title: 'Job In Progress',
        message: `Job #${jobId.slice(0, 8)}${customerName ? ` for ${customerName}` : ''} is now in progress.`,
      },
      completed: {
        title: 'Job Completed',
        message: `Job #${jobId.slice(0, 8)}${customerName ? ` for ${customerName}` : ''} has been completed.`,
      },
      cancelled: {
        title: 'Job Cancelled',
        message: `Job #${jobId.slice(0, 8)}${customerName ? ` for ${customerName}` : ''} has been cancelled.`,
      },
    }

    const message = statusMessages[status]
    if (message) {
      addToast({
        type: 'status-change',
        ...message,
        jobId,
      })
    }
  }, [addToast])

  // New job toast helper
  const showNewJob = useCallback((jobId: string, customerName?: string) => {
    addToast({
      type: 'new-job',
      title: 'New Job Created',
      message: `A new job has been created${customerName ? ` for ${customerName}` : ''}.`,
      jobId,
    })
  }, [addToast])

  // Error toast helper
  const showError = useCallback((message: string) => {
    addToast({
      type: 'error',
      title: 'Error',
      message,
    })
  }, [addToast])

  return {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    showStatusChange,
    showNewJob,
    showError,
  }
}

export type { Toast }
export { statusConfig }

