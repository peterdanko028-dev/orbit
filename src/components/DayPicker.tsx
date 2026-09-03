const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * A row of round weekday toggles. 0 = Sunday … 6 = Saturday in `value`
 * regardless of display order — `order` only changes which comes first on
 * screen, so Habits can stay Sunday-first while Schedule reads Monday-first.
 */
export function DayPicker({
  value,
  onChange,
  order = [0, 1, 2, 3, 4, 5, 6],
}: {
  value: number[]
  onChange: (days: number[]) => void
  order?: number[]
}) {
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])

  return (
    <div className="flex gap-1.5">
      {order.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          aria-pressed={value.includes(d)}
          aria-label={
            ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]
          }
          className="h-9 w-9 rounded-full border text-xs"
          style={{
            borderColor: value.includes(d) ? 'var(--accent)' : 'var(--line)',
            background: value.includes(d) ? 'var(--accent-tint)' : 'transparent',
            color: value.includes(d) ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {DAY_NAMES[d]}
        </button>
      ))}
    </div>
  )
}
