import { useState } from 'react'

export default function TaskItem({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)

  const save = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const ok = await onUpdate(task.id, { title, description })
    if (ok) setEditing(false)
  }

  const cancel = () => {
    setTitle(task.title)
    setDescription(task.description)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="task editing">
        <form onSubmit={save} className="task-edit">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label="Task title" autoFocus required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} aria-label="Task description" placeholder="Description (optional)" />
          <div className="actions">
            <button type="submit" className="btn primary">Save</button>
            <button type="button" className="btn" onClick={cancel}>Cancel</button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={`task ${task.completed ? 'done' : ''}`}>
      <label className="check">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onUpdate(task.id, { completed: !task.completed })}
          aria-label={task.completed ? 'Mark as not completed' : 'Mark as completed'}
        />
      </label>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
      </div>
      <div className="actions">
        <button className="btn" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn danger" onClick={() => onDelete(task.id)}>Delete</button>
      </div>
    </li>
  )
}
