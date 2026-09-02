import type { TaskRow as TaskRowType, ListRow } from '@/lib/supabase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const PRIORITY_LABEL = ['', '!', '!!', '!!!']

function formatDue(dueOn: string | null): { label: string; overdue: boolean } | null {
  if (!dueOn) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueOn + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return { label: 'Overdue', overdue: true }
  if (diffDays === 0) return { label: 'Today', overdue: false }
  if (diffDays === 1) return { label: 'Tomorrow', overdue: false }
  return { label: due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), overdue: false }
}

export function TaskRow({
  task,
  list,
  onOpen,
  onComplete,
  onReopen,
}: {
  task: TaskRowType
  list?: ListRow
  onOpen: () => void
  onComplete: () => void
  onReopen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const due = formatDue(task.due_on)
  const done = task.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
      data-testid="task-row"
    >
      <button
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        onClick={done ? onReopen : onComplete}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-xs"
        style={{
          borderColor: done ? 'var(--ok)' : 'var(--line)',
          background: done ? 'var(--ok)' : 'transparent',
          color: 'white',
        }}
      >
        {done ? '✓' : ''}
      </button>

      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div
          className="truncate text-sm"
          style={{ color: done ? 'var(--text-faint)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}
        >
          {task.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-faint)' }}>
          {due && <span style={{ color: due.overdue && !done ? 'var(--danger)' : undefined }}>{due.label}</span>}
          {task.priority > 0 && <span style={{ color: 'var(--tasks)' }}>{PRIORITY_LABEL[task.priority]}</span>}
          {list && <span>{list.name}</span>}
        </div>
      </button>

      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex-none px-1 py-1 text-sm"
        style={{ color: 'var(--text-faint)', touchAction: 'none', cursor: 'grab' }}
      >
        ⠿
      </button>
    </div>
  )
}
