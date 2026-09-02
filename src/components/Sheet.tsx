import type { ReactNode } from 'react'
import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Bottom sheet on phone, side panel on laptop — one component, CSS decides
 * which via the media query below. Both are just fixed-position panels so
 * there's no library dependency for something this small.
 */
export function Sheet({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div
        className="relative z-10 flex max-h-[86vh] w-full flex-col rounded-t-2xl border-t sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-2xl sm:border-t-0 sm:border-l"
        style={{ background: 'var(--bg-raised)', borderColor: 'var(--line)' }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full px-2.5 py-1 text-sm"
            style={{ color: 'var(--text-dim)' }}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t px-5 py-3" style={{ borderColor: 'var(--line)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
