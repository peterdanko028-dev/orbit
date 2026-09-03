/**
 * Write-through to Supabase with an offline fallback.
 *
 * Every feature writes optimistically to the react-query cache first and then
 * calls these — so a failed or offline write lands in the outbox instead of
 * being lost, and the UI never waits on the network.
 */
import { supabase } from './supabase'
import * as outbox from './outbox'
import type { OutboxTable } from './outbox'

export async function syncUpsert(
  table: OutboxTable,
  payload: Record<string, unknown>,
  onConflict?: string,
): Promise<void> {
  if (!navigator.onLine || !supabase) {
    await outbox.enqueue({ kind: 'upsert', table, payload, onConflict })
    return
  }
  const { error } = await supabase.from(table).upsert(payload, onConflict ? { onConflict } : undefined)
  if (error) await outbox.enqueue({ kind: 'upsert', table, payload, onConflict })
}

export async function syncDelete(table: OutboxTable, match: Record<string, unknown>): Promise<void> {
  if (!navigator.onLine || !supabase) {
    await outbox.enqueue({ kind: 'delete', table, match })
    return
  }
  const { error } = await supabase.from(table).delete().match(match)
  if (error) await outbox.enqueue({ kind: 'delete', table, match })
}
