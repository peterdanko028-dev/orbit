import { toMinutes, weekdayOf } from '@/lib/date'
import type { BlockRow } from '@/lib/supabase'

/** Does this block happen on this local date? A one-off (empty `days`) happens only on `starts_on`. */
export function occursOn(block: BlockRow, iso: string): boolean {
  if (block.archived) return false
  if (iso < block.starts_on) return false
  if (block.ends_on && iso > block.ends_on) return false
  if (block.days.length === 0) return iso === block.starts_on
  return block.days.includes(weekdayOf(iso))
}

export type BlockInstance = {
  block: BlockRow
  date: string
  start: number // minutes since local midnight
  end: number
  skipped: boolean
}

/** Every block occurring on this date, in start-time order, flagged if skipped ("no class today"). */
export function instancesOn(blocks: BlockRow[], skipsByBlock: Map<string, Set<string>>, iso: string): BlockInstance[] {
  return blocks
    .filter((b) => occursOn(b, iso))
    .map((b) => ({
      block: b,
      date: iso,
      start: toMinutes(b.start_time),
      end: toMinutes(b.end_time),
      skipped: skipsByBlock.get(b.id)?.has(iso) ?? false,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
}
