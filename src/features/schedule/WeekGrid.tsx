import { formatTime } from '@/lib/date'
import type { BlockRow } from '@/lib/supabase'
import { instancesOn, type BlockInstance } from './occurrences'
import { DAY_END_MIN, DAY_START_MIN, PX_PER_MIN } from './window'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const KIND_VAR: Record<BlockRow['kind'], string> = { school: 'calendar', training: 'habits', other: 'tasks' }

const HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN
const HOURS = Array.from({ length: DAY_END_MIN / 60 - DAY_START_MIN / 60 + 1 }, (_, i) => DAY_START_MIN / 60 + i)

/** Greedy lane assignment so same-day overlaps sit side by side instead of stacking. */
function withLanes(instances: BlockInstance[]): { inst: BlockInstance; lane: number; lanes: number }[] {
  const sorted = [...instances].sort((a, b) => a.start - b.start)
  const laneEnds: number[] = []
  const placed = sorted.map((inst) => {
    let lane = laneEnds.findIndex((end) => end <= inst.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = inst.end
    return { inst, lane }
  })
  // Every item overlapping this one needs to know the max lane count among the group.
  return placed.map(({ inst, lane }) => {
    const overlapping = placed.filter((p) => p.inst.start < inst.end && p.inst.end > inst.start)
    const lanes = Math.max(...overlapping.map((p) => p.lane)) + 1
    return { inst, lane, lanes }
  })
}

export function WeekGrid({
  weekDates,
  blocks,
  skipsByBlock,
  onCreate,
  onEdit,
}: {
  weekDates: string[] // Monday..Sunday
  blocks: BlockRow[]
  skipsByBlock: Map<string, Set<string>>
  onCreate: (date: string, startMin: number) => void
  onEdit: (block: BlockRow) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--line)' }}>
      <div className="flex" style={{ minWidth: 56 + 7 * 96 }}>
        <div className="flex-none" style={{ width: 56 }}>
          <div className="h-10 border-b" style={{ borderColor: 'var(--line)' }} />
          <div className="relative" style={{ height: HEIGHT }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] tabular"
                style={{ top: (h * 60 - DAY_START_MIN) * PX_PER_MIN, color: 'var(--text-faint)' }}
              >
                {formatTime(h * 60)}
              </div>
            ))}
          </div>
        </div>

        {weekDates.map((date, i) => {
          const instances = instancesOn(blocks, skipsByBlock, date)
          const laned = withLanes(instances)
          return (
            <div key={date} className="flex-none border-l" style={{ width: 96, borderColor: 'var(--line)' }}>
              <div
                className="flex h-10 items-center justify-center border-b text-xs font-medium"
                style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}
              >
                {DAY_LABELS[i]}
              </div>
              <div
                className="relative cursor-pointer"
                style={{ height: HEIGHT }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const offsetY = e.clientY - rect.top
                  const rawMin = DAY_START_MIN + offsetY / PX_PER_MIN
                  const snapped = Math.round(rawMin / 30) * 30
                  onCreate(date, snapped)
                }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t"
                    style={{ top: (h * 60 - DAY_START_MIN) * PX_PER_MIN, borderColor: 'var(--line)', opacity: 0.5 }}
                  />
                ))}
                {laned.map(({ inst, lane, lanes }) => {
                  const top = (inst.start - DAY_START_MIN) * PX_PER_MIN
                  const height = Math.max((inst.end - inst.start) * PX_PER_MIN, 18)
                  const v = KIND_VAR[inst.block.kind]
                  return (
                    <button
                      key={inst.block.id}
                      type="button"
                      onClick={() => onEdit(inst.block)}
                      className="absolute overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight"
                      style={{
                        top,
                        height,
                        left: `${(lane / lanes) * 100}%`,
                        width: `${100 / lanes}%`,
                        borderColor: `var(--${v})`,
                        background: inst.skipped ? 'transparent' : `var(--${v}-tint)`,
                        color: `var(--${v})`,
                        opacity: inst.skipped ? 0.5 : 1,
                      }}
                    >
                      <div className="truncate font-medium">{inst.block.title}</div>
                      {height > 30 && <div className="truncate">{formatTime(inst.start)}</div>}
                      {inst.skipped && <div className="truncate">Skipped</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
