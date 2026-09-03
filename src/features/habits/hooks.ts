import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, type HabitLogRow, type HabitRow, type Recurrence } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { shiftISO, todayISO } from '@/lib/date'
import { syncDelete, syncUpsert } from '@/lib/sync'
import { WINDOW_DAYS } from './consistency'

const HABITS_KEY = ['habits'] as const
const LOGS_KEY = ['habit_logs'] as const

/** Only the recent past is ever shown or scored, so there's no reason to pull a year of check-ins onto a phone. */
const LOG_HISTORY_DAYS = WINDOW_DAYS * 2

function nowIso() {
  return new Date().toISOString()
}

export function useHabits() {
  const { session } = useAuth()
  return useQuery({
    queryKey: HABITS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<HabitRow[]> => {
      const { data, error } = await supabase!.from('habits').select('*').order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useHabitLogs() {
  const { session } = useAuth()
  return useQuery({
    queryKey: LOGS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<HabitLogRow[]> => {
      const { data, error } = await supabase!
        .from('habit_logs')
        .select('*')
        .gte('done_on', shiftISO(todayISO(), -LOG_HISTORY_DAYS))
      if (error) throw error
      return data
    },
  })
}

/** Check-in dates per habit, as sets — what the consistency maths wants. */
export function useDoneByHabit(): Map<string, Set<string>> {
  const { data: logs = [] } = useHabitLogs()
  return useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const log of logs) {
      const set = map.get(log.habit_id) ?? new Set<string>()
      set.add(log.done_on)
      map.set(log.habit_id, set)
    }
    return map
  }, [logs])
}

export type NewHabit = {
  title: string
  cue?: string | null
  cueTime?: string | null
  recurrence?: Recurrence
  days?: number[]
  targetPerWeek?: number
}

export function useAddHabit() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (input: NewHabit) => {
      const row: HabitRow = {
        id: crypto.randomUUID(),
        user_id: session!.user.id,
        title: input.title,
        cue: input.cue ?? null,
        cue_time: input.cueTime ?? null,
        recurrence: input.recurrence ?? 'daily',
        days: input.days ?? [],
        target_per_week: input.targetPerWeek ?? 3,
        archived: false,
        sort_order: Date.now(),
        created_at: nowIso(),
        updated_at: nowIso(),
      }
      qc.setQueryData<HabitRow[]>(HABITS_KEY, (prev) => [...(prev ?? []), row])
      await syncUpsert('habits', row)
      return row
    },
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<HabitRow> & { id: string }) => {
      qc.setQueryData<HabitRow[]>(HABITS_KEY, (prev) =>
        (prev ?? []).map((h) => (h.id === patch.id ? { ...h, ...patch, updated_at: nowIso() } : h)),
      )
      await syncUpsert('habits', { ...patch, updated_at: nowIso() })
    },
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      qc.setQueryData<HabitRow[]>(HABITS_KEY, (prev) => (prev ?? []).filter((h) => h.id !== id))
      qc.setQueryData<HabitLogRow[]>(LOGS_KEY, (prev) => (prev ?? []).filter((l) => l.habit_id !== id))
      // habit_logs cascades on the foreign key, so the logs need no delete of their own.
      await syncDelete('habits', { id })
    },
  })
}

/**
 * Tap to check in, tap again to undo — the whole interaction. Writes are
 * idempotent on (habit_id, done_on), so a double tap or a replayed offline op
 * can't record the same day twice.
 */
export function useToggleCheckIn() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async ({ habitId, dateISO }: { habitId: string; dateISO: string }) => {
      const logs = qc.getQueryData<HabitLogRow[]>(LOGS_KEY) ?? []
      const existing = logs.find((l) => l.habit_id === habitId && l.done_on === dateISO)

      if (existing) {
        qc.setQueryData<HabitLogRow[]>(LOGS_KEY, (prev) => (prev ?? []).filter((l) => l.id !== existing.id))
        await syncDelete('habit_logs', { habit_id: habitId, done_on: dateISO })
        return { checked: false }
      }

      const row: HabitLogRow = {
        id: crypto.randomUUID(),
        user_id: session!.user.id,
        habit_id: habitId,
        done_on: dateISO,
        created_at: nowIso(),
      }
      qc.setQueryData<HabitLogRow[]>(LOGS_KEY, (prev) => [...(prev ?? []), row])
      await syncUpsert('habit_logs', row, 'habit_id,done_on')
      return { checked: true }
    },
  })
}
