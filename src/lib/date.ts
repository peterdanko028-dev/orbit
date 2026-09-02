/** Local calendar date as YYYY-MM-DD. Never toISOString() for this — that
 * converts to UTC first, silently shifting "today" onto the wrong day
 * whenever the browser's UTC offset crosses midnight. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
