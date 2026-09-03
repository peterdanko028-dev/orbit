import { useEffect, useState } from 'react'

/**
 * The current time, ticking once a minute — enough for a "Now / Next" card
 * and a timeline's now-marker without re-rendering every second. Also
 * refreshes on visibilitychange, so a phone that's been asleep for an hour
 * catches up the moment it's looked at again rather than waiting for the
 * next tick.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])

  return now
}
