import type { ReactNode } from 'react'
import type React from 'react'
import { NavLink, useLocation } from 'react-router'
import { SECTIONS, sectionByPath } from './sections'
import { onOutboxChange, pendingCount } from '@/lib/outbox'
import { useEffect, useState } from 'react'
import { signOut, useAuth } from '@/lib/auth'

function PendingPill() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    pendingCount().then(setCount)
    return onOutboxChange(setCount)
  }, [])
  if (count === 0) return null
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs"
      style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
      title="Changes waiting to sync"
    >
      {count} pending
    </span>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const active = sectionByPath(location.pathname)
  const { session } = useAuth()

  // The active section's colour becomes --accent for everything under it —
  // shared components never hardcode which section they're rendering in.
  const style = { '--accent': `var(--${active.var})`, '--accent-tint': `var(--${active.var}-tint)` } as React.CSSProperties

  return (
    <div className="flex min-h-screen flex-col sm:flex-row" style={style}>
      <aside
        className="hidden w-56 flex-none flex-col gap-1 border-r px-3 py-6 sm:flex"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="px-3 pb-6 text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Orbit
        </div>
        {SECTIONS.map((s) => (
          <NavItem key={s.id} section={s} />
        ))}
        <div className="mt-auto flex flex-col gap-2 px-3 pt-6">
          <PendingPill />
          {session && (
            <button onClick={() => void signOut()} className="text-left text-xs" style={{ color: 'var(--text-faint)' }}>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 pb-20 sm:pb-0">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t sm:hidden"
        style={{ borderColor: 'var(--line)', background: 'var(--bg-raised)' }}
      >
        {SECTIONS.map((s) => (
          <TabItem key={s.id} section={s} />
        ))}
      </nav>
    </div>
  )
}

function NavItem({ section }: { section: (typeof SECTIONS)[number] }) {
  const Icon = section.icon
  return (
    <NavLink
      to={section.path}
      end={section.path === '/'}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
      style={({ isActive }) =>
        isActive
          ? { background: `var(--${section.var}-tint)`, color: `var(--${section.var})`, fontWeight: 600 }
          : { color: 'var(--text-dim)' }
      }
    >
      <Icon className="h-4 w-4" />
      {section.label}
    </NavLink>
  )
}

function TabItem({ section }: { section: (typeof SECTIONS)[number] }) {
  const Icon = section.icon
  return (
    <NavLink
      to={section.path}
      end={section.path === '/'}
      className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]"
      style={({ isActive }) => ({ color: isActive ? `var(--${section.var})` : 'var(--text-faint)' })}
    >
      <Icon className="h-5 w-5" />
      {section.label}
    </NavLink>
  )
}
