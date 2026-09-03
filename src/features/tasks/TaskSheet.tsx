import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import type { ListRow, TaskRow } from '@/lib/supabase'
import { useAddTask, useCompleteTask, useDeleteTask, useSubtasks, useUpdateTask } from './hooks'
import { useToast } from '@/components/Toast'

const AVOID_REASONS = [
  { key: 'big', label: "It's too big", hint: 'Try breaking it into a couple of smaller steps below.' },
  { key: 'unclear', label: "I don't know where to start", hint: 'Fill in "First step" below with the smallest physical action.' },
  { key: 'boring', label: "It's boring", hint: 'Pair it with something you enjoy — music, a snack, a call with a friend.' },
  { key: 'anxious', label: 'It makes me anxious', hint: 'Give yourself just 5 minutes on it. You can stop after that.' },
  { key: 'drop', label: "I don't need to do this", hint: null },
] as const

function AvoidancePrompt({ onDrop }: { onDrop: () => void }) {
  const [picked, setPicked] = useState<(typeof AVOID_REASONS)[number] | null>(null)
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--accent-tint)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        This has come up a few times. Why am I avoiding it?
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {AVOID_REASONS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => (r.key === 'drop' ? onDrop() : setPicked(r))}
            className="rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: picked?.key === r.key ? 'var(--accent)' : 'var(--line)',
              color: picked?.key === r.key ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      {picked?.hint && (
        <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          {picked.hint}
        </p>
      )}
    </div>
  )
}

function Subtasks({ taskId }: { taskId: string }) {
  const subtasks = useSubtasks(taskId)
  const add = useAddTask()
  const { complete, reopen } = useCompleteTask()
  const [value, setValue] = useState('')

  const submit = () => {
    const title = value.trim()
    if (!title) return
    add.mutate({ title, parentId: taskId })
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      {subtasks.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
          <input
            type="checkbox"
            checked={s.status === 'done'}
            onChange={() => (s.status === 'done' ? reopen(s) : complete(s))}
          />
          <span style={{ textDecoration: s.status === 'done' ? 'line-through' : 'none', color: s.status === 'done' ? 'var(--text-faint)' : 'var(--text)' }}>
            {s.title}
          </span>
        </label>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a step…" aria-label="Add a subtask" />
        <Button type="submit" variant="secondary" disabled={!value.trim()}>
          Add
        </Button>
      </form>
    </div>
  )
}

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
  const { show } = useToast()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [starred, setStarred] = useState(false)
  const [listId, setListId] = useState<string>('')
  const [firstStep, setFirstStep] = useState('')
  const [whenCue, setWhenCue] = useState('')
  const [whereCue, setWhereCue] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setNotes(task.notes ?? '')
    setDueOn(task.due_on ?? '')
    setStarred(task.priority > 0)
    setListId(task.list_id ?? '')
    setFirstStep(task.first_step ?? '')
    setWhenCue(task.when_cue ?? '')
    setWhereCue(task.where_cue ?? '')
    setDetailsOpen(Boolean(task.first_step || task.when_cue || task.where_cue))
  }, [task])

  if (!task) return null

  const save = () => {
    update.mutate({
      id: task.id,
      title: title.trim() || task.title,
      notes: notes.trim() || null,
      due_on: dueOn || null,
      priority: starred ? 3 : 0,
      list_id: listId || null,
      first_step: firstStep.trim() || null,
      when_cue: whenCue.trim() || null,
      where_cue: whereCue.trim() || null,
    })
    onClose()
  }

  const clear = () => {
    del.mutate(task.id)
    onClose()
    show({ message: 'Cleared' })
  }

  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title="Edit task"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={clear} style={{ color: 'var(--danger)' }}>
            Clear
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
        {task.rollover_count >= 2 && <AvoidancePrompt onDrop={clear} />}

        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Title
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>

        <button
          type="button"
          onClick={() => setStarred((s) => !s)}
          className="flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm"
          style={{
            borderColor: starred ? 'var(--tasks)' : 'var(--line)',
            color: starred ? 'var(--tasks)' : 'var(--text-dim)',
          }}
        >
          <span>{starred ? '★' : '☆'}</span>
          Most important today
        </button>

        <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
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

        {!detailsOpen ? (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="self-start text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            + Add details (first step, when, where)
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
            <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
              First step
              <Input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} placeholder="The smallest physical action" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                When
                <Input value={whenCue} onChange={(e) => setWhenCue(e.target.value)} placeholder="After coffee" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                Where
                <Input value={whereCue} onChange={(e) => setWhereCue(e.target.value)} placeholder="Desk" />
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
            Break it down
          </span>
          <Subtasks taskId={task.id} />
        </div>
      </div>
    </Sheet>
  )
}
