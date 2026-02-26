export type ControlPreset = 'option1' | 'option2' | 'option3'

type ControlPresetClasses = {
  segmentedGroup: string
  segmentedIndicator: string
  segmentedBase: string
  segmentedActive: string
  segmentedInactive: string
  countBadge: string
  singleAction: string
  previewAction: string
  commitAction: string
}

export function resolveControlPreset(value?: string | string[]): ControlPreset {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === '2' || raw === 'option2') return 'option2'
  if (raw === '3' || raw === 'option3') return 'option3'
  return 'option1'
}

export const CONTROL_PRESET_LABELS: Record<ControlPreset, string> = {
  option1: 'Neon Pill',
  option2: 'Glass Pill',
  option3: 'Graphite Contrast',
}

export const controlPresetClasses: Record<ControlPreset, ControlPresetClasses> = {
  option1: {
    segmentedGroup:
      'overflow-hidden rounded-full border border-slate-300 bg-white shadow-sm dark:!border-slate-600 dark:!bg-slate-900',
    segmentedIndicator:
      'bg-cyan-500 text-white shadow-[0_0_18px_rgba(34,211,238,0.22)] dark:bg-cyan-400 dark:text-slate-950',
    segmentedBase:
      'relative z-10 px-4 py-1.5 text-xs font-sans font-semibold uppercase tracking-wide transition-colors',
    segmentedActive:
      'text-white dark:text-slate-950',
    segmentedInactive:
      'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 dark:text-cyan-100/80 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100',
    countBadge:
      'inline-flex items-center rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300',
    singleAction:
      '!rounded-full !bg-cyan-500 !text-white !border !border-cyan-400/70 hover:!bg-cyan-400 hover:!shadow-[0_0_18px_rgba(34,211,238,0.26)] dark:!bg-cyan-400 dark:!text-slate-950 dark:!border-cyan-300/70',
    previewAction:
      '!rounded-full !border !border-cyan-300/80 !bg-white !text-cyan-700 hover:!bg-cyan-50 hover:!text-cyan-800 dark:!border-cyan-400/40 dark:!bg-slate-950/80 dark:!text-cyan-200 dark:hover:!bg-cyan-400/10 dark:hover:!text-cyan-100 dark:hover:!shadow-[0_0_14px_rgba(34,211,238,0.2)]',
    commitAction:
      '!rounded-full !border !border-emerald-500/70 !bg-emerald-500 !text-white hover:!bg-emerald-400 hover:!shadow-[0_0_18px_rgba(52,211,153,0.24)] dark:!border-emerald-400/70 dark:!bg-emerald-400 dark:!text-slate-950',
  },
  option2: {
    segmentedGroup:
      'overflow-hidden rounded-full border border-slate-300/70 bg-white/85 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80',
    segmentedIndicator: 'bg-white shadow-sm dark:bg-slate-700',
    segmentedBase:
      'relative z-10 px-4 py-1.5 text-xs font-sans font-semibold uppercase tracking-wide transition-colors',
    segmentedActive: 'text-slate-900 dark:text-slate-100',
    segmentedInactive: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    countBadge:
      'inline-flex items-center rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
    singleAction:
      '!rounded-full !bg-slate-900 !text-white !border !border-slate-800 hover:!bg-slate-800 dark:!bg-slate-100 dark:!text-slate-900 dark:!border-slate-200 dark:hover:!bg-white',
    previewAction:
      '!rounded-full !border !border-slate-300 !bg-white/80 !text-slate-700 hover:!bg-slate-100 dark:!border-slate-700 dark:!bg-slate-900/70 dark:!text-slate-200 dark:hover:!bg-slate-800',
    commitAction:
      '!rounded-full !bg-slate-900 !text-white !border !border-slate-800 hover:!bg-slate-800 dark:!bg-slate-100 dark:!text-slate-900 dark:!border-slate-200 dark:hover:!bg-white',
  },
  option3: {
    segmentedGroup:
      'overflow-hidden rounded-full border border-slate-600 bg-slate-900',
    segmentedIndicator: 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.35)]',
    segmentedBase:
      'relative z-10 px-4 py-1.5 text-xs font-sans font-semibold uppercase tracking-wide transition-colors',
    segmentedActive: 'text-white',
    segmentedInactive: 'text-slate-300 hover:bg-slate-800 hover:text-slate-100',
    countBadge:
      'inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-rose-300',
    singleAction:
      '!rounded-full !bg-rose-500 !text-white !border !border-rose-400/70 hover:!bg-rose-400 hover:!shadow-[0_0_18px_rgba(244,63,94,0.35)]',
    previewAction:
      '!rounded-full !border !border-slate-600 !bg-slate-900 !text-slate-200 hover:!bg-slate-800 hover:!text-white',
    commitAction:
      '!rounded-full !bg-rose-500 !text-white !border !border-rose-400/70 hover:!bg-rose-400 hover:!shadow-[0_0_18px_rgba(244,63,94,0.35)]',
  },
}
