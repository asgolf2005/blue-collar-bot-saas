'use client'

import Link from 'next/link'
import { format } from 'date-fns'

type DispatchJob = {
  id: string
  scheduled_start: string
  scheduled_end: string | null
  status: string
  description: string | null
  total_cost: number | null
  customer: {
    name: string
    phone: string | null
    address: string | null
  }
  service: {
    name: string
  }
}

const statusDot: Record<string, string> = {
  scheduled: 'bg-blue-500',
  on_the_way: 'bg-cyan-500',
  arrived: 'bg-violet-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-slate-400 dark:bg-slate-500',
}

const statusGlow: Record<string, string> = {
  scheduled: 'shadow-[0_0_22px_rgba(59,130,246,0.35)]',
  on_the_way: 'shadow-[0_0_22px_rgba(34,211,238,0.35)]',
  arrived: 'shadow-[0_0_22px_rgba(139,92,246,0.35)]',
  in_progress: 'shadow-[0_0_22px_rgba(251,191,36,0.35)]',
  completed: 'shadow-[0_0_22px_rgba(52,211,153,0.35)]',
  cancelled: 'shadow-[0_0_18px_rgba(148,163,184,0.25)]',
}

const workflowTone: Record<string, string> = {
  scheduled:
    'bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-slate-950',
  on_the_way:
    'bg-cyan-600 text-white hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950',
  arrived:
    'bg-violet-600 text-white hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400 dark:text-slate-950',
  in_progress:
    'bg-amber-500 text-slate-950 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950',
  completed:
    'bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950',
  cancelled:
    'bg-slate-500 text-white hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-100',
}

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

function TimeStack({ start }: { start: Date }) {
  const time = format(start, 'h:mm')
  const meridiem = format(start, 'a')
  return (
    <div className="w-16 shrink-0 pt-0.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Start</p>
      <p className="mt-1 font-display-soft text-3xl leading-none text-slate-900 dark:text-white">{time}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{meridiem}</p>
    </div>
  )
}

function MetaLine({
  scheduledStart,
  scheduledEnd,
  address,
  totalCost,
}: {
  scheduledStart: Date
  scheduledEnd: Date | null
  address: string | null
  totalCost: number | null
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      <span className="inline-flex items-center gap-1">
        {scheduledEnd
          ? `${format(scheduledStart, 'h:mm a')} - ${format(scheduledEnd, 'h:mm a')}`
          : format(scheduledStart, 'h:mm a')}
      </span>
      {address ? (
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate">{address}</span>
        </span>
      ) : null}
      {typeof totalCost === 'number' ? (
        <span className="font-semibold text-emerald-700 dark:text-emerald-300">${Number(totalCost).toFixed(0)}</span>
      ) : null}
    </div>
  )
}

function ActionStrip({
  jobId,
  status,
  phone,
  address,
}: {
  jobId: string
  status: string
  phone: string | null
  address: string | null
}) {
  const mapHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null
  const workflowToneClass = workflowTone[status] || workflowTone.scheduled

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
      <div className={cx('grid grid-cols-1 gap-1.5', (!phone || !mapHref) && 'grid-cols-1')}>
        <Link
          href={`/tech/jobs/${jobId}`}
          className={cx(
            'group/action relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3.5 text-xs font-semibold shadow-sm transition-all',
            workflowToneClass
          )}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 opacity-0 transition-opacity group-hover/action:opacity-100" />
          <span className="relative font-mono uppercase tracking-[0.14em]">Open Job Workflow</span>
        </Link>
        <div className="grid grid-cols-2 gap-1.5">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 backdrop-blur transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Call Customer
            </a>
          ) : null}

          {mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 backdrop-blur transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Get Directions
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function DispatchJobCard({ job }: { job: DispatchJob }) {
  const start = new Date(job.scheduled_start)
  const end = job.scheduled_end ? new Date(job.scheduled_end) : null
  const dot = statusDot[job.status] || statusDot.scheduled
  const glow = statusGlow[job.status] || statusGlow.scheduled

  const isActive = job.status === 'on_the_way' || job.status === 'in_progress' || job.status === 'arrived'

  return (
    <div
      className={cx(
        'group relative -mx-3 overflow-hidden border-y border-slate-200/50 px-3 py-4 transition-all dark:border-slate-800/50',
        isActive
          ? 'bg-slate-50/80 dark:bg-slate-900/40'
          : 'bg-transparent'
      )}
    >
      {isActive ? (
        <div
          className={cx(
            "pointer-events-none absolute inset-0 opacity-20 blur-2xl",
            job.status === 'on_the_way' && "bg-cyan-500",
            job.status === 'in_progress' && "bg-amber-500",
            job.status === 'arrived' && "bg-violet-500"
          )}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:20px_20px] dark:opacity-10 dark:[background:linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)]" />

      <div className="relative flex gap-3">
        <TimeStack start={start} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx('h-2 w-2 rounded-full', dot, glow)} aria-hidden="true" />
            <p className="min-w-0 truncate font-display-soft text-lg font-semibold text-slate-900 dark:text-white leading-none">{job.customer.name}</p>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {formatStatusLabel(job.status)}
          </p>

          <Link href={`/tech/jobs/${job.id}`} className="mt-2 block">
            <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
              {job.description || job.service.name}
            </p>
          </Link>

          <MetaLine scheduledStart={start} scheduledEnd={end} address={job.customer.address} totalCost={job.total_cost} />
          <ActionStrip jobId={job.id} status={job.status} phone={job.customer.phone} address={job.customer.address} />
        </div>
      </div>
    </div>
  )
}
