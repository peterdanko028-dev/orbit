import { useEffect, useMemo, useState } from 'react'
import { todayISO } from '@/lib/date'
import { QuickAdd } from '@/features/tasks/QuickAdd'
import { TaskRow } from '@/features/tasks/TaskRow'
import { TaskSheet } from '@/features/tasks/TaskSheet'
import { useCompleteTask, useLists, useTasks } from '@/features/tasks/hooks'
import { useToast } from '@/components/Toast'
import type { TaskRow as TaskRowType } from '@/lib/supabase'

/**
 * Home screen. Shows today's open tasks (including anything rolled over from
 * a past date — worded plainly, never a red overdue pile) plus the one
 * starred task highlighted as "next". The rest of the backlog stays on the
 * Tasks page; an empty Today reads as success, not a void to fill.
 */
export function TodayPage() {
  const { data: tasks = [] } = useTasks()
  const { data: lists = [] } = useLists()
  const { complete, reopen } = useCompleteTask()
  const { show } = useToast()
  const [editing, setEditing] = useState<TaskRowType | null>(null)

  // The Android share sheet lands here as /?title=...&text=...&url=... (see
  // the manifest's share_target), and the "Add task" home-screen shortcut
  // lands here as /?focus=1 — both should drop straight into typing rather
  // than require a tap first. Read once, then scrub the URL so a refresh
  // doesn't re-trigger the draft.
  const [draft] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    return [p.get('title'), p.get('text')].filter(Boolean).join(' ').trim()
  })
  const [shouldFocus] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    return p.has('focus') || p.has('text') || p.has('title')
  })
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists])

  const { open, next, nextStep, doneCount } = useMemo(() => {
    const today = todayISO()
    const todays = tasks.filter((t) => !t.parent_id && t.due_on && t.due_on <= today)
    const open = todays.filter((t) => t.status !== 'done').sort((a, b) => b.priority - a.priority || a.sort_order - b.sort_order)
    const doneCount = todays.filter((t) => t.status === 'done').length
    const next = open.find((t) => t.priority > 0) ?? open[0] ?? null
    // A broken-down task is easier to start from its first open step than from
    // its own name — "Draft the intro" beats "Q3 report".
    const nextStep = next
      ? (tasks
          .filter((t) => t.parent_id === next.id && t.status !== 'done')
          .sort((a, b) => a.sort_order - b.sort_order)[0] ?? null)
      : null
    return { open, next, nextStep, doneCount }
  }, [tasks])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
        Today
      </h1>

      <QuickAdd initialValue={draft} autoFocus={shouldFocus} />

      {next && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
            Next
          </h2>
          <button
            onClick={() => setEditing(next)}
            className="flex flex-col items-start gap-1 rounded-2xl border p-4 text-left"
            style={{ borderColor: 'var(--accent)', background: 'var(--accent-tint)' }}
          >
            {nextStep && (
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {next.title}
              </span>
            )}
            <span className="text-base font-medium" style={{ color: 'var(--text)' }}>
              {nextStep ? nextStep.title : next.title}
            </span>
            {!nextStep && next.first_step && (
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                First step: {next.first_step}
              </span>
            )}
          </button>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
          {open.length > 0 ? `Today · ${open.length}` : 'Today'}
        </h2>
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
            {doneCount > 0 ? 'Nothing left for today — nice.' : 'Nothing planned for today yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {open.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                list={task.list_id ? listById.get(task.list_id) : undefined}
                onOpen={() => setEditing(task)}
                onComplete={() => {
                  complete(task)
                  show({ message: 'Task completed', actionLabel: 'Undo', onAction: () => reopen(task) })
                }}
                onReopen={() => reopen(task)}
              />
            ))}
          </div>
        )}
        {doneCount > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {doneCount} done today
          </p>
        )}
      </section>

      <TaskSheet task={editing} lists={lists} onClose={() => setEditing(null)} />
    </div>
  )
}
