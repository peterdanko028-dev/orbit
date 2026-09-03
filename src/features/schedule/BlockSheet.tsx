import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { DayPicker } from '@/components/DayPicker'
import { useToast } from '@/components/Toast'
import { mondayOf } from '@/lib/date'
import type { BlockKind, BlockRow } from '@/lib/supabase'
import { SCHEDULE_DAY_ORDER } from './window'
import { useAddBlock, useDeleteBlock, useUpdateBlock } from './hooks'

const KINDS: { key: BlockKind; label: string }[] = [
  { key: 'school', label: 'School' },
  { key: 'training', label: 'Training' },
  { key: 'other', label: 'Other' },
]

/** A new block starts here: which day and hour was tapped. An existing one opens for editing. */
export type BlockDraft = { mode: 'new'; date: string; startMin: number } | { mode: 'edit'; block: BlockRow }

function minToHHMM(min: number): string {
  const h = String(Math.floor(min / 60) % 24).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function BlockSheet({ draft, onClose }: { draft: BlockDraft | null; onClose: () => void }) {
  const add = useAddBlock()
  const update = useUpdateBlock()
  const del = useDeleteBlock()
  const { show } = useToast()

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<BlockKind>('other')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [repeats, setRepeats] = useState(true)
  const [days, setDays] = useState<number[]>([])
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!draft) return
    setError('')
    if (draft.mode === 'edit') {
      const b = draft.block
      setTitle(b.title)
      setKind(b.kind)
      setLocation(b.location ?? '')
      setStartTime(b.start_time.slice(0, 5))
      setEndTime(b.end_time.slice(0, 5))
      setRepeats(b.days.length > 0)
      setDays(b.days)
      setStartsOn(b.starts_on)
      setEndsOn(b.ends_on ?? '')
    } else {
      const weekday = new Date(draft.date + 'T00:00:00').getDay()
      setTitle('')
      setKind('other')
      setLocation('')
      setStartTime(minToHHMM(draft.startMin))
      setEndTime(minToHHMM(draft.startMin + 60))
      setRepeats(true)
      setDays([weekday])
      setStartsOn(mondayOf(draft.date))
      setEndsOn('')
    }
  }, [draft])

  if (!draft) return null

  const save = () => {
    if (endTime <= startTime) {
      setError('End time needs to be after the start time.')
      return
    }
    // An empty `days` array means "one-off" to the occurrence math, so a
    // repeating block needs at least one day picked or it would silently
    // collapse into a single occurrence.
    if (repeats && days.length === 0) {
      setError('Pick at least one day it repeats on.')
      return
    }
    // A one-off's date lives in `startsOn` for an existing block, or comes
    // from the tapped cell for a new one — either way starts_on and ends_on
    // are the same single day.
    const oneOffDate = draft.mode === 'new' ? draft.date : startsOn
    const payload = {
      title: title.trim() || 'Untitled',
      kind,
      location: location.trim() || null,
      startTime,
      endTime,
      days: repeats ? days : [],
      startsOn: repeats ? startsOn : oneOffDate,
      endsOn: repeats ? endsOn || null : oneOffDate,
    }
    if (draft.mode === 'edit') {
      update.mutate({
        id: draft.block.id,
        title: payload.title,
        kind: payload.kind,
        location: payload.location,
        start_time: payload.startTime.length === 5 ? `${payload.startTime}:00` : payload.startTime,
        end_time: payload.endTime.length === 5 ? `${payload.endTime}:00` : payload.endTime,
        days: payload.days,
        starts_on: payload.startsOn,
        ends_on: payload.endsOn,
      })
    } else {
      add.mutate(payload)
    }
    onClose()
  }

  const remove = () => {
    if (draft.mode !== 'edit') return
    del.mutate(draft.block.id)
    onClose()
    show({ message: 'Removed from your schedule' })
  }

  return (
    <Sheet
      open={!!draft}
      onClose={onClose}
      title={draft.mode === 'edit' ? 'Edit block' : 'New block'}
      footer={
        <div className="flex items-center justify-between">
          {draft.mode === 'edit' ? (
            <Button variant="ghost" onClick={remove} style={{ color: 'var(--danger)' }}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Title
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Math" autoFocus />
        </label>

        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{
                borderColor: kind === k.key ? 'var(--accent)' : 'var(--line)',
                color: kind === k.key ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {k.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Location
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 204" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            Start
            <Input type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            End
            <Input type="time" step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRepeats(true)}
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{
                borderColor: repeats ? 'var(--accent)' : 'var(--line)',
                color: repeats ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              Repeats weekly
            </button>
            <button
              type="button"
              onClick={() => setRepeats(false)}
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{
                borderColor: !repeats ? 'var(--accent)' : 'var(--line)',
                color: !repeats ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              Just once
            </button>
          </div>

          {repeats ? (
            <>
              <DayPicker value={days} onChange={setDays} order={SCHEDULE_DAY_ORDER} />
              <div className="mt-1 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                  From
                  <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                  Until (optional)
                  <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
              Date
              <Input
                type="date"
                value={draft.mode === 'new' ? draft.date : startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                disabled={draft.mode === 'new'}
              />
            </label>
          )}
        </div>

        {error && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
