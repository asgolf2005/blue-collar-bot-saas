export type Rating = 1 | 2 | 3 | 4 // 1=Again, 2=Hard, 3=Good, 4=Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export interface CardSchedule {
  state: CardState
  interval: number       // days
  ease_factor: number    // e.g. 2.50
  due_date: string       // ISO date string YYYY-MM-DD
  reps: number
  lapses: number
  last_reviewed_at: string
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function scheduleCard(card: CardSchedule, rating: Rating): CardSchedule {
  let { interval, ease_factor, reps, lapses, state } = card

  const MIN_EASE = 1.3
  const MAX_EASE = 2.5

  // Again — reset
  if (rating === 1) {
    lapses++
    interval = 1
    ease_factor = Math.max(MIN_EASE, ease_factor - 0.20)
    const nextState: CardState = state === 'new' ? 'learning' : 'relearning'
    return { state: nextState, interval, ease_factor, due_date: addDays(1), reps, lapses, last_reviewed_at: new Date().toISOString() }
  }

  // First two reps use fixed intervals regardless of ease
  if (reps === 0) {
    interval = 1
  } else if (reps === 1) {
    interval = 6
  } else {
    const multiplier =
      rating === 2 ? 1.2 :
      rating === 3 ? ease_factor :
      ease_factor * 1.3  // Easy

    interval = Math.max(1, Math.round(interval * multiplier))
  }

  if (rating === 2) ease_factor = Math.max(MIN_EASE, ease_factor - 0.15)
  if (rating === 4) ease_factor = Math.min(MAX_EASE, ease_factor + 0.15)

  reps++

  return {
    state: 'review',
    interval,
    ease_factor: Math.round(ease_factor * 100) / 100,
    due_date: addDays(interval),
    reps,
    lapses,
    last_reviewed_at: new Date().toISOString(),
  }
}

export function getDefaultSchedule(): Omit<CardSchedule, 'last_reviewed_at'> & { last_reviewed_at: null } {
  return {
    state: 'new',
    interval: 0,
    ease_factor: 2.50,
    due_date: today(),
    reps: 0,
    lapses: 0,
    last_reviewed_at: null,
  }
}
