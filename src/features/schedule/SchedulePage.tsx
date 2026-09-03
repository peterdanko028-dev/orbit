import { useMemo, useState } from 'react'
import { mondayOf, shiftISO, todayISO, weekDates as weekDatesFrom } from '@/lib/date'
import type { BlockRow } from '@/lib/supabase'
import { BlockSheet, type BlockDraft } from './BlockSheet'
import { WeekGrid } from './WeekGrid'
import { useBlocks, useSkipsByBlock } from './hooks'

function formatWeek(monday: string): string {
  const start = new Date(monday + 'T00:00:00')
  const end = new Date(shiftISO(monday, 6) + 'T00:00:00')
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function SchedulePage() {
  const { data: blocks = [], isLoading } = useBlocks()
  const skipsByBlock = useSkipsByBlock()
  const [weekMonday, setWeekMonday] = useState(() => mondayOf(todayISO()))
  const [draft, setDraft] = useState<BlockDraft | null>(null)

  const dates = useMemo(() => weekDatesFrom(weekMonday), [weekMonday])
  const isThisWeek = weekMonday === mondayOf(todayISO())
  const live = useMemo(() => blocks.filter((b) => !b.archived), [blocks])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Schedule
        </h1>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekMonday((w) => shiftISO(w, -7))}
          aria-label="Previous week"
          className="rounded-full border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {formatWeek(weekMonday)}
          </span>
          {!isThisWeek && (
            <button
              type="button"
              onClick={() => setWeekMonday(mondayOf(todayISO()))}
              className="rounded-full px-2.5 py-1 text-xs"
              style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
            >
              This week
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekMonday((w) => shiftISO(w, 7))}
          aria-label="Next week"
          className="rounded-full border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}
        >
          ›
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-faint)' }}>Loading…</p>
      ) : live.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Tap a day and hour to add your first class or training.
        </p>
      ) : null}

      <WeekGrid
        weekDates={dates}
        blocks={live}
        skipsByBlock={skipsByBlock}
        onCreate={(date, startMin) => setDraft({ mode: 'new', date, startMin })}
        onEdit={(block: BlockRow) => setDraft({ mode: 'edit', block })}
      />

      <BlockSheet draft={draft} onClose={() => setDraft(null)} />
    </div>
  )
}
