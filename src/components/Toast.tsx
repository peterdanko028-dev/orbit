import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { id: string; message: string; actionLabel?: string; onAction?: () => void }
type ToastCtx = { show: (t: Omit<Toast, 'id'>) => void }

const Ctx = createContext<ToastCtx>({ show: () => {} })
export const useToast = () => useContext(Ctx)

/** 5-second undo toasts — the plan calls for "never a confirmation dialog". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const show = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { ...t, id }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 5000),
      )
    },
    [dismiss],
  )

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm shadow-lg"
            style={{ background: 'var(--bg-raised)', borderColor: 'var(--line)', color: 'var(--text)' }}
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <button
                className="font-medium"
                style={{ color: 'var(--accent)' }}
                onClick={() => {
                  t.onAction?.()
                  dismiss(t.id)
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
