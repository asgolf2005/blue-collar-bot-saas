'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeJobsContext } from '@/components/admin/JobsRealtimeProvider'

interface ConnectionStatusProps {
  autoRefresh?: boolean
  includeHealthChecks?: boolean
  healthPollMs?: number
}

interface HealthPayload {
  database?: boolean
  openai?: boolean
  n8n?: {
    configured?: boolean
    lastReceivedAt?: string | null
  }
}

function relativeTimeLabel(timestamp: string | null | undefined, nowMs: number): string {
  if (!timestamp) return 'never'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'never'

  const diffMs = nowMs - parsed.getTime()
  if (diffMs < 60000) return 'just now'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function toneClasses(tone: 'green' | 'yellow' | 'red') {
  if (tone === 'green') return 'bg-emerald-500'
  if (tone === 'yellow') return 'bg-amber-400'
  return 'bg-rose-500'
}

export function ConnectionStatus({
  autoRefresh = false,
  includeHealthChecks = false,
  healthPollMs = 30000,
}: ConnectionStatusProps) {
  const router = useRouter()
  const { isConnected, connectionStatus, refetch, lastUpdate } = useRealtimeJobsContext()
  const lastRefreshRef = useRef<number>(0)
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!autoRefresh || !lastUpdate || connectionStatus !== 'connected') return

    const now = Date.now()
    if (now - lastRefreshRef.current < 800) return
    lastRefreshRef.current = now
    router.refresh()
  }, [autoRefresh, connectionStatus, lastUpdate, router])

  useEffect(() => {
    if (!includeHealthChecks) return

    let active = true

    const loadHealth = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as HealthPayload
        if (active) setHealth(payload)
      } catch {
        // no-op: status indicator should degrade gracefully
      }
    }

    void loadHealth()
    const interval = setInterval(() => {
      setNowMs(Date.now())
      void loadHealth()
    }, healthPollMs)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [healthPollMs, includeHealthChecks])

  const supabaseStatus = useMemo(() => {
    if (connectionStatus === 'connecting') {
      return { tone: 'yellow' as const, label: 'Supabase connecting' }
    }
    if (!isConnected) {
      return { tone: 'red' as const, label: 'Supabase offline' }
    }
    return { tone: 'green' as const, label: 'Supabase live' }
  }, [connectionStatus, isConnected])

  const openaiStatus = useMemo(() => {
    if (!health) return { tone: 'yellow' as const, label: 'AI checking...' }
    if (health.openai) return { tone: 'green' as const, label: 'OpenAI configured' }
    return { tone: 'red' as const, label: 'OpenAI unavailable' }
  }, [health])

  const n8nStatus = useMemo(() => {
    if (!health) return { tone: 'yellow' as const, label: 'n8n checking...' }

    const configured = Boolean(health.n8n?.configured)
    const lastReceivedAt = health.n8n?.lastReceivedAt || null
    if (!configured) return { tone: 'red' as const, label: 'n8n not configured' }
    if (!lastReceivedAt) return { tone: 'yellow' as const, label: 'n8n awaiting webhook' }

    const ageMs = nowMs - new Date(lastReceivedAt).getTime()
    const stale = Number.isFinite(ageMs) ? ageMs > 15 * 60 * 1000 : true
    return {
      tone: stale ? ('yellow' as const) : ('green' as const),
      label: `n8n last ${relativeTimeLabel(lastReceivedAt, nowMs)}`,
    }
  }, [health, nowMs])

  const statusItems = includeHealthChecks
    ? [supabaseStatus, openaiStatus, n8nStatus]
    : [supabaseStatus]

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex flex-col gap-1">
        {statusItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${toneClasses(item.tone)}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
              {item.label}
            </span>
          </div>
        ))}
        {!isConnected && (
          <button
            type="button"
            onClick={() => {
              void refetch()
            }}
            className="mt-1 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-400 underline decoration-dotted underline-offset-2"
          >
            Retry connection
          </button>
        )}
      </div>
    </div>
  )
}
