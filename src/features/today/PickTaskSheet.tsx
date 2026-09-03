import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { formatDurationMin, formatTime, fromMinutes } from '@/lib/date'
import type { ListRow, TaskRow } from '@/lib/supabase'
import { useAddTask, useScheduleTask } from '@/features/tasks/hooks'

export type GapDraft = { date: string; start: number; end: number }

/** Lower is a better fit for "what should I do right now": overdue first, then starred, then anything else due, then someday. */
function candidateRank(t: TaskRow, date: string): number {
  if (t.due_on && t.due_on <= date) return 0
  if (t.priority > 0) return 1
  if (t.due_on) return 2
  return 3
}

export function PickTaskSheet({
  gap,
  tasks,
  lists,
  onClose,
}: {
  gap: GapDraft | null
  tasks: TaskRow[]
  lists: ListRow[]
  onClose: () => void
}) {
  const add = useAddTask()
  const { schedule } = useScheduleTask()
  const [value, setValue] = useState('')

  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists])

  const candidates = useMemo(() => {
    if (!gap) return []
    return tasks
      .filter((t) => !t.parent_id && t.status !== 'done' && t.scheduled_on !== gap.date)
      .sort((a, b) => candidateRank(a, gap.date) - candidateRank(b, gap.date) || b.priority - a.priority || a.sort_order - b.sort_order)
      .slice(0, 20)
  }, [tasks, gap])

  if (!gap) return null

  const place = (task: TaskRow) => {
    const durationMin = Math.max(5, Math.min(task.duration_min ?? gap.end - gap.start, gap.end - gap.start))
    schedule(task, { on: gap.date, at: fromMinutes(gap.start), durationMin })
    onClose()
  }

  const submitNew = () => {
    const title = value.trim()
    if (!title) return
    add.mutate(
      { title, dueOn: gap.date },
      {
        onSuccess: (row) => place(row),
      },
    )
    setValue('')
  }

  return (
    <Sheet open={!!gap} onClose={onClose} title={`Plan ${formatTime(gap.start)} – ${formatTime(gap.end)}`}>
      <div className="flex flex-col gap-4">
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {formatDurationMin(gap.end - gap.start)} free
        </p>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submitNew()
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="New task…" aria-label="New task" />
          <Button type="submit" variant="secondary" disabled={!value.trim()}>
            Add
          </Button>
        </form>

        {candidates.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
            Nothing waiting to be planned — add one above.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {candidates.map((t) => {
              const list = t.list_id ? listById.get(t.list_id) : undefined
              return (
                <button
                  key={t.id}
                  onClick={() => place(t)}
                  className="flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    {t.priority > 0 && <span style={{ color: 'var(--tasks)' }}>★ </span>}
                    {t.title}
                  </span>
                  {list && (
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {list.name}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}
