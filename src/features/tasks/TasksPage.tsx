import { useMemo, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { TaskRow as TaskRowType } from '@/lib/supabase'
import { QuickAdd } from './QuickAdd'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import { useCompleteTask, useLists, useReorderTasks, useTasks } from './hooks'
import { useToast } from '@/components/Toast'

type GroupKey = 'overdue' | 'today' | 'upcoming' | 'someday' | 'done'
const GROUP_LABEL: Record<GroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  someday: 'Someday',
  done: 'Done',
}

function groupOf(task: TaskRowType): GroupKey {
  if (task.status === 'done') return 'done'
  if (!task.due_on) return 'someday'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.due_on + 'T00:00:00')
  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

export function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks()
  const { data: lists = [] } = useLists()
  const { complete, reopen } = useCompleteTask()
  const reorder = useReorderTasks()
  const { show } = useToast()
  const [editing, setEditing] = useState<TaskRowType | null>(null)
  const [listFilter, setListFilter] = useState<string>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const filtered = useMemo(
    () => (listFilter === 'all' ? tasks : tasks.filter((t) => t.list_id === listFilter)),
    [tasks, listFilter],
  )

  const groups = useMemo(() => {
    const g: Record<GroupKey, TaskRowType[]> = { overdue: [], today: [], upcoming: [], someday: [], done: [] }
    for (const t of filtered) g[groupOf(t)].push(t)
    for (const key of Object.keys(g) as GroupKey[]) g[key].sort((a, b) => a.sort_order - b.sort_order)
    return g
  }, [filtered])

  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists])

  const onDragEnd = (groupKey: GroupKey) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const items = groups[groupKey]
    const oldIndex = items.findIndex((t) => t.id === active.id)
    const newIndex = items.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(items, oldIndex, newIndex).map((t, i) => ({ ...t, sort_order: i }))
    reorder.mutate(reordered)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Tasks
        </h1>
        <select
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          className="rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}
        >
          <option value="all">All lists</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <QuickAdd />

      {isLoading && <p style={{ color: 'var(--text-faint)' }}>Loading…</p>}

      {(['overdue', 'today', 'upcoming', 'someday', 'done'] as GroupKey[]).map((key) => {
        const items = groups[key]
        if (items.length === 0) return null
        return (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
              {GROUP_LABEL[key]} · {items.length}
            </h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(key)}>
              <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {items.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      list={task.list_id ? listById.get(task.list_id) : undefined}
                      onOpen={() => setEditing(task)}
                      onComplete={() => {
                        complete(task)
                        show({ message: 'Task completed', actionLabel: 'Undo', onAction: () => reopen(task) })
                      }}
                      onReopen={() => reopen(task)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )
      })}

      {!isLoading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          Nothing here yet — add your first task above.
        </p>
      )}

      <TaskSheet task={editing} lists={lists} onClose={() => setEditing(null)} />
    </div>
  )
}
