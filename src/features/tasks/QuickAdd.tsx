import { useState } from 'react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { parseQuickAdd } from './parse'
import { useAddTask, useLists } from './hooks'

export function QuickAdd() {
  const [value, setValue] = useState('')
  const { data: lists = [] } = useLists()
  const addTask = useAddTask()

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const parsed = parseQuickAdd(trimmed, lists)
    if (!parsed.title) return
    addTask.mutate({
      title: parsed.title,
      priority: parsed.priority,
      dueOn: parsed.dueOn,
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task… try “call Sam tomorrow !! #errands”"
        aria-label="Add a task"
      />
      <Button type="submit" disabled={!value.trim()}>
        Add
      </Button>
    </form>
  )
}
