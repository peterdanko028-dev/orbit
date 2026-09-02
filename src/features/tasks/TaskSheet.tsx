import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import type { ListRow, TaskRow } from '@/lib/supabase'
import { useDeleteTask, useUpdateTask } from './hooks'

export function TaskSheet({
  task,
  lists,
  onClose,
}: {
  task: TaskRow | null
  lists: ListRow[]
  onClose: () => void
}) {
  const update = useUpdateTask()
  const del = useDeleteTask()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0)
  const [listId, setListId] = useState<string>('')

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setNotes(task.notes ?? '')
    setDueOn(task.due_on ?? '')
    setPriority(task.priority)
    setListId(task.list_id ?? '')
  }, [task])

  if (!task) return null

  const save = () => {
    update.mutate({
      id: task.id,
      title: title.trim() || task.title,
      notes: notes.trim() || null,
      due_on: dueOn || null,
      priority,
      list_id: listId || null,
    })
    onClose()
  }

  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title="Edit task"
      footer={
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              del.mutate(task.id)
              onClose()
            }}
            style={{ color: 'var(--danger)' }}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Title
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            Due date
            <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as 0 | 1 | 2 | 3)}
              className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            >
              <option value={0}>None</option>
              <option value={1}>!</option>
              <option value={2}>!!</option>
              <option value={3}>!!!</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          List
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
          >
            <option value="">No list</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Sheet>
  )
}
