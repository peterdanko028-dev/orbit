import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, type ListRow, type TaskRow } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import * as outbox from '@/lib/outbox'

const TASKS_KEY = ['tasks'] as const
const LISTS_KEY = ['lists'] as const

export function useLists() {
  const { session } = useAuth()
  return useQuery({
    queryKey: LISTS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<ListRow[]> => {
      const { data, error } = await supabase!.from('lists').select('*').order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useTasks() {
  const { session } = useAuth()
  return useQuery({
    queryKey: TASKS_KEY,
    enabled: !!session,
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase!.from('tasks').select('*').order('sort_order')
      if (error) throw error
      return data
    },
  })
}

function nowIso() {
  return new Date().toISOString()
}

/** Writes optimistically to the cache, then to Supabase — falling back to the offline outbox on failure. */
async function syncUpsert(payload: Record<string, unknown>) {
  if (!navigator.onLine || !supabase) {
    await outbox.enqueue({ kind: 'upsert-task', table: 'tasks', payload })
    return
  }
  const { error } = await supabase.from('tasks').upsert(payload)
  if (error) await outbox.enqueue({ kind: 'upsert-task', table: 'tasks', payload })
}

async function syncDelete(id: string) {
  if (!navigator.onLine || !supabase) {
    await outbox.enqueue({ kind: 'delete-task', table: 'tasks', payload: { id } })
    return
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) await outbox.enqueue({ kind: 'delete-task', table: 'tasks', payload: { id } })
}

type NewTask = {
  title: string
  notes?: string | null
  listId?: string | null
  priority?: 0 | 1 | 2 | 3
  dueOn?: string | null
  dueAt?: string | null
}

export function useAddTask() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (input: NewTask) => {
      const id = crypto.randomUUID()
      const row: TaskRow = {
        id,
        user_id: session!.user.id,
        list_id: input.listId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        status: 'todo',
        priority: input.priority ?? 0,
        due_on: input.dueOn ?? null,
        due_at: input.dueAt ?? null,
        completed_at: null,
        sort_order: Date.now(),
        created_at: nowIso(),
        updated_at: nowIso(),
      }
      qc.setQueryData<TaskRow[]>(TASKS_KEY, (prev) => [...(prev ?? []), row])
      await syncUpsert(row)
      return row
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<TaskRow> & { id: string }) => {
      qc.setQueryData<TaskRow[]>(TASKS_KEY, (prev) =>
        (prev ?? []).map((t) => (t.id === patch.id ? { ...t, ...patch, updated_at: nowIso() } : t)),
      )
      await syncUpsert({ ...patch, updated_at: nowIso() })
    },
  })
}

export function useCompleteTask() {
  const update = useUpdateTask()
  return {
    complete: (task: TaskRow) =>
      update.mutate({ id: task.id, status: 'done', completed_at: nowIso() }),
    reopen: (task: TaskRow) =>
      update.mutate({ id: task.id, status: 'todo', completed_at: null }),
  }
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      qc.setQueryData<TaskRow[]>(TASKS_KEY, (prev) => (prev ?? []).filter((t) => t.id !== id))
      await syncDelete(id)
    },
  })
}

export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ordered: TaskRow[]) => {
      qc.setQueryData<TaskRow[]>(TASKS_KEY, (prev) => {
        if (!prev) return prev
        const byId = new Map(ordered.map((t) => [t.id, t]))
        return prev.map((t) => byId.get(t.id) ?? t)
      })
      await Promise.all(ordered.map((t) => syncUpsert({ id: t.id, sort_order: t.sort_order, updated_at: nowIso() })))
    },
  })
}

export function useAddList() {
  const qc = useQueryClient()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      const row: ListRow = {
        id: crypto.randomUUID(),
        user_id: session!.user.id,
        name: input.name,
        color: input.color ?? null,
        sort_order: Date.now(),
        created_at: nowIso(),
      }
      qc.setQueryData<ListRow[]>(LISTS_KEY, (prev) => [...(prev ?? []), row])
      // Lists are created rarely and the outbox only knows the tasks table, so
      // this one operation needs a live connection rather than queueing.
      if (!navigator.onLine || !supabase) {
        qc.setQueryData<ListRow[]>(LISTS_KEY, (prev) => (prev ?? []).filter((l) => l.id !== row.id))
        throw new Error('Creating a list needs a connection — try again once you are back online.')
      }
      const { error } = await supabase.from('lists').upsert(row)
      if (error) {
        qc.setQueryData<ListRow[]>(LISTS_KEY, (prev) => (prev ?? []).filter((l) => l.id !== row.id))
        throw error
      }
      return row
    },
  })
}
