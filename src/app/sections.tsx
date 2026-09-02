import type React from 'react'
export type SectionId = 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'habits'

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

export const SECTIONS: Section[] = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    var: 'dashboard',
    icon: icon('M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z'),
  },
  {
    id: 'tasks',
    path: '/tasks',
    label: 'Tasks',
    var: 'tasks',
    icon: icon('m5 12 4 4 10-10'),
  },
  {
    id: 'notes',
    path: '/notes',
    label: 'Notes',
    var: 'notes',
    icon: icon('M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm8 0v5h5'),
  },
  {
    id: 'calendar',
    path: '/calendar',
    label: 'Calendar',
    var: 'calendar',
    icon: icon('M4 8h16M7 3v4M17 3v4M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z'),
  },
  {
    id: 'habits',
    path: '/habits',
    label: 'Habits',
    var: 'habits',
    icon: icon('M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'),
  },
]

export function sectionByPath(pathname: string): Section {
  if (pathname === '/') return SECTIONS[0]
  const hit = SECTIONS.find((s) => s.id !== 'dashboard' && pathname.startsWith(s.path))
  return hit ?? SECTIONS[0]
}
