import { SectionPlaceholder } from '@/app/SectionPlaceholder'

export function NotesPlaceholder() {
  return (
    <SectionPlaceholder
      label="Notes"
      accent="var(--notes)"
      tint="var(--notes-tint)"
      description="A place to write and find things again — coming after Tasks. It'll live in-app and sync across devices, kept as plain Markdown."
    />
  )
}
