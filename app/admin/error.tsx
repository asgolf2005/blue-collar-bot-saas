'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin route error:', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4">
      <div className="w-full rounded-3xl border border-rose-200/70 bg-white/90 p-8 shadow-sm dark:border-rose-500/30 dark:bg-slate-900/85">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
          Admin runtime error
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-slate-900 dark:text-slate-100">
          Something Went Wrong
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          A dashboard module failed to load. Retry this route or return to operations.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
          >
            Retry
          </button>
          <Link
            href="/admin"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back To Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
