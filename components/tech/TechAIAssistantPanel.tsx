'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { showToast } from '@/lib/utils/toast'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clipboard,
  Loader2,
  Mic,
  Sparkles,
} from '@/components/ui/icons'

type JobStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

export interface TechAIJobOption {
  id: string
  customerName: string
  serviceName: string
  scheduledStart: string
  status: string
  description: string | null
}

interface TechAIAssistantPanelProps {
  jobs: TechAIJobOption[]
  defaultJobId?: string
  embedded?: boolean
}

interface JobBriefState {
  summary: string
  firstAction: string
  risks: string[]
  checklist: string[]
  customerNotes: string[]
  source?: 'ai' | 'fallback'
}

interface NextActionState {
  title: string
  reason: string
  priority: 'low' | 'medium' | 'high'
  steps: string[]
  statusSuggestion: JobStatus | 'none'
  customerMessage: string
}

interface VoiceCopilotState {
  transcript: string
  formattedNote: string
  suggestedStatus: JobStatus | 'none'
  statusReason: string
  customerUpdate: string
}

interface AutoDocState {
  title: string
  summary: string
  workPerformed: string[]
  evidence: string[]
  invoiceBlurb: string
  followUp: string
  source?: 'ai' | 'fallback'
}

type AIFeatureKey = 'brief' | 'nextAction' | 'voiceCopilot' | 'autoDoc'

type ReadinessState = {
  enabled: boolean
  reason: string
}

const FEATURE_COOLDOWN_MS: Record<AIFeatureKey, number> = {
  brief: 15_000,
  nextAction: 12_000,
  voiceCopilot: 10_000,
  autoDoc: 20_000,
}

const STATUS_OPTIONS: JobStatus[] = [
  'scheduled',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
]

const priorityTone = (priority: NextActionState['priority']) => {
  if (priority === 'high') return 'border-red-300/40 bg-red-500/10 text-red-700 dark:text-red-300'
  if (priority === 'medium') return 'border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}

const statusLabel = (status: string) => status.replace(/_/g, ' ')

export default function TechAIAssistantPanel({
  jobs,
  defaultJobId,
  embedded = false,
}: TechAIAssistantPanelProps) {
  const [selectedJobId, setSelectedJobId] = useState(defaultJobId || jobs[0]?.id || '')
  const [jobBrief, setJobBrief] = useState<JobBriefState | null>(null)
  const [nextAction, setNextAction] = useState<NextActionState | null>(null)
  const [autoDoc, setAutoDoc] = useState<AutoDocState | null>(null)
  const [autoDocCompiledNote, setAutoDocCompiledNote] = useState('')
  const [voiceCopilot, setVoiceCopilot] = useState<VoiceCopilotState | null>(null)

  const [loadingBrief, setLoadingBrief] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [savingVoiceNote, setSavingVoiceNote] = useState(false)
  const [savingAutoDoc, setSavingAutoDoc] = useState(false)
  const [applyingStatus, setApplyingStatus] = useState(false)
  const [processingVoice, setProcessingVoice] = useState(false)
  const [cooldownsUntil, setCooldownsUntil] = useState<Record<AIFeatureKey, number>>({
    brief: 0,
    nextAction: 0,
    voiceCopilot: 0,
    autoDoc: 0,
  })
  const [cooldownTick, setCooldownTick] = useState(() => Date.now())

  const pointerIsDownRef = useRef(false)
  const ignoreClickRef = useRef(false)

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId]
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCooldownTick(Date.now())
    }, 1_000)
    return () => window.clearInterval(interval)
  }, [])

  const cooldownRemaining = (feature: AIFeatureKey) =>
    Math.max(0, Math.ceil((cooldownsUntil[feature] - cooldownTick) / 1000))

  const startCooldown = (feature: AIFeatureKey, retryAfterSeconds?: number) => {
    const durationMs = retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds * 1_000
      : FEATURE_COOLDOWN_MS[feature]

    setCooldownsUntil((current) => ({
      ...current,
      [feature]: Date.now() + durationMs,
    }))
  }

  const parseRetryAfter = (response: Response) => {
    const retryAfter = Number(response.headers.get('retry-after') || '0')
    return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0
  }

  const {
    isSupported,
    isRecording,
    recordingMs,
    error: voiceError,
    startRecording,
    stopRecording,
    clearError,
  } = useVoiceRecorder({ maxDurationMs: 75_000 })

  const recordingLabel = useMemo(() => {
    const seconds = Math.floor(recordingMs / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [recordingMs])

  useEffect(() => {
    if (!jobs.length) {
      setSelectedJobId('')
      return
    }

    if (!selectedJobId || !jobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(defaultJobId && jobs.some((job) => job.id === defaultJobId) ? defaultJobId : jobs[0].id)
    }
  }, [defaultJobId, jobs, selectedJobId])

  useEffect(() => {
    setJobBrief(null)
    setNextAction(null)
    setAutoDoc(null)
    setAutoDocCompiledNote('')
    setVoiceCopilot(null)
  }, [selectedJobId])

  const readiness = (() => {
    const noJob = { enabled: false, reason: 'Select a job first.' }

    if (!selectedJob) {
      return {
        brief: noJob,
        nextAction: noJob,
        voiceCopilot: noJob,
        autoDoc: noJob,
      } as Record<AIFeatureKey, ReadinessState>
    }

    const status = String(selectedJob.status || 'scheduled')
    const description = String(selectedJob.description || '').trim()
    const hasDescription = description.length >= 12

    const briefCooldown = cooldownRemaining('brief')
    const nextActionCooldown = cooldownRemaining('nextAction')
    const voiceCooldown = cooldownRemaining('voiceCopilot')
    const autoDocCooldown = cooldownRemaining('autoDoc')

    const brief: ReadinessState =
      status === 'cancelled'
        ? { enabled: false, reason: 'Job is cancelled.' }
        : !hasDescription
          ? { enabled: false, reason: 'Add a clearer job description before generating a brief.' }
          : briefCooldown > 0
            ? { enabled: false, reason: `Wait ${briefCooldown}s before running again.` }
            : { enabled: true, reason: 'Ready' }

    const nextAction: ReadinessState =
      status === 'completed' || status === 'cancelled'
        ? { enabled: false, reason: 'Next action is only available for active jobs.' }
        : nextActionCooldown > 0
          ? { enabled: false, reason: `Wait ${nextActionCooldown}s before running again.` }
          : { enabled: true, reason: 'Ready' }

    const voiceCopilot: ReadinessState =
      status === 'cancelled'
        ? { enabled: false, reason: 'Voice copilot is unavailable for cancelled jobs.' }
        : !isSupported
          ? { enabled: false, reason: 'Microphone permission/support is required.' }
          : voiceCooldown > 0
            ? { enabled: false, reason: `Wait ${voiceCooldown}s before recording again.` }
            : { enabled: true, reason: 'Ready' }

    const autoDoc: ReadinessState =
      status !== 'in_progress' && status !== 'completed'
        ? { enabled: false, reason: 'Move job to In Progress (or Completed) first.' }
        : autoDocCooldown > 0
          ? { enabled: false, reason: `Wait ${autoDocCooldown}s before running again.` }
          : { enabled: true, reason: 'Ready' }

    return { brief, nextAction, voiceCopilot, autoDoc }
  })()

  const runJobBrief = async () => {
    if (!selectedJobId) return
    if (!readiness.brief.enabled) {
      showToast.error(readiness.brief.reason)
      return
    }
    startCooldown('brief')
    setLoadingBrief(true)
    try {
      const response = await fetch('/api/ai/job-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      })
      const data = await response.json()
      if (response.status === 429) {
        startCooldown('brief', parseRetryAfter(response))
      }
      if (!response.ok) throw new Error(data.error || 'Failed to generate AI job brief')
      setJobBrief(data.brief as JobBriefState)
    } catch (error) {
      console.error('AI job brief error:', error)
      showToast.error(error instanceof Error ? error.message : 'Job brief failed')
    } finally {
      setLoadingBrief(false)
    }
  }

  const runNextAction = async () => {
    if (!selectedJobId) return
    if (!readiness.nextAction.enabled) {
      showToast.error(readiness.nextAction.reason)
      return
    }
    startCooldown('nextAction')
    setLoadingAction(true)
    try {
      const response = await fetch('/api/ai/next-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      })
      const data = await response.json()
      if (response.status === 429) {
        startCooldown('nextAction', parseRetryAfter(response))
      }
      if (!response.ok) throw new Error(data.error || 'Failed to generate next action')
      setNextAction(data.action as NextActionState)
    } catch (error) {
      console.error('AI next action error:', error)
      showToast.error(error instanceof Error ? error.message : 'Next action failed')
    } finally {
      setLoadingAction(false)
    }
  }

  const runAutoDocumentation = async () => {
    if (!selectedJobId) return
    if (!readiness.autoDoc.enabled) {
      showToast.error(readiness.autoDoc.reason)
      return
    }
    startCooldown('autoDoc')
    setLoadingDoc(true)
    try {
      const response = await fetch('/api/ai/auto-documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      })
      const data = await response.json()
      if (response.status === 429) {
        startCooldown('autoDoc', parseRetryAfter(response))
      }
      if (!response.ok) throw new Error(data.error || 'Failed to generate documentation')
      setAutoDoc(data.documentation as AutoDocState)
      setAutoDocCompiledNote(String(data.compiledNote || '').trim())
    } catch (error) {
      console.error('AI auto documentation error:', error)
      showToast.error(error instanceof Error ? error.message : 'Auto documentation failed')
    } finally {
      setLoadingDoc(false)
    }
  }

  const saveNoteToJob = async (content: string, isVisibleToCustomer = false) => {
    if (!selectedJobId || !content.trim()) return
    const response = await fetch(`/api/jobs/${selectedJobId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.trim(),
        is_visible_to_customer: isVisibleToCustomer,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save note')
    }
  }

  const saveVoiceNote = async () => {
    if (!voiceCopilot?.formattedNote) return
    setSavingVoiceNote(true)
    try {
      await saveNoteToJob(voiceCopilot.formattedNote, false)
      showToast.success('Voice copilot note saved.')
    } catch (error) {
      console.error('Voice note save error:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to save voice note')
    } finally {
      setSavingVoiceNote(false)
    }
  }

  const saveAutoDocumentation = async () => {
    if (!autoDocCompiledNote) return
    setSavingAutoDoc(true)
    try {
      await saveNoteToJob(autoDocCompiledNote, false)
      showToast.success('Auto documentation saved to job notes.')
    } catch (error) {
      console.error('Auto documentation save error:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to save auto documentation')
    } finally {
      setSavingAutoDoc(false)
    }
  }

  const applySuggestedStatus = async () => {
    if (!selectedJobId || !voiceCopilot?.suggestedStatus || voiceCopilot.suggestedStatus === 'none') return
    if (!STATUS_OPTIONS.includes(voiceCopilot.suggestedStatus)) return
    setApplyingStatus(true)
    try {
      const response = await fetch('/api/jobs/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          status: voiceCopilot.suggestedStatus,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to apply status')
      showToast.success(`Status updated to ${voiceCopilot.suggestedStatus.replace(/_/g, ' ')}.`)
    } catch (error) {
      console.error('Status apply error:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to apply status')
    } finally {
      setApplyingStatus(false)
    }
  }

  const copyCustomerUpdate = async () => {
    if (!voiceCopilot?.customerUpdate) return
    try {
      await navigator.clipboard.writeText(voiceCopilot.customerUpdate)
      showToast.success('Customer update copied.')
    } catch {
      showToast.error('Failed to copy message.')
    }
  }

  const processVoiceBlob = async (blob: Blob | null) => {
    if (!blob || blob.size === 0 || !selectedJobId) {
      showToast.error('No audio captured. Hold to record and try again.')
      return
    }

    if (!readiness.voiceCopilot.enabled) {
      showToast.error(readiness.voiceCopilot.reason)
      return
    }

    startCooldown('voiceCopilot')
    setProcessingVoice(true)
    clearError()
    try {
      const formData = new FormData()
      const file = new File([blob], `voice-copilot-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      })
      formData.append('audio', file)
      formData.append('jobId', selectedJobId)

      const response = await fetch('/api/ai/voice-copilot', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.status === 429) {
        startCooldown('voiceCopilot', parseRetryAfter(response))
      }
      if (!response.ok) throw new Error(data.error || 'Voice copilot failed')

      setVoiceCopilot({
        transcript: String(data.transcript || '').trim(),
        formattedNote: String(data.formattedNote || '').trim(),
        suggestedStatus: data.suggestedStatus || 'none',
        statusReason: String(data.statusReason || '').trim(),
        customerUpdate: String(data.customerUpdate || '').trim(),
      })
      showToast.success('Voice copilot response ready.')
    } catch (error) {
      console.error('Voice copilot process error:', error)
      showToast.error(error instanceof Error ? error.message : 'Voice copilot failed')
    } finally {
      setProcessingVoice(false)
    }
  }

  const beginHoldRecording = async () => {
    if (!readiness.voiceCopilot.enabled) {
      showToast.error(readiness.voiceCopilot.reason)
      return
    }
    pointerIsDownRef.current = true
    const started = await startRecording()
    if (!started) {
      pointerIsDownRef.current = false
    }
  }

  const endHoldRecording = async () => {
    if (!pointerIsDownRef.current || !isRecording) return
    pointerIsDownRef.current = false
    const blob = await stopRecording()
    await processVoiceBlob(blob)
  }

  const fallbackTapRecord = async () => {
    if (processingVoice) return
    if (!readiness.voiceCopilot.enabled) {
      showToast.error(readiness.voiceCopilot.reason)
      return
    }
    if (!isRecording) {
      const started = await startRecording()
      if (started) pointerIsDownRef.current = true
      return
    }
    pointerIsDownRef.current = false
    const blob = await stopRecording()
    await processVoiceBlob(blob)
  }

  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">AI Copilot</p>
        <p className="mt-2 font-sans text-sm text-slate-600 dark:text-slate-300">
          No jobs available for AI assistance.
        </p>
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-4' : 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl uppercase tracking-[0.1em] text-slate-900 dark:text-slate-100">
            AI Copilot
          </p>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
            Job brief, next action, voice assist, and auto documentation.
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <label className="sr-only" htmlFor="ai-job-picker">
            Select job
          </label>
          <select
            id="ai-job-picker"
            value={selectedJobId}
            onChange={(event) => setSelectedJobId(event.target.value)}
            className="w-full min-w-0 rounded-full border border-slate-200 bg-white px-3 py-2 font-sans text-xs font-medium text-slate-700 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.customerName} - {job.serviceName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedJob ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="truncate font-sans text-sm font-semibold text-slate-800 dark:text-slate-200">
            {selectedJob.customerName} - {selectedJob.serviceName}
          </p>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            {statusLabel(selectedJob.status)} - {new Date(selectedJob.scheduledStart).toLocaleString()}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">1. AI Job Brief</p>
            <button
              type="button"
              onClick={() => void runJobBrief()}
              disabled={loadingBrief || !readiness.brief.enabled}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loadingBrief ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </button>
          </div>
          <p className={`mb-2 font-sans text-[11px] ${readiness.brief.enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {readiness.brief.enabled ? 'Requirements met' : readiness.brief.reason}
          </p>

          {jobBrief ? (
            <div className="space-y-2">
              <p className="font-sans text-xs text-slate-700 dark:text-slate-200">{jobBrief.summary}</p>
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">First Action</p>
                <p className="mt-1 font-sans text-xs text-cyan-800 dark:text-cyan-100">{jobBrief.firstAction}</p>
              </div>
              <ListBlock title="Risks" items={jobBrief.risks} />
              <ListBlock title="Checklist" items={jobBrief.checklist} />
            </div>
          ) : (
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
              Generate a focused pre-job brief for this assignment.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">2. Next Best Action</p>
            <button
              type="button"
              onClick={() => void runNextAction()}
              disabled={loadingAction || !readiness.nextAction.enabled}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Run
            </button>
          </div>
          <p className={`mb-2 font-sans text-[11px] ${readiness.nextAction.enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {readiness.nextAction.enabled ? 'Requirements met' : readiness.nextAction.reason}
          </p>

          {nextAction ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-sans text-sm font-semibold text-slate-800 dark:text-slate-100">{nextAction.title}</p>
                <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${priorityTone(nextAction.priority)}`}>
                  {nextAction.priority}
                </span>
              </div>
              <p className="font-sans text-xs text-slate-600 dark:text-slate-300">{nextAction.reason}</p>
              <ListBlock title="Steps" items={nextAction.steps} />
              {nextAction.customerMessage ? (
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Customer Update</p>
                  <p className="mt-1 font-sans text-xs text-emerald-900 dark:text-emerald-100">{nextAction.customerMessage}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
              Get the highest-impact next move based on live job context.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">4. Voice Copilot</p>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {isRecording
              ? `Recording ${recordingLabel}`
              : processingVoice
                ? 'Processing...'
                : readiness.voiceCopilot.enabled
                  ? 'Ready'
                  : readiness.voiceCopilot.reason}
          </span>
        </div>

        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault()
            ignoreClickRef.current = true
            void beginHoldRecording()
          }}
          onPointerUp={(event) => {
            event.preventDefault()
            ignoreClickRef.current = true
            void endHoldRecording()
          }}
          onPointerCancel={() => {
            pointerIsDownRef.current = false
            ignoreClickRef.current = true
          }}
          onClick={() => {
            if (ignoreClickRef.current) {
              ignoreClickRef.current = false
              return
            }
            void fallbackTapRecord()
          }}
          disabled={!readiness.voiceCopilot.enabled || processingVoice}
          className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border px-4 py-3 font-sans text-sm font-semibold transition ${
            isRecording
              ? 'border-red-300/50 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          } disabled:opacity-50`}
        >
          {processingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
          {isRecording ? 'Release to Process Voice' : processingVoice ? 'Generating...' : 'Hold to Speak'}
        </button>

        {voiceError ? (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{voiceError}</p>
          </div>
        ) : null}

        {voiceCopilot ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Formatted Note</p>
              <p className="mt-1 whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-200">
                {voiceCopilot.formattedNote}
              </p>
            </div>

            {voiceCopilot.suggestedStatus !== 'none' ? (
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">Suggested Status</p>
                <p className="mt-1 font-sans text-xs text-cyan-900 dark:text-cyan-100">
                  {voiceCopilot.suggestedStatus.replace(/_/g, ' ')}{voiceCopilot.statusReason ? ` - ${voiceCopilot.statusReason}` : ''}
                </p>
              </div>
            ) : null}

            {voiceCopilot.customerUpdate ? (
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Customer Update Draft</p>
                  <button
                    type="button"
                    onClick={() => void copyCustomerUpdate()}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    <Clipboard className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <p className="font-sans text-xs text-emerald-900 dark:text-emerald-100">{voiceCopilot.customerUpdate}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void saveVoiceNote()}
                disabled={savingVoiceNote}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {savingVoiceNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Note
              </button>
              <button
                type="button"
                onClick={() => void applySuggestedStatus()}
                disabled={applyingStatus || voiceCopilot.suggestedStatus === 'none'}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-cyan-800 transition-colors hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-200"
              >
                {applyingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Apply Status
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 font-sans text-xs text-slate-500 dark:text-slate-400">
            Speak naturally. AI will return structured notes and status recommendation.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">5. Auto Documentation</p>
          <button
            type="button"
            onClick={() => void runAutoDocumentation()}
            disabled={loadingDoc || !readiness.autoDoc.enabled}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {loadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate
          </button>
        </div>
        <p className={`mb-2 font-sans text-[11px] ${readiness.autoDoc.enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {readiness.autoDoc.enabled ? 'Requirements met' : readiness.autoDoc.reason}
        </p>

        {autoDoc ? (
          <div className="space-y-2">
            <p className="font-sans text-sm font-semibold text-slate-800 dark:text-slate-100">{autoDoc.title}</p>
            <p className="font-sans text-xs text-slate-600 dark:text-slate-300">{autoDoc.summary}</p>
            <ListBlock title="Work Performed" items={autoDoc.workPerformed} />
            <ListBlock title="Evidence" items={autoDoc.evidence} />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Invoice Blurb</p>
              <p className="mt-1 font-sans text-xs text-slate-700 dark:text-slate-200">{autoDoc.invoiceBlurb}</p>
            </div>
            <button
              type="button"
              onClick={() => void saveAutoDocumentation()}
              disabled={savingAutoDoc || !autoDocCompiledNote}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {savingAutoDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save to Job Notes
            </button>
          </div>
        ) : (
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
            Build invoice-ready completion documentation from notes, media, and job metadata.
          </p>
        )}
      </section>
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="font-sans text-xs text-slate-700 dark:text-slate-200">
            - {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
