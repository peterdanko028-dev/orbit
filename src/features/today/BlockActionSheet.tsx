import { useNavigate } from 'react-router'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { formatTime, todayISO } from '@/lib/date'
import type { BlockRow } from '@/lib/supabase'
import { useToggleSkip } from '@/features/schedule/hooks'

export function BlockActionSheet({
  target,
  onClose,
}: {
  target: { block: BlockRow; date: string; start: number; end: number; skipped: boolean } | null
  onClose: () => void
}) {
  const toggleSkip = useToggleSkip()
  const navigate = useNavigate()
  if (!target) return null

  const { block, date, start, end, skipped } = target

  return (
    <Sheet open={!!target} onClose={onClose} title={block.title}>
      <div className="flex flex-col gap-4">
        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
          {formatTime(start)} – {formatTime(end)}
          {block.location && ` · ${block.location}`}
        </div>
        {block.notes && (
          <p className="text-sm" style={{ color: 'var(--text)' }}>
            {block.notes}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              toggleSkip.mutate({ blockId: block.id, dateISO: date })
              onClose()
            }}
          >
            {skipped ? 'Undo skip' : date === todayISO() ? 'Skip today' : 'Skip this day'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onClose()
              navigate('/schedule')
            }}
          >
            Edit in Schedule
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
