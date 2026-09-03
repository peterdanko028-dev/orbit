import type { TaskRow } from '@/lib/supabase'
import { formatDurationMin, formatTime } from '@/lib/date'
import type { DayPlan, TimelineItem } from './dayPlan'

function itemTitle(item: TimelineItem): string {
  if (item.type === 'block') return item.inst.block.title
  if (item.type === 'task') return item.task.title
  if (item.type === 'habit') return item.habit.title
  return ''
}

/**
 * The one line that answers "what now": the current block or gap, what's
 * next, and — in a gap — a suggestion pulled from the same starred-first
 * logic the old "Next" card used. Other days get a quieter preview instead.
 */
export function NowNextCard({
  date,
  today,
  plan,
  tasks,
  onOpenTask,
}: {
  date: string
  today: string
  plan: DayPlan
  tasks: TaskRow[]
  onOpenTask: (task: TaskRow) => void
}) {
  if (date !== today) {
    const first = plan.items.find((it) => it.type !== 'gap')
    return (
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--accent)', background: 'var(--accent-tint)' }}>
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {first ? `Starts with ${itemTitle(first)} at ${formatTime(first.start)}` : 'Nothing planned'}
        </span>
      </div>
    )
  }

  const { now } = plan
  if (!now) return null

  const suggestion = plan.anytimeTasks[0] as TaskRow | undefined
  const suggestionStep = suggestion
    ? tasks
        .filter((t) => t.parent_id === suggestion.id && t.status !== 'done')
        .sort((a, b) => a.sort_order - b.sort_order)[0]
    : undefined

  let headline: string
  if (now.current?.type === 'block') headline = `Now: ${now.current.inst.block.title} · until ${formatTime(now.current.end)}`
  else if (now.current?.type === 'task') headline = `Now: ${now.current.task.title}`
  else if (now.current?.type === 'gap')
    headline = `Free until ${formatTime(now.current.end)} · ${formatDurationMin(now.current.end - now.current.start)}`
  else headline = 'Nothing planned right now'

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border p-4"
      style={{ borderColor: 'var(--accent)', background: 'var(--accent-tint)' }}
    >
      <span className="text-base font-medium" style={{ color: 'var(--text)' }}>
        {headline}
      </span>
      {now.current?.type === 'gap' && suggestion && (
        <button
          onClick={() => onOpenTask(suggestion)}
          className="self-start text-left text-sm"
          style={{ color: 'var(--text-dim)' }}
        >
          {suggestionStep ? (
            <>
              <span style={{ color: 'var(--text-faint)' }}>{suggestion.title} — </span>
              {suggestionStep.title}
            </>
          ) : (
            `Try: ${suggestion.title}`
          )}
        </button>
      )}
      {now.next && (
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Next: {itemTitle(now.next)} at {formatTime(now.next.start)}
        </span>
      )}
    </div>
  )
}
