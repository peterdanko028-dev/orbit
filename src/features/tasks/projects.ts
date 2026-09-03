import type { TaskRow } from '@/lib/supabase'

export type ProjectStats = { done: number; total: number }

/**
 * A "project" isn't a new kind of thing — it's any top-level task that has
 * subtasks, same as it always was. This just derives done/total per parent
 * from the tasks already in cache, the same pattern useSubtasks uses.
 */
export function projectStats(tasks: TaskRow[]): Map<string, ProjectStats> {
  const stats = new Map<string, ProjectStats>()
  for (const t of tasks) {
    if (!t.parent_id) continue
    const s = stats.get(t.parent_id) ?? { done: 0, total: 0 }
    s.total += 1
    if (t.status === 'done') s.done += 1
    stats.set(t.parent_id, s)
  }
  return stats
}
