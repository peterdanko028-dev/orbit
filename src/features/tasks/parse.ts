import type { ListRow } from '@/lib/supabase'

export type QuickAddResult = {
  title: string
  dueOn: string | null // YYYY-MM-DD
  priority: 0 | 1 | 2 | 3
  listId: string | null
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function nextWeekday(from: Date, targetDow: number): Date {
  const d = new Date(from)
  const diff = (targetDow - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Inline quick-add parsing: `Buy milk tomorrow !! #groceries` becomes a title
 * of "Buy milk", due tomorrow, priority 2, filed under the "groceries" list
 * (if it exists — an unmatched #tag is just stripped, not auto-created, so a
 * typo doesn't silently spawn a new list).
 */
export function parseQuickAdd(raw: string, lists: ListRow[], now = new Date()): QuickAddResult {
  let text = raw.trim()
  let dueOn: string | null = null
  let priority: 0 | 1 | 2 | 3 = 0
  let listId: string | null = null

  // Priority: a standalone run of 1-3 exclamation marks.
  const priMatch = text.match(/(?:^|\s)(!{1,3})(?:\s|$)/)
  if (priMatch) {
    priority = Math.min(3, priMatch[1].length) as 0 | 1 | 2 | 3
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

  // Due date: today / tomorrow / next week / a weekday name.
  const dateWords: [RegExp, () => Date][] = [
    [/\btoday\b/i, () => now],
    [/\btomorrow\b/i, () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d }],
    [/\bnext week\b/i, () => { const d = new Date(now); d.setDate(d.getDate() + 7); return d }],
    ...WEEKDAYS.map((w, i): [RegExp, () => Date] => [new RegExp(`\b${w}\b`, 'i'), () => nextWeekday(now, i)]),
  ]
  for (const [re, fn] of dateWords) {
    const m = text.match(re)
    if (m) {
      dueOn = toISODate(fn())
      text = text.replace(re, '').trim()
      break
    }
  }

  text = text.replace(/\s{2,}/g, ' ').trim()
  return { title: text, dueOn, priority, listId }
}
