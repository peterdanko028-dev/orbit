import { todayISO } from '@/lib/date'
import type { HabitRow } from '@/lib/supabase'
import { consistency, isDueOn, keptThisWeek, scheduleLabel, windowDates } from './consistency'

const STRIP_DAYS = 12

/**
 * One habit: a big check-in target, its cue, and how it's been going.
 *
 * What's deliberately absent — a streak number, a red miss, an exclamation.
 * The strip below shows the last two weeks as plain dots; a day you skipped is
 * an empty outline, the same weight as any other, because the point is to see
 * the pattern rather than to feel caught.
 */
export function HabitCard({
  habit,
  doneOn,
  anchorLabel,
  onToggle,
  onOpen,
}: {
  habit: HabitRow
  doneOn: Set<string>
  /** "before Training" / "after Math" — precomputed by the page from its blocks list. */
  anchorLabel?: string
  onToggle: () => void
  onOpen: () => void
}) {
  const today = todayISO()
  const checked = doneOn.has(today)
  const dueToday = isDueOn(habit, today)
  const score = consistency(habit, doneOn, today)
  const strip = windowDates(habit, today).slice(-STRIP_DAYS)

  const summary =
    habit.recurrence === 'weekly'
      ? `${keptThisWeek(doneOn, today)} of ${habit.target_per_week} this week`
      : score.pct === null
        ? 'Just started'
        : `${score.pct}% · 4 weeks`

  return (
    <div
      className="flex items-center gap-4 rounded-2xl border px-4 py-3.5"
      style={{ borderColor: 'var(--line)', background: 'var(--bg-raised)' }}
    >
      <button
        onClick={onToggle}
        aria-label={checked ? `Undo check-in for ${habit.title}` : `Check in: ${habit.title}`}
        aria-pressed={checked}
        className="flex h-14 w-14 flex-none items-center justify-center rounded-full border-2 text-xl transition-colors"
        style={{
          borderColor: checked ? 'var(--accent)' : 'var(--line)',
          background: checked ? 'var(--accent)' : 'transparent',
          color: checked ? 'white' : 'var(--text-faint)',
        }}
      >
        {checked ? '✓' : ''}
      </button>

      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-base font-medium" style={{ color: 'var(--text)' }}>
          {habit.title}
        </div>
        <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-dim)' }}>
          {[habit.cue, anchorLabel ?? habit.cue_time?.slice(0, 5), scheduleLabel(habit), dueToday ? null : 'Rest day']
            .filter(Boolean)
            .join(' · ')}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-none gap-1" aria-hidden="true">
            {strip.map((iso) => {
              const kept = doneOn.has(iso)
              const due = isDueOn(habit, iso)
              return (
                <span
                  key={iso}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: kept ? 'var(--accent)' : 'transparent',
                    boxShadow: kept ? 'none' : `inset 0 0 0 1px var(--${due ? 'line' : 'bg'})`,
                    opacity: due || kept ? 1 : 0.4,
                  }}
                />
              )
            })}
          </div>
          <span className="tabular truncate text-xs" style={{ color: 'var(--text-faint)' }}>
            {summary}
          </span>
        </div>
      </button>
    </div>
  )
}
