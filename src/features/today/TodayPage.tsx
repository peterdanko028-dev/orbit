import { useEffect, useMemo, useState } from 'react'
import { nowMinutes, shiftISO, todayISO } from '@/lib/date'
import { useNow } from '@/lib/useNow'
import { QuickAdd } from '@/features/tasks/QuickAdd'
import { TaskSheet } from '@/features/tasks/TaskSheet'
import { useCompleteTask, useLists, useTasks } from '@/features/tasks/hooks'
import { useDoneByHabit, useHabits, useToggleCheckIn } from '@/features/habits/hooks'
import { useBlocks, useSkipsByBlock } from '@/features/schedule/hooks'
import { useToast } from '@/components/Toast'
import type { HabitRow, TaskRow as TaskRowType } from '@/lib/supabase'
import { buildDay, type TimelineItem } from './dayPlan'
import { NowNextCard } from './NowNextCard'
import { Timeline } from './Timeline'
import { AnytimeStrip } from './AnytimeStrip'
import { PickTaskSheet, type GapDraft } from './PickTaskSheet'
import { PickGapSheet } from './PickGapSheet'
import { BlockActionSheet } from './BlockActionSheet'

/** How far back day navigation goes — habit check-ins and block skips are only ever fetched for the last 56 days. */
const MAX_DAYS_BACK = 56

function formatDayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * Home screen. One day, time-ordered: your fixed blocks (school, training),
 * tasks and habits placed on the clock, the gaps between them, and — below —
 * everything else that's due but not yet placed. Day arrows move through
 * history and the near future; "Today" always jumps back.
 */
export function TodayPage() {
  const { data: tasks = [] } = useTasks()
  const { data: lists = [] } = useLists()
  const { data: habits = [] } = useHabits()
  const doneByHabit = useDoneByHabit()
  const { data: blocks = [] } = useBlocks()
  const skipsByBlock = useSkipsByBlock()
  const { complete, reopen } = useCompleteTask()
  const toggleHabit = useToggleCheckIn()
  const { show } = useToast()

  const [editing, setEditing] = useState<TaskRowType | null>(null)
  const [gapDraft, setGapDraft] = useState<GapDraft | null>(null)
  const [planningTask, setPlanningTask] = useState<TaskRowType | null>(null)
  const [blockSheetTarget, setBlockSheetTarget] = useState<Parameters<typeof BlockActionSheet>[0]['target']>(null)

  const [date, setDate] = useState(() => todayISO())

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

  const now = useNow()
  const today = todayISO()
  const nowMin = date === today ? nowMinutes(now) : null
  const earliestDate = shiftISO(today, -MAX_DAYS_BACK)

  const plan = useMemo(
    () => buildDay({ date, today, nowMin, blocks, skipsByBlock, habits, tasks }),
    [date, today, nowMin, blocks, skipsByBlock, habits, tasks],
  )

  const checkedHabitIds = useMemo(() => {
    const set = new Set<string>()
    for (const h of habits) if (doneByHabit.get(h.id)?.has(date)) set.add(h.id)
    return set
  }, [habits, doneByHabit, date])

  const gaps = useMemo(() => plan.items.filter((it): it is TimelineItem & { type: 'gap' } => it.type === 'gap'), [plan.items])

  const onToggleHabit = (habit: HabitRow) => toggleHabit.mutate({ habitId: habit.id, dateISO: date })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDate((d) => shiftISO(d, -1))}
            disabled={date <= earliestDate}
            aria-label="Previous day"
            className="rounded-full px-2 py-1 text-lg disabled:opacity-30"
            style={{ color: 'var(--text-dim)' }}
          >
            ‹
          </button>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
            {formatDayLabel(date, today)}
          </h1>
          <button
            type="button"
            onClick={() => setDate((d) => shiftISO(d, 1))}
            aria-label="Next day"
            className="rounded-full px-2 py-1 text-lg"
            style={{ color: 'var(--text-dim)' }}
          >
            ›
          </button>
        </div>
        {date !== today && (
          <button
            type="button"
            onClick={() => setDate(today)}
            className="rounded-full px-3 py-1.5 text-xs"
            style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
          >
            Today
          </button>
        )}
      </div>

      {date === today && <QuickAdd initialValue={draft} autoFocus={shouldFocus} />}

      <NowNextCard date={date} today={today} plan={plan} tasks={tasks} onOpenTask={setEditing} />

      <Timeline
        items={plan.items}
        nowMin={nowMin}
        lists={lists}
        checkedHabitIds={checkedHabitIds}
        onOpenTask={setEditing}
        onCompleteTask={(task) => {
          complete(task)
          show({ message: 'Task completed', actionLabel: 'Undo', onAction: () => reopen(task) })
        }}
        onReopenTask={reopen}
        onOpenBlock={(item) =>
          setBlockSheetTarget({ block: item.inst.block, date, start: item.start, end: item.end, skipped: item.inst.skipped })
        }
        onToggleHabit={onToggleHabit}
        onPickGap={(gap) => setGapDraft({ date, start: gap.start, end: gap.end })}
      />

      <AnytimeStrip
        tasks={plan.anytimeTasks}
        habits={plan.anytimeHabits}
        lists={lists}
        doneCount={plan.doneCount}
        checkedHabitIds={checkedHabitIds}
        onOpenTask={setEditing}
        onCompleteTask={(task) => {
          complete(task)
          show({ message: 'Task completed', actionLabel: 'Undo', onAction: () => reopen(task) })
        }}
        onReopenTask={reopen}
        onPlanTask={setPlanningTask}
        onToggleHabit={onToggleHabit}
      />

      <TaskSheet task={editing} lists={lists} onClose={() => setEditing(null)} />
      <PickTaskSheet gap={gapDraft} tasks={tasks} lists={lists} onClose={() => setGapDraft(null)} />
      <PickGapSheet task={planningTask} date={date} gaps={gaps} onClose={() => setPlanningTask(null)} />
      <BlockActionSheet target={blockSheetTarget} onClose={() => setBlockSheetTarget(null)} />
    </div>
  )
}
