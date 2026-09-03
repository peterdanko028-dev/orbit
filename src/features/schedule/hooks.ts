import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, type BlockKind, type BlockRow, type BlockSkipRow, type HabitRow } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { shiftISO, todayISO } from '@/lib/date'
import { syncDelete, syncUpsert } from '@/lib/sync'

const BLOCKS_KEY = ['blocks'] as const
const SKIPS_KEY = ['block_skips'] as const
const HABITS_KEY = ['habits'] as const

/** Same horizon as habit_logs — only the recent past is ever shown, so there's no reason to pull years of skips onto a phone. */
const SKIP_HISTORY_DAYS = 56

function nowIso() {
  return new Date().toISOString()
}

export function useBlocks() {
  const { session } = useAuth()
  return useQuery({
    queryKey: BLOCKS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<BlockRow[]> => {
      const { data, error } = await supabase!.from('blocks').select('*').order('start_time')
      if (error) throw error
      return data
    },
  })
}

export function useBlockSkips() {
  const { session } = useAuth()
  return useQuery({
    queryKey: SKIPS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<BlockSkipRow[]> => {
      const { data, error } = await supabase!
        .from('block_skips')
        .select('*')
        .gte('on_date', shiftISO(todayISO(), -SKIP_HISTORY_DAYS))
      if (error) throw error
      return data
    },
  })
}

/** Skipped dates per block, as sets — what the occurrence maths wants. */
export function useSkipsByBlock(): Map<string, Set<string>> {
  const { data: skips = [] } = useBlockSkips()
  return useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const s of skips) {
      const set = map.get(s.block_id) ?? new Set<string>()
      set.add(s.on_date)
      map.set(s.block_id, set)
    }
    return map
  }, [skips])
}

export type NewBlock = {
  title: string
  kind?: BlockKind
  location?: string | null
  notes?: string | null
  startTime: string // HH:MM or HH:MM:SS
  endTime: string
  days: number[]
  startsOn: string
  endsOn?: string | null
}

function toRow(input: NewBlock, id: string, userId: string): BlockRow {
  return {
    id,
    user_id: userId,
    title: input.title,
    kind: input.kind ?? 'other',
    location: input.location ?? null,
    notes: input.notes ?? null,
    start_time: input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime,
    end_time: input.endTime.length === 5 ? `${input.endTime}:00` : input.endTime,
    days: input.days,
    starts_on: input.startsOn,
    ends_on: input.endsOn ?? null,
    archived: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
}

export function useAddBlock() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (input: NewBlock) => {
      const row = toRow(input, crypto.randomUUID(), session!.user.id)
      qc.setQueryData<BlockRow[]>(BLOCKS_KEY, (prev) => [...(prev ?? []), row])
      await syncUpsert('blocks', row)
      return row
    },
  })
}

export function useUpdateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<BlockRow> & { id: string }) => {
      qc.setQueryData<BlockRow[]>(BLOCKS_KEY, (prev) =>
        (prev ?? []).map((b) => (b.id === patch.id ? { ...b, ...patch, updated_at: nowIso() } : b)),
      )
      await syncUpsert('blocks', { ...patch, updated_at: nowIso() })
    },
  })
}

export function useDeleteBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      qc.setQueryData<BlockRow[]>(BLOCKS_KEY, (prev) => (prev ?? []).filter((b) => b.id !== id))
      qc.setQueryData<BlockSkipRow[]>(SKIPS_KEY, (prev) => (prev ?? []).filter((s) => s.block_id !== id))
      // The database nulls anchor_block_id via ON DELETE SET NULL, but the
      // client's own cache won't know that until a refetch — so scrub it here
      // too, the same way useDeleteHabit clears dependent habit_logs locally.
      qc.setQueryData<HabitRow[]>(HABITS_KEY, (prev) =>
        (prev ?? []).map((h) => (h.anchor_block_id === id ? { ...h, anchor_block_id: null, anchor_position: null } : h)),
      )
      // block_skips cascades on the foreign key, so the skips need no delete of their own.
      await syncDelete('blocks', { id })
    },
  })
}

/**
 * Tap to skip today's occurrence ("no class today"), tap again to undo — the
 * same idempotent toggle shape as useToggleCheckIn.
 */
export function useToggleSkip() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({ blockId, dateISO }: { blockId: string; dateISO: string }) => {
      const skips = qc.getQueryData<BlockSkipRow[]>(SKIPS_KEY) ?? []
      const existing = skips.find((s) => s.block_id === blockId && s.on_date === dateISO)

      if (existing) {
        qc.setQueryData<BlockSkipRow[]>(SKIPS_KEY, (prev) => (prev ?? []).filter((s) => s.id !== existing.id))
        await syncDelete('block_skips', { block_id: blockId, on_date: dateISO })
        return { skipped: false }
      }

      const row: BlockSkipRow = {
        id: crypto.randomUUID(),
        user_id: session!.user.id,
        block_id: blockId,
        on_date: dateISO,
        created_at: nowIso(),
      }
      qc.setQueryData<BlockSkipRow[]>(SKIPS_KEY, (prev) => [...(prev ?? []), row])
      await syncUpsert('block_skips', row, 'block_id,on_date')
      return { skipped: true }
    },
  })
}
