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

/** YYYY-MM-DD n days before (or after, if positive) the given day. */
export function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return todayISO(d)
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD string, in local time. */
export function weekdayOf(iso: string): number {
  return new Date(iso + 'T00:00:00').getDay()
}

/** 'HH:MM:SS' or 'HH:MM' → minutes since local midnight. */
export function toMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(':')
  return Number(h) * 60 + Number(m)
}

/** Minutes since local midnight → 'HH:MM:00', for writing back to a `time` column. */
export function fromMinutes(min: number): string {
  const h = String(Math.floor(min / 60) % 24).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}:00`
}

/** Minutes since local midnight, in the reader's locale time format — "8:30 AM" / "08:30". */
export function formatTime(min: number, now = new Date()): string {
  const d = new Date(now)
  d.setHours(Math.floor(min / 60), min % 60, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Minutes since local midnight, right now (or for a given Date). */
export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** The Monday (YYYY-MM-DD) of the week containing this date, in local time. */
export function mondayOf(iso: string): string {
  const dow = weekdayOf(iso) // 0 = Sunday … 6 = Saturday
  const backToMonday = dow === 0 ? -6 : 1 - dow
  return shiftISO(iso, backToMonday)
}

/** The 7 local dates Monday through Sunday for the week starting at `mondayIso`. */
export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftISO(mondayIso, i))
}

/** A span of minutes as "35 min" / "2 h" / "2 h 30". */
export function formatDurationMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m}`
}
