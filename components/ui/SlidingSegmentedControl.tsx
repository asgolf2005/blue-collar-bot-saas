'use client'

type SegmentedOption<T extends string> = {
  value: T
  label: string
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

interface SlidingSegmentedControlProps<T extends string> {
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  groupClassName?: string
  indicatorClassName?: string
  buttonBaseClassName?: string
  activeClassName?: string
  inactiveClassName?: string
}

export function SlidingSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  groupClassName = '',
  indicatorClassName = '',
  buttonBaseClassName = '',
  activeClassName = '',
  inactiveClassName = '',
}: SlidingSegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )
  const count = Math.max(options.length, 1)

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('relative inline-grid min-w-0', groupClassName)}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-0 left-0 rounded-full transition-transform duration-300 ease-out', indicatorClassName)}
        style={{
          width: `${100 / count}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(buttonBaseClassName, active ? activeClassName : inactiveClassName)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
