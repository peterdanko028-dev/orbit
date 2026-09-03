import { toMinutes } from '@/lib/date'
import type { AnchorPosition, BlockRow, HabitRow, TaskRow } from '@/lib/supabase'
import { instancesOn, type BlockInstance } from '@/features/schedule/occurrences'
import { isDueOn } from '@/features/habits/consistency'
import { DAY_END_MIN, DAY_START_MIN, DEFAULT_TASK_MIN, MIN_GAP_MIN, SPLIT_AT_MIN } from '@/features/schedule/window'

export type TimelineItem =
  | { type: 'block'; key: string; start: number; end: number; inst: BlockInstance }
  | { type: 'task'; key: string; start: number; end: number; task: TaskRow; overlap: boolean }
  | {
      type: 'habit'
      key: string
      start: number
      end: number
      habit: HabitRow
      anchor: { block: BlockRow; position: AnchorPosition } | null
    }
  | { type: 'gap'; key: string; start: number; end: number }

export type DayPlan = {
  items: TimelineItem[]
  anytimeTasks: TaskRow[]
  anytimeHabits: HabitRow[]
  doneCount: number
  now: { current: TimelineItem | null; next: TimelineItem | null } | null
}

/** Sort tie-break at the same minute: an anchored "before" habit sits right above its block, "after" right below. */
function rank(item: TimelineItem): number {
  if (item.type === 'gap') return 0
  if (item.type === 'habit') {
    if (item.anchor?.position === 'before') return 1
    if (item.anchor?.position === 'after') return 4
    return 3
  }
  if (item.type === 'block') return 2
  return 3 // task
}

export function buildDay(input: {
  date: string
  today: string
  /** Minutes since local midnight, or null when `date` isn't today (no "now" marker, no gap trimming). */
  nowMin: number | null
  blocks: BlockRow[]
  skipsByBlock: Map<string, Set<string>>
  habits: HabitRow[]
  tasks: TaskRow[]
}): DayPlan {
  const { date, today, nowMin, blocks, skipsByBlock, habits, tasks } = input

  // 1. Blocks: every instance renders (skipped ones greyed by the caller via
  // inst.skipped), but only the live ones occupy time for gap purposes.
  const instances = instancesOn(blocks, skipsByBlock, date)
  const blockItems: (TimelineItem & { type: 'block' })[] = instances.map((inst) => ({
    type: 'block',
    key: `block-${inst.block.id}`,
    start: inst.start,
    end: inst.end,
    inst,
  }))
  const occupyingBlocks = instances.filter((i) => !i.skipped)

  // 2. Tasks scheduled for this date, and habits due this date placed either
  // against their anchor block, at their cue time, or (below) into Anytime.
  const scheduledTasks = tasks.filter((t) => !t.parent_id && t.scheduled_on === date)
  const taskItems: (TimelineItem & { type: 'task' })[] = scheduledTasks.map((t) => {
    const start = toMinutes(t.scheduled_at ?? '00:00:00')
    return { type: 'task', key: `task-${t.id}`, start, end: start + (t.duration_min ?? DEFAULT_TASK_MIN), task: t, overlap: false }
  })

  const dueHabits = habits.filter((h) => !h.archived && isDueOn(h, date))
  const habitItems: (TimelineItem & { type: 'habit' })[] = []
  const anytimeHabits: HabitRow[] = []
  for (const h of dueHabits) {
    let placed: (TimelineItem & { type: 'habit' }) | null = null
    if (h.anchor_block_id) {
      const inst = occupyingBlocks.find((i) => i.block.id === h.anchor_block_id)
      if (inst) {
        const position = h.anchor_position ?? 'after'
        const at = position === 'before' ? inst.start : inst.end
        placed = { type: 'habit', key: `habit-${h.id}`, start: at, end: at, habit: h, anchor: { block: inst.block, position } }
      }
    }
    if (!placed && h.cue_time) {
      const at = toMinutes(h.cue_time)
      placed = { type: 'habit', key: `habit-${h.id}`, start: at, end: at, habit: h, anchor: null }
    }
    if (placed) habitItems.push(placed)
    else anytimeHabits.push(h)
  }

  // 3. Gaps between occupying items, only for today and the future — a past
  // day is history, not something to plan into.
  const gaps: (TimelineItem & { type: 'gap' })[] = []
  const makeGap = (start: number, end: number): TimelineItem & { type: 'gap' } => ({
    type: 'gap',
    key: `gap-${start}`,
    start,
    end,
  })
  const pushGap = (start: number, end: number) => {
    if (end - start < MIN_GAP_MIN) return
    const boundaries = SPLIT_AT_MIN.filter((b) => b > start && b < end)
    if (end - start > 180 && boundaries.length > 0) {
      let cursor = start
      for (const b of boundaries) {
        if (b - cursor >= MIN_GAP_MIN) gaps.push(makeGap(cursor, b))
        cursor = b
      }
      if (end - cursor >= MIN_GAP_MIN) gaps.push(makeGap(cursor, end))
    } else {
      gaps.push(makeGap(start, end))
    }
  }

  if (date >= today) {
    type Occupant = { start: number; end: number; taskItem?: TimelineItem & { type: 'task' } }
    const occupants: Occupant[] = [
      ...occupyingBlocks.map((i) => ({ start: i.start, end: i.end })),
      ...taskItems.map((t) => ({ start: t.start, end: t.end, taskItem: t })),
    ].sort((a, b) => a.start - b.start || a.end - b.end)

    let cursor = DAY_START_MIN
    for (const occ of occupants) {
      if (occ.start > cursor + MIN_GAP_MIN) pushGap(cursor, occ.start)
      if (occ.taskItem) occ.taskItem.overlap = occ.start < cursor
      cursor = Math.max(cursor, occ.end)
    }
    if (DAY_END_MIN - cursor >= MIN_GAP_MIN) pushGap(cursor, DAY_END_MIN)
  }

  let finalGaps = gaps
  if (date === today && nowMin != null) {
    finalGaps = gaps
      .filter((g) => g.end > nowMin)
      .map((g) => (g.start < nowMin ? { ...g, start: Math.ceil(nowMin / 5) * 5 } : g))
      .filter((g) => g.end - g.start >= MIN_GAP_MIN)
  }

  // 4. One time-ordered list.
  const items: TimelineItem[] = [...blockItems, ...taskItems, ...habitItems, ...finalGaps]
  items.sort((a, b) => a.start - b.start || rank(a) - rank(b))

  // 5. Anytime: due-by-date tasks not scheduled today, plus tasks planned for
  // a past day that are still open (faint "planned Mon" caption, no red —
  // matches the rollover tone elsewhere in the app).
  const anytimeTasks = tasks
    .filter((t) => !t.parent_id && t.status !== 'done' && t.scheduled_on !== date)
    .filter((t) => (t.due_on != null && t.due_on <= date) || (t.scheduled_on != null && t.scheduled_on < today))
    .sort((a, b) => b.priority - a.priority || a.sort_order - b.sort_order)

  const dueByDate = tasks.filter((t) => !t.parent_id && t.due_on && t.due_on <= date)
  const doneCount = dueByDate.filter((t) => t.status === 'done').length

  // 6. Now / Next, today only.
  let now: DayPlan['now'] = null
  if (date === today && nowMin != null) {
    const currentOccupant =
      blockItems.find((b) => !b.inst.skipped && b.start <= nowMin && nowMin < b.end) ??
      taskItems.find((t) => t.start <= nowMin && nowMin < t.end) ??
      null
    const current = currentOccupant ?? finalGaps.find((g) => g.start <= nowMin && nowMin < g.end) ?? null
    const next = items.find((it) => it.type !== 'gap' && it.start > nowMin) ?? null
    now = { current, next }
  }

  return { items, anytimeTasks, anytimeHabits, doneCount, now }
}
