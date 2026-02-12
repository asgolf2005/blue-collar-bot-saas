export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-2 h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-9 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
