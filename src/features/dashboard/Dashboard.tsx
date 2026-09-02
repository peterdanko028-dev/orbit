import { useMemo } from 'react'
import { Link } from 'react-router'
import { useTasks } from '@/features/tasks/hooks'
import type { TaskRow } from '@/lib/supabase'

function isOverdue(t: TaskRow) {
  if (!t.due_on || t.status === 'done') return false
  return new Date(t.due_on + 'T00:00:00') < new Date(new Date().toDateString())
}
function isToday(t: TaskRow) {
  if (!t.due_on || t.status === 'done') return false
  return t.due_on === new Date().toISOString().slice(0, 10)
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex-1 rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg-raised)' }}>
      <div className="tabular text-3xl font-semibold" style={{ color: accent }}>
        {value}
      </div>
      <div className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </div>
    </div>
  )
}

function Placeholder({ label, accent, tint }: { label: string; accent: string; tint: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: tint }}>
      <div className="text-sm font-medium" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
        Coming soon
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data: tasks = [] } = useTasks()

  const { overdue, today, next } = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done')
    const overdue = open.filter(isOverdue)
    const today = open.filter(isToday)
    const next = open
      .filter((t) => !isOverdue(t) && !isToday(t))
      .sort((a, b) => (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999'))
      .slice(0, 5)
    return { overdue, today, next }
  }, [tasks])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
        Dashboard
      </h1>

      <div className="flex gap-3">
        <Stat label="Overdue" value={overdue.length} accent="var(--danger)" />
        <Stat label="Due today" value={today.length} accent="var(--tasks)" />
        <Stat label="Open tasks" value={tasks.filter((t) => t.status !== 'done').length} accent="var(--dashboard)" />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
          Up next
        </h2>
        {next.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            Nothing scheduled. <Link to="/tasks" style={{ color: 'var(--dashboard)' }}>Add a task →</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {next.map((t) => (
              <Link
                key={t.id}
                to="/tasks"
                className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--line)' }}
              >
                <span style={{ color: 'var(--text)' }}>{t.title}</span>
                <span style={{ color: 'var(--text-faint)' }}>{t.due_on ?? '—'}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Placeholder label="Notes" accent="var(--notes)" tint="var(--notes-tint)" />
        <Placeholder label="Calendar" accent="var(--calendar)" tint="var(--calendar-tint)" />
        <Placeholder label="Habits" accent="var(--habits)" tint="var(--habits-tint)" />
      </section>
    </div>
  )
}
