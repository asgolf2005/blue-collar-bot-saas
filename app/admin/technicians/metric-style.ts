export type MetricStyleKey = 'balanced'

export type MetricStyleOption = {
  key: MetricStyleKey
  label: string
}

export type MetricStyleTokens = {
  statCard: string
  statIconChip: string
  statIcon: string
  statLabel: string
  statValue: string
  track: string
  utilizationBar: string
  highlightCard: string
  highlightLabel: string
  highlightValue: string
  highlightSubtext: string
  collectionBar: string
  completionBar: string
  compactCard: string
  compactLabel: string
  compactValue: string
}

export const METRIC_STYLE_OPTIONS: MetricStyleOption[] = [
  { key: 'balanced', label: 'Balanced' },
]

// Muted, non-neon color scheme matching admin style
export const METRIC_STYLE_TOKENS: Record<MetricStyleKey, MetricStyleTokens> = {
  balanced: {
    statCard:
      'admin-card p-4 h-[100px] flex flex-col justify-between',
    statIconChip:
      'inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80',
    statIcon: 'text-slate-500 dark:text-slate-400',
    statLabel: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    statValue: 'font-display text-2xl font-semibold text-slate-900 dark:text-white',
    track: 'h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden',
    utilizationBar: 'h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500',
    highlightCard:
      'admin-card p-4',
    highlightLabel:
      'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400',
    highlightValue: 'font-display text-3xl font-semibold text-slate-900 dark:text-white',
    highlightSubtext: 'mt-1 text-xs text-slate-600 dark:text-slate-300',
    collectionBar:
      'h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500',
    completionBar:
      'h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500',
    compactCard: 'rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3',
    compactLabel: 'font-sans text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400',
    compactValue: 'font-display text-lg font-semibold text-slate-900 dark:text-white',
  },
}

export function resolveMetricStyle(_rawStyle?: string | string[]): MetricStyleKey {
  return 'balanced'
}
