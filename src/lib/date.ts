/** Local calendar date as YYYY-MM-DD. Never toISOString() for this — that
 * converts to UTC first, silently shifting "today" onto the wrong day
 * whenever the browser's UTC offset crosses midnight. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Words, not just a date — and never "Overdue" in red. A past date reads as
 * its plain date (faint), matching the no-guilt handling of rolled-over
 * tasks: they're just in Today, not flagged.
 */
export function formatRelativeDate(dueOn: string, now = new Date()): { label: string; past: boolean } {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueOn + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return { label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), past: true }
  if (diffDays === 0) return { label: 'Today', past: false }
  if (diffDays === 1) return { label: 'Tomorrow', past: false }
  if (diffDays > 1 && diffDays <= 6) return { label: `In ${diffDays} days`, past: false }
  return { label: due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), past: false }
}
