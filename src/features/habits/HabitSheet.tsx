import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { useToast } from '@/components/Toast'
import type { HabitRow, Recurrence } from '@/lib/supabase'
import { useDeleteHabit, useUpdateHabit } from './hooks'
import { consistency } from './consistency'

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const RECURRENCES: { key: Recurrence; label: string }[] = [
  { key: 'daily', label: 'Every day' },
  { key: 'days', label: 'Certain days' },
  { key: 'weekly', label: 'A few times a week' },
]

export function HabitSheet({
  habit,
  doneOn,
  onClose,
}: {
  habit: HabitRow | null
  doneOn: Set<string>
  onClose: () => void
}) {
  const update = useUpdateHabit()
  const del = useDeleteHabit()
  const { show } = useToast()
  const [title, setTitle] = useState('')
  const [cue, setCue] = useState('')
  const [cueTime, setCueTime] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('daily')
  const [days, setDays] = useState<number[]>([])
  const [target, setTarget] = useState(3)

  useEffect(() => {
    if (!habit) return
    setTitle(habit.title)
    setCue(habit.cue ?? '')
    setCueTime(habit.cue_time?.slice(0, 5) ?? '')
    setRecurrence(habit.recurrence)
    setDays(habit.days)
    setTarget(habit.target_per_week)
  }, [habit])

  if (!habit) return null

  const score = consistency(habit, doneOn)

  const save = () => {
    update.mutate({
      id: habit.id,
      title: title.trim() || habit.title,
      cue: cue.trim() || null,
      cue_time: cueTime ? `${cueTime}:00` : null,
      recurrence,
      // Picking "certain days" and choosing none would make the habit due
      // never, so an empty pick falls back to every day.
      days: recurrence === 'days' ? (days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6]) : [],
      target_per_week: target,
    })
    onClose()
  }

  const remove = () => {
    del.mutate(habit.id)
    onClose()
    show({ message: 'Habit removed' })
  }

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  return (
    <Sheet
      open={!!habit}
      onClose={onClose}
      title="Edit habit"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={remove} style={{ color: 'var(--danger)' }}>
            Remove
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Habit
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            Cue
            <Input value={cue} onChange={(e) => setCue(e.target.value)} placeholder="After morning coffee" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            Time
            <Input type="time" value={cueTime} onChange={(e) => setCueTime(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            How often
          </span>
          <div className="flex flex-wrap gap-2">
            {RECURRENCES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRecurrence(r.key)}
                className="rounded-full border px-3 py-1.5 text-xs"
                style={{
                  borderColor: recurrence === r.key ? 'var(--accent)' : 'var(--line)',
                  color: recurrence === r.key ? 'var(--accent)' : 'var(--text-dim)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {recurrence === 'days' && (
            <div className="mt-1 flex gap-1.5">
              {DAY_NAMES.map((name, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={days.includes(d)}
                  className="h-9 w-9 rounded-full border text-xs"
                  style={{
                    borderColor: days.includes(d) ? 'var(--accent)' : 'var(--line)',
                    background: days.includes(d) ? 'var(--accent-tint)' : 'transparent',
                    color: days.includes(d) ? 'var(--accent)' : 'var(--text-dim)',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {recurrence === 'weekly' && (
            <label className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <select
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              times a week — whichever days suit
            </label>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {score.pct === null
            ? 'Too new to score — that’s fine.'
            : `Kept ${score.done} of ${score.expected} over the last four weeks.`}
        </p>
      </div>
    </Sheet>
  )
}
