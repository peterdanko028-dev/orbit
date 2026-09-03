import { Sheet } from '@/components/Sheet'
import { formatDurationMin, formatTime, fromMinutes } from '@/lib/date'
import type { TaskRow } from '@/lib/supabase'
import { useScheduleTask } from '@/features/tasks/hooks'
import type { TimelineItem } from './dayPlan'

/** The mirror of PickTaskSheet: start from a task, pick which free slot to drop it in. */
export function PickGapSheet({
  task,
  date,
  gaps,
  onClose,
}: {
  task: TaskRow | null
  date: string
  gaps: (TimelineItem & { type: 'gap' })[]
  onClose: () => void
}) {
  const { schedule } = useScheduleTask()
  if (!task) return null

  const place = (gap: TimelineItem & { type: 'gap' }) => {
    const durationMin = Math.max(5, Math.min(task.duration_min ?? gap.end - gap.start, gap.end - gap.start))
    schedule(task, { on: date, at: fromMinutes(gap.start), durationMin })
    onClose()
  }

  return (
    <Sheet open={!!task} onClose={onClose} title={`Plan “${task.title}”`}>
      {gaps.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          No free time left today.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {gaps.map((g) => (
            <button
              key={g.key}
              onClick={() => place(g)}
              className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm"
              style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            >
              <span>
                {formatTime(g.start)} – {formatTime(g.end)}
              </span>
              <span style={{ color: 'var(--text-faint)' }}>{formatDurationMin(g.end - g.start)}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
