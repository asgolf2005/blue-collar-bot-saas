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
  phone,
  address,
}: {
  jobId: string
  phone: string | null
  address: string | null
}) {
  const mapHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
      <div className={cx('grid grid-cols-3', (!phone || !mapHref) && 'grid-cols-2', 'divide-x divide-slate-200 dark:divide-slate-800')}>
        <Link
          href={`/tech/jobs/${jobId}`}
          className="group/action relative inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-90 transition-opacity group-hover/action:opacity-100" />
          <span className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
          <span className="relative uppercase tracking-[0.14em]">Open</span>
        </Link>

        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            Call
          </a>
        ) : null}

        {mapHref ? (
          <a
            href={mapHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            Route
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default function DispatchJobCard({ job }: { job: DispatchJob }) {
  const start = new Date(job.scheduled_start)
  const end = job.scheduled_end ? new Date(job.scheduled_end) : null
  const dot = statusDot[job.status] || statusDot.scheduled
  const glow = statusGlow[job.status] || statusGlow.scheduled

  return (
    <div
      className={cx(
        'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900',
        'hover:border-slate-300 dark:hover:border-slate-700'
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_46%)] dark:opacity-80 dark:[background:radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_46%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(to_right,rgba(15,23,42,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.07)_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-15 dark:[background:linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)]" />

      <div className="relative flex gap-4">
        <TimeStack start={start} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx('h-2.5 w-2.5 rounded-full', dot, glow)} aria-hidden="true" />
            <p className="min-w-0 truncate text-base font-semibold text-slate-900 dark:text-white">{job.customer.name}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {formatStatusLabel(job.status)}
            </p>
          </div>

          <Link href={`/tech/jobs/${job.id}`} className="mt-1 block">
            <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
              {job.description || job.service.name}
            </p>
          </Link>

          <MetaLine scheduledStart={start} scheduledEnd={end} address={job.customer.address} totalCost={job.total_cost} />
          <ActionStrip jobId={job.id} phone={job.customer.phone} address={job.customer.address} />
        </div>
      </div>
    </div>
  )
}
