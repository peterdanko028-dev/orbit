/**
 * Offline write queue.
 *
 * The premise: Orbit is used on a phone that loses signal. A mutation made
 * offline is queued here instead of failing silently, and replayed in order
 * once the network returns. This is deliberately last-write-wins — fine for a
 * single-user app — see the plan's "Things worth flagging".
 */
import { get, set } from 'idb-keyval'
import { supabase } from './supabase'

type OutboxOp =
  | { id: string; kind: 'upsert-task'; table: 'tasks'; payload: Record<string, unknown>; createdAt: number }
  | { id: string; kind: 'delete-task'; table: 'tasks'; payload: { id: string }; createdAt: number }

const KEY = 'orbit-outbox'
type Listener = (count: number) => void
const listeners = new Set<Listener>()

async function readQueue(): Promise<OutboxOp[]> {
  return (await get(KEY)) ?? []
}

async function writeQueue(queue: OutboxOp[]): Promise<void> {
  await set(KEY, queue)
  for (const l of listeners) l(queue.length)
}

export function onOutboxChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length
}

export async function enqueue(op: Omit<OutboxOp, 'id' | 'createdAt'>): Promise<void> {
  const queue = await readQueue()
  queue.push({ ...op, id: crypto.randomUUID(), createdAt: Date.now() } as OutboxOp)
  await writeQueue(queue)
  void drain()
}

let draining = false

/** Replays queued ops in order. Stops (keeping the rest queued) on the first network failure. */
export async function drain(): Promise<void> {
  if (draining || !supabase || !navigator.onLine) return
  draining = true
  try {
    let queue = await readQueue()
    while (queue.length > 0) {
      const op = queue[0]
      try {
        if (op.kind === 'upsert-task') {
          const { error } = await supabase.from('tasks').upsert(op.payload)
          if (error) throw error
        } else if (op.kind === 'delete-task') {
          const { error } = await supabase.from('tasks').delete().eq('id', op.payload.id)
          if (error) throw error
        }
        queue = queue.slice(1)
        await writeQueue(queue)
      } catch (err) {
        // A real network drop should be retried later, not drop the op — so
        // stop here rather than skip it. Anything else (e.g. a bad payload)
        // would otherwise wedge the queue forever, so it's dropped with a
        // console warning instead of retried infinitely.
        if (!navigator.onLine) break
        console.warn('[outbox] dropping op after error', op, err)
        queue = queue.slice(1)
        await writeQueue(queue)
      }
    }
  } finally {
    draining = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void drain())
}
