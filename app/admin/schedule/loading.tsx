export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-52 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-[500px] rounded-lg bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  )
}
