import type { HabitRow, ListRow, TaskRow } from '@/lib/supabase'
import { TaskRow as TaskRowView } from '@/features/tasks/TaskRow'

/** Everything due but not placed on the clock: unscheduled tasks and habits with no anchor or cue time. */
export function AnytimeStrip({
  tasks,
  habits,
  lists,
  doneCount,
  checkedHabitIds,
  onOpenTask,
  onCompleteTask,
  onReopenTask,
  onPlanTask,
  onToggleHabit,
}: {
  tasks: TaskRow[]
  habits: HabitRow[]
  lists: ListRow[]
  doneCount: number
  checkedHabitIds: Set<string>
  onOpenTask: (task: TaskRow) => void
  onCompleteTask: (task: TaskRow) => void
  onReopenTask: (task: TaskRow) => void
  onPlanTask: (task: TaskRow) => void
  onToggleHabit: (habit: HabitRow) => void
}) {
  const listById = new Map(lists.map((l) => [l.id, l]))
  const count = tasks.length + habits.length

  if (count === 0 && doneCount === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
        {count > 0 ? `Anytime · ${count}` : 'Anytime'}
      </h2>
      {count === 0 ? (
        <p className="py-4 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Nothing left — nice.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((h) => {
            const checked = checkedHabitIds.has(h.id)
            return (
              <button
                key={h.id}
                onClick={() => onToggleHabit(h)}
                aria-pressed={checked}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
                style={{ borderColor: 'var(--habits)', background: checked ? 'var(--habits-tint)' : 'transparent' }}
              >
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-xs"
                  style={{ borderColor: checked ? 'var(--habits)' : 'var(--line)', background: checked ? 'var(--habits)' : 'transparent', color: 'white' }}
                >
                  {checked ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--text)' }}>
                  {h.title}
                </span>
              </button>
            )
          })}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <TaskRowView
                  task={t}
                  list={t.list_id ? listById.get(t.list_id) : undefined}
                  onOpen={() => onOpenTask(t)}
                  onComplete={() => onCompleteTask(t)}
                  onReopen={() => onReopenTask(t)}
                />
              </div>
              <button
                onClick={() => onPlanTask(t)}
                className="flex-none rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}
              >
                Plan
              </button>
            </div>
          ))}
        </div>
      )}
      {doneCount > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {doneCount} done
        </p>
      )}
    </section>
  )
}
