import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// A stub client would throw on every call, so until the env vars are set we
// simply never construct one — callers check supabaseConfigured first (see
// lib/auth.tsx), which is what lets the app boot and show a clear setup
// screen instead of a blank crash.
export const supabase = supabaseConfigured ? createClient(url!, anonKey!) : null

export type ListRow = {
  id: string
  user_id: string
  name: string
  color: string | null
  sort_order: number
  created_at: string
}

export type TaskStatus = 'todo' | 'done'

export type TaskRow = {
  id: string
  user_id: string
  list_id: string | null
  title: string
  notes: string | null
  status: TaskStatus
  priority: 0 | 1 | 2 | 3
  due_on: string | null // YYYY-MM-DD
  due_at: string | null // HH:MM:SS
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
