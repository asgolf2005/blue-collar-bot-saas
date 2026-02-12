'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'

interface ConnectionStatusProps {
  autoRefresh?: boolean
}

export function ConnectionStatus({ autoRefresh = false }: ConnectionStatusProps) {
  const router = useRouter()
  const { isConnected, connectionStatus, refetch, lastUpdate } = useRealtimeJobsContext()
  const lastRefreshRef = useRef<number>(0)

  useEffect(() => {
    if (!autoRefresh || !lastUpdate || connectionStatus !== 'connected') return

    const now = Date.now()
    if (now - lastRefreshRef.current < 800) return
    lastRefreshRef.current = now
    router.refresh()
  }, [autoRefresh, connectionStatus, lastUpdate, router])

  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">CONNECTING...</span>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="font-mono text-[10px] text-red-600 dark:text-red-400">OFFLINE</span>
        <button
          onClick={() => {
            void refetch()
          }}
          className="ml-1 text-[10px] underline text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">LIVE</span>
    </div>
  )
}
