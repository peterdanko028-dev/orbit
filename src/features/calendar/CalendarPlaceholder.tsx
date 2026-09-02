import { SectionPlaceholder } from '@/app/SectionPlaceholder'

export function CalendarPlaceholder() {
  return (
    <SectionPlaceholder
      label="Calendar"
      accent="var(--calendar)"
      tint="var(--calendar-tint)"
      description="Day and week views for time-blocking your tasks — app-only, no external calendar connected."
    />
  )
}
