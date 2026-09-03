import { shiftISO, todayISO, weekdayOf } from '@/lib/date'
import type { HabitRow } from '@/lib/supabase'

/**
 * Four weeks — long enough that one missed day is a few percent rather than a
 * verdict, short enough that a habit you've turned around this month reads as
 * turned around. There is deliberately no streak here: nothing in this file
 * resets to zero.
 */
export const WINDOW_DAYS = 28

/** Is this habit meant to happen on this date? A 'weekly' habit picks its own days, so every day qualifies. */
export function isDueOn(habit: HabitRow, iso: string): boolean {
  if (habit.recurrence === 'days') return habit.days.includes(weekdayOf(iso))
  return true
}

/**
 * The dates we judge a habit over: the last WINDOW_DAYS, oldest first, never
 * reaching back before the habit existed — a habit created yesterday is not
 * "4% consistent".
 */
export function windowDates(habit: HabitRow, today = todayISO()): string[] {
  const startedOn = habit.created_at.slice(0, 10)
  const dates: string[] = []
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const iso = shiftISO(today, -i)
    if (iso >= startedOn) dates.push(iso)
  }
  return dates
}

/**
 * A habit's first week isn't evidence of anything. Below this much history we
 * report no percentage at all rather than a 0% that reads as a verdict on
 * someone who started yesterday.
 */
const SETTLING_IN_DAYS = 7

export type Consistency = {
  /** 0-100, or null while there's nothing meaningful to measure yet. */
  pct: number | null
  done: number
  expected: number
}

/**
 * Kept days over due days across the window. For a 'weekly' habit ("3 times a
 * week") the window is scored week by week, capped at the target, so doing all
 * three on Monday counts as a full week rather than three days of overshoot.
 */
export function consistency(habit: HabitRow, doneOn: Set<string>, today = todayISO()): Consistency {
  const dates = windowDates(habit, today)
  const settlingIn = dates.length < SETTLING_IN_DAYS

  if (habit.recurrence === 'weekly') {
    let done = 0
    let expected = 0
    // Chunked backwards from today so the current, partial week is the last
    // group — its target scales down with how many of its days we've seen.
    for (let start = dates.length; start > 0; start -= 7) {
      const week = dates.slice(Math.max(0, start - 7), start)
      const target = Math.min(habit.target_per_week, week.length)
      const kept = week.filter((d) => doneOn.has(d)).length
      expected += target
      done += Math.min(kept, target)
    }
    return { pct: settlingIn || expected === 0 ? null : Math.round((done / expected) * 100), done, expected }
  }

  const due = dates.filter((d) => isDueOn(habit, d))
  const done = due.filter((d) => doneOn.has(d)).length
  return {
    pct: settlingIn || due.length === 0 ? null : Math.round((done / due.length) * 100),
    done,
    expected: due.length,
  }
}

/** Check-ins in the current Sunday-to-today week — what a 'weekly' habit shows instead of a percentage. */
export function keptThisWeek(doneOn: Set<string>, today = todayISO()): number {
  const back = weekdayOf(today)
  let n = 0
  for (let i = 0; i <= back; i++) if (doneOn.has(shiftISO(today, -i))) n++
  return n
}

export function scheduleLabel(habit: HabitRow): string {
  if (habit.recurrence === 'daily') return 'Every day'
  if (habit.recurrence === 'weekly') return `${habit.target_per_week}× a week`
  if (habit.days.length === 0) return 'No days picked'
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return [...habit.days].sort((a, b) => a - b).map((d) => names[d]).join(' · ')
}
