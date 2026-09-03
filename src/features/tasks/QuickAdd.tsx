import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { parseQuickAdd } from './parse'
import { useAddTask, useLists } from './hooks'

export function QuickAdd({ initialValue = '', autoFocus = false }: { initialValue?: string; autoFocus?: boolean }) {
  const [value, setValue] = useState(initialValue)
  const { data: lists = [] } = useLists()
  const addTask = useAddTask()
  const inputRef = useRef<HTMLInputElement>(null)

  // Landing here from the phone's share sheet or the "Add task" home-screen
  // shortcut should drop you straight into typing, not require a tap first.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const parsed = parseQuickAdd(trimmed, lists)
    if (!parsed.title) return
    addTask.mutate({
      title: parsed.title,
      starred: parsed.starred,
      dueOn: parsed.dueOn,
      dueAt: parsed.dueAt,
      listId: parsed.listId,
    })
    setValue('')
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task… try “call Sam tomorrow 3pm ! #errands”"
        aria-label="Add a task"
      />
      <Button type="submit" disabled={!value.trim()}>
        Add
      </Button>
    </form>
  )
}
