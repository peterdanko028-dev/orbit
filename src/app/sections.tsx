import type React from 'react'
export type SectionId = 'today' | 'tasks' | 'notes' | 'calendar' | 'habits'

export type Section = {
  id: SectionId
  path: string
  label: string
  /** CSS var name (without --) carrying this section's accent color. */
  var: string
  icon: (props: { className?: string }) => React.JSX.Element
}

const icon =
  (paths: string) =>
  ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths} />
      </g>
    </svg>
  )

// Notes and Calendar stay out of the nav until they're actually built — a tab
// that opens to "Coming soon" is exactly the unfinished-feeling clutter the
// app is trying not to be. See their placeholder files, unused for now, for
// what's still to build.
export const SECTIONS: Section[] = [
  {
    id: 'today',
    path: '/',
    label: 'Today',
    var: 'today',
    icon: icon('M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'),
  },
  {
    id: 'tasks',
    path: '/tasks',
    label: 'Tasks',
    var: 'tasks',
    icon: icon('m5 12 4 4 10-10'),
  },
  {
    id: 'habits',
    path: '/habits',
    label: 'Habits',
    var: 'habits',
    icon: icon('M4 12a8 8 0 0 1 8-8c2.4 0 4.6 1 6.2 2.7M20 12a8 8 0 0 1-8 8c-2.4 0-4.6-1-6.2-2.7M18.5 3.2v3.5H15M5.5 20.8v-3.5H9'),
  },
]

export function sectionByPath(pathname: string): Section {
  if (pathname === '/') return SECTIONS[0]
  const hit = SECTIONS.find((s) => s.id !== 'today' && pathname.startsWith(s.path))
  return hit ?? SECTIONS[0]
}
