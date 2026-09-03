import { useMemo, useState } from 'react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { todayISO } from '@/lib/date'
import type { HabitRow } from '@/lib/supabase'
import { useAddHabit, useDoneByHabit, useHabits, useToggleCheckIn } from './hooks'
import { isDueOn } from './consistency'
import { HabitCard } from './HabitCard'
import { HabitSheet } from './HabitSheet'

const NO_LOGS: Set<string> = new Set()

/**
 * Habits: check in, see how it's going, and nothing else. New habits start as
 * "every day" with no cue — the schedule and the cue are refinements you make
 * in the sheet once the habit exists, rather than a form to fill in before you
 * can begin.
 */
export function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits()
  const doneByHabit = useDoneByHabit()
  const add = useAddHabit()
  const toggle = useToggleCheckIn()
  const [editing, setEditing] = useState<HabitRow | null>(null)
  const [value, setValue] = useState('')

  const today = todayISO()

  // Anything due today first; rest days keep their place below rather than
  // disappearing, so the list doesn't reshuffle under your thumb each morning.
  const { ordered, dueCount, checkedCount } = useMemo(() => {
    const live = habits.filter((h) => !h.archived)
    const ordered = [...live].sort((a, b) => {
      const dueDiff = Number(isDueOn(b, today)) - Number(isDueOn(a, today))
      return dueDiff || a.sort_order - b.sort_order
    })
    const due = live.filter((h) => isDueOn(h, today))
    return {
      ordered,
      dueCount: due.length,
      checkedCount: due.filter((h) => doneByHabit.get(h.id)?.has(today)).length,
    }
  }, [habits, doneByHabit, today])

  const submit = () => {
    const title = value.trim()
    if (!title) return
    add.mutate({ title })
    setValue('')
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Habits
        </h1>
        {dueCount > 0 && (
          <span className="tabular text-xs" style={{ color: 'var(--text-faint)' }}>
            {checkedCount === dueCount ? 'All done today' : `${checkedCount} of ${dueCount} today`}
          </span>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a habit… “stretch after coffee”"
          aria-label="Add a habit"
        />
        <Button type="submit" disabled={!value.trim()}>
          Add
        </Button>
      </form>

      {isLoading && <p style={{ color: 'var(--text-faint)' }}>Loading…</p>}

      {!isLoading && ordered.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          No habits yet. Start with one small thing you can do most days.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ordered.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              doneOn={doneByHabit.get(habit.id) ?? NO_LOGS}
              onToggle={() => toggle.mutate({ habitId: habit.id, dateISO: today })}
              onOpen={() => setEditing(habit)}
            />
          ))}
        </div>
      )}

      <HabitSheet
        habit={editing}
        doneOn={(editing && doneByHabit.get(editing.id)) || NO_LOGS}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
