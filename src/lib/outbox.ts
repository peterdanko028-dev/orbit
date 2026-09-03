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

export type OutboxTable = 'tasks' | 'habits' | 'habit_logs' | 'blocks' | 'block_skips'

type OutboxOp =
  | {
      id: string
      kind: 'upsert'
      table: OutboxTable
      payload: Record<string, unknown>
      /** Comma-separated columns of the unique constraint to merge on, when it isn't the primary key. */
      onConflict?: string
      createdAt: number
    }
  | { id: string; kind: 'delete'; table: OutboxTable; match: Record<string, unknown>; createdAt: number }
  // Ops queued by an older build, before the queue understood tables other
  // than tasks. Kept readable so an upgrade mid-flight doesn't drop writes.
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

/** Plain Omit over a union collapses it to the shared keys, so distribute it across the members. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type NewOutboxOp = DistributiveOmit<OutboxOp, 'id' | 'createdAt'>

export async function enqueue(op: NewOutboxOp): Promise<void> {
  const queue = await readQueue()
  queue.push({ ...op, id: crypto.randomUUID(), createdAt: Date.now() } as OutboxOp)
  await writeQueue(queue)
  void drain()
}

async function apply(op: OutboxOp): Promise<void> {
  if (!supabase) throw new Error('no client')
  if (op.kind === 'upsert' || op.kind === 'upsert-task') {
    const onConflict = op.kind === 'upsert' ? op.onConflict : undefined
    const { error } = await supabase.from(op.table).upsert(op.payload, onConflict ? { onConflict } : undefined)
    if (error) throw error
    return
  }
  const match = op.kind === 'delete' ? op.match : { id: op.payload.id }
  const { error } = await supabase.from(op.table).delete().match(match)
  if (error) throw error
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
        await apply(op)
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
