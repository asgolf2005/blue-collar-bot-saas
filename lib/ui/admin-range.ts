import { cn } from '@/lib/utils/cn'

export const ADMIN_RANGE_TRACK_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900'

export const ADMIN_RANGE_ITEM_BASE_CLASS =
  'rounded-full px-3 py-1.5 font-sans text-xs font-semibold transition-colors'

export function adminRangeItemClass(active: boolean): string {
  return cn(
    ADMIN_RANGE_ITEM_BASE_CLASS,
    active
      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.35)] dark:bg-cyan-400 dark:text-slate-950'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  )
}

