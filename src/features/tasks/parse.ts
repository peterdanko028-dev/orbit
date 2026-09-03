import type { ListRow } from '@/lib/supabase'
import { todayISO } from '@/lib/date'

export type QuickAddResult = {
  title: string
  dueOn: string | null // YYYY-MM-DD
  dueAt: string | null // HH:MM:SS
  starred: boolean
  listId: string | null
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const toISODate = todayISO

function nextWeekday(from: Date, targetDow: number): Date {
  const d = new Date(from)
  const diff = (targetDow - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Inline quick-add parsing: `Buy milk tomorrow 3pm ! #groceries` becomes a
 * title of "Buy milk", due tomorrow at 3pm, starred, filed under the
 * "groceries" list (if it exists — an unmatched #tag is just stripped, not
 * auto-created, so a typo doesn't silently spawn a new list).
 */
export function parseQuickAdd(raw: string, lists: ListRow[], now = new Date()): QuickAddResult {
  let text = raw.trim()
  let dueOn: string | null = null
  let dueAt: string | null = null
  let starred = false
  let listId: string | null = null

  // Star: a standalone run of 1-3 exclamation marks (any count means starred).
  const priMatch = text.match(/(?:^|\s)(!{1,3})(?:\s|$)/)
  if (priMatch) {
    starred = true
    text = (text.slice(0, priMatch.index) + ' ' + text.slice(priMatch.index! + priMatch[0].length)).trim()
  }

  // List: #tagname (letters, digits, - and _).
  const listMatch = text.match(/(?:^|\s)#([\w-]+)(?:\s|$)/)
  if (listMatch) {
    const name = listMatch[1]
    const found = lists.find((l) => l.name.toLowerCase() === name.toLowerCase())
    if (found) listId = found.id
    text = (text.slice(0, listMatch.index) + ' ' + text.slice(listMatch.index! + listMatch[0].length)).trim()
  }

  // Time of day: "3pm", "3:30pm", "at 15:00".
  const timeMatch = text.match(/(?:\bat\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
  if (timeMatch && (timeMatch[3] || timeMatch[2])) {
    let hour = Number(timeMatch[1])
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0
    const meridiem = timeMatch[3]?.toLowerCase()
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    if (hour <= 23 && minute <= 59) {
      dueAt = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
      text = (text.slice(0, timeMatch.index) + ' ' + text.slice(timeMatch.index! + timeMatch[0].length)).trim()
    }
  }

  // Due date: today / tomorrow / in N days / next week / a weekday name.
  const inDaysMatch = text.match(/\bin (\d+) days?\b/i)
  if (inDaysMatch) {
    const n = Number(inDaysMatch[1])
    const d = new Date(now)
    d.setDate(d.getDate() + n)
    dueOn = toISODate(d)
    text = text.replace(inDaysMatch[0], '').trim()
  } else {
    const dateWords: [RegExp, () => Date][] = [
      [/\btoday\b/i, () => now],
      [/\btomorrow\b/i, () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d }],
      [/\bnext week\b/i, () => { const d = new Date(now); d.setDate(d.getDate() + 7); return d }],
      ...WEEKDAYS.map((w, i): [RegExp, () => Date] => [new RegExp(`\\b${w}\\b`, 'i'), () => nextWeekday(now, i)]),
    ]
    for (const [re, fn] of dateWords) {
      const m = text.match(re)
      if (m) {
        dueOn = toISODate(fn())
        text = text.replace(re, '').trim()
        break
      }
    }
  }

  text = text.replace(/\s{2,}/g, ' ').trim()
  return { title: text, dueOn, dueAt, starred, listId }
}
