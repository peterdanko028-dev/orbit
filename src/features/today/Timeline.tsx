import type { ReactElement } from 'react'
import { formatDurationMin, formatTime } from '@/lib/date'
import type { HabitRow, ListRow, TaskRow } from '@/lib/supabase'
import type { TimelineItem } from './dayPlan'

/**
 * Compact, time-ordered rows — deliberately not TaskRow (that needs a
 * SortableContext for its drag handle, which the timeline doesn't have).
 */
function BlockItemRow({
  item,
  onOpen,
}: {
  item: TimelineItem & { type: 'block' }
  onOpen: (item: TimelineItem & { type: 'block' }) => void
}) {
  const { inst } = item
  return (
    <button
      onClick={() => onOpen(item)}
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
      style={{ borderColor: 'var(--calendar)', background: inst.skipped ? 'transparent' : 'var(--calendar-tint)', opacity: inst.skipped ? 0.55 : 1 }}
    >
      <span className="w-16 flex-none text-xs tabular" style={{ color: 'var(--calendar)' }}>
        {formatTime(item.start)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--text)' }}>
        {inst.block.title}
        {inst.block.location && <span style={{ color: 'var(--text-faint)' }}> · {inst.block.location}</span>}
        {inst.skipped && <span style={{ color: 'var(--text-faint)' }}> · Skipped</span>}
      </span>
    </button>
  )
}

function TaskItemRow({
  item,
  list,
  onOpen,
  onComplete,
  onReopen,
}: {
  item: TimelineItem & { type: 'task' }
  list?: ListRow
  onOpen: (task: TaskRow) => void
  onComplete: (task: TaskRow) => void
  onReopen: (task: TaskRow) => void
}) {
  const { task } = item
  const done = task.status === 'done'
  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)' }}>
      <span className="w-16 flex-none text-xs tabular" style={{ color: 'var(--text-faint)' }}>
        {formatTime(item.start)}
      </span>
      <button
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        onClick={() => (done ? onReopen(task) : onComplete(task))}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-xs"
        style={{ borderColor: done ? 'var(--ok)' : 'var(--line)', background: done ? 'var(--ok)' : 'transparent', color: 'white' }}
      >
        {done ? '✓' : ''}
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <div
          className="truncate text-sm"
          style={{ color: done ? 'var(--text-faint)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}
        >
          {task.title}
        </div>
        {(item.overlap || list) && (
          <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-faint)' }}>
            {item.overlap && <span>Overlaps</span>}
            {list && <span>{list.name}</span>}
          </div>
        )}
      </button>
    </div>
  )
}

function HabitItemRow({
  item,
  checked,
  onToggle,
}: {
  item: TimelineItem & { type: 'habit' }
  checked: boolean
  onToggle: (habit: HabitRow) => void
}) {
  const { habit, anchor } = item
  return (
    <button
      onClick={() => onToggle(habit)}
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
        {habit.title}
        {anchor && (
          <span style={{ color: 'var(--text-faint)' }}>
            {' '}
            · {anchor.position} {anchor.block.title}
          </span>
        )}
      </span>
    </button>
  )
}

function GapItemRow({ item, onPick }: { item: TimelineItem & { type: 'gap' }; onPick: (gap: TimelineItem & { type: 'gap' }) => void }) {
  return (
    <button
      onClick={() => onPick(item)}
      className="flex items-center gap-3 rounded-xl border border-dashed px-3 py-2 text-left"
      style={{ borderColor: 'var(--line)' }}
    >
      <span className="w-16 flex-none text-xs tabular" style={{ color: 'var(--text-faint)' }}>
        {formatTime(item.start)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--text-faint)' }}>
        Free · {formatDurationMin(item.end - item.start)} — tap to plan something
      </span>
    </button>
  )
}

function NowDivider() {
  return (
    <div className="flex items-center gap-2 py-0.5" aria-hidden="true">
      <span className="h-px flex-1" style={{ background: 'var(--accent)' }} />
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
        Now
      </span>
      <span className="h-px flex-1" style={{ background: 'var(--accent)' }} />
    </div>
  )
}

export function Timeline({
  items,
  nowMin,
  lists,
  checkedHabitIds,
  onOpenTask,
  onCompleteTask,
  onReopenTask,
  onOpenBlock,
  onToggleHabit,
  onPickGap,
}: {
  items: TimelineItem[]
  /** Minutes since local midnight, or null when the viewed day isn't today (no divider). */
  nowMin: number | null
  lists: ListRow[]
  checkedHabitIds: Set<string>
  onOpenTask: (task: TaskRow) => void
  onCompleteTask: (task: TaskRow) => void
  onReopenTask: (task: TaskRow) => void
  onOpenBlock: (item: TimelineItem & { type: 'block' }) => void
  onToggleHabit: (habit: HabitRow) => void
  onPickGap: (gap: TimelineItem & { type: 'gap' }) => void
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
        Nothing scheduled — see Anytime below.
      </p>
    )
  }

  const listById = new Map(lists.map((l) => [l.id, l]))
  const nodes: ReactElement[] = []
  let dividerPlaced = nowMin == null

  for (const item of items) {
    if (!dividerPlaced && nowMin != null && item.start > nowMin) {
      nodes.push(<NowDivider key="now-divider" />)
      dividerPlaced = true
    }
    if (item.type === 'block') nodes.push(<BlockItemRow key={item.key} item={item} onOpen={onOpenBlock} />)
    else if (item.type === 'task')
      nodes.push(
        <TaskItemRow
          key={item.key}
          item={item}
          list={item.task.list_id ? listById.get(item.task.list_id) : undefined}
          onOpen={onOpenTask}
          onComplete={onCompleteTask}
          onReopen={onReopenTask}
        />,
      )
    else if (item.type === 'habit')
      nodes.push(<HabitItemRow key={item.key} item={item} checked={checkedHabitIds.has(item.habit.id)} onToggle={onToggleHabit} />)
    else nodes.push(<GapItemRow key={item.key} item={item} onPick={onPickGap} />)
  }
  if (!dividerPlaced) nodes.push(<NowDivider key="now-divider" />)

  return <div className="flex flex-col gap-1.5">{nodes}</div>
}
