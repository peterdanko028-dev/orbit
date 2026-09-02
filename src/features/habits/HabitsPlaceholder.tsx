import { SectionPlaceholder } from '@/app/SectionPlaceholder'

export function HabitsPlaceholder() {
  return (
    <SectionPlaceholder
      label="Habits"
      accent="var(--habits)"
      tint="var(--habits-tint)"
      description="Streaks and recurring check-ins, feeding back into the dashboard."
    />
  )
}
