export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-44 rounded-3xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-24 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 animate-pulse" />
        <div className="h-24 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 animate-pulse" />
        <div className="h-24 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 animate-pulse" />
        <div className="h-24 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 animate-pulse" />
      </div>
    </div>
  )
}
