import { useEffect, useState } from 'react'
import { api } from './api'
import TaskItem from './TaskItem'

const FILTERS = { all: () => true, active: (t) => !t.completed, completed: (t) => t.completed }

export default function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api
      .listTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const addTask = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const task = await api.createTask({ title, description })
      setTasks((prev) => [task, ...prev])
      setTitle('')
      setDescription('')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const updateTask = async (id, changes) => {
    try {
      const updated = await api.updateTask(id, changes)
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
      setError('')
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const deleteTask = async (id) => {
    try {
      await api.deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const visible = tasks.filter(FILTERS[filter])
  const remaining = tasks.filter((t) => !t.completed).length

  return (
    <div className="container">
      <header className="header">
        <div>
          <p className="eyebrow">IQT-FSD-2026</p>
          <h1>Task Manager</h1>
          <p className="muted">{remaining} of {tasks.length} tasks remaining</p>
        </div>
      </header>

      <div className="layout">
        <main>
          <form className="card add-form" onSubmit={addTask}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" maxLength={200} aria-label="New task title" required />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} aria-label="New task description" />
            <button type="submit" className="btn primary">Add task</button>
          </form>

          {error && <p className="error" role="alert">{error}</p>}

          <div className="filters" role="tablist">
            {Object.keys(FILTERS).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="muted">Loading tasks…</p>
          ) : visible.length === 0 ? (
            <p className="empty">No {filter === 'all' ? '' : filter} tasks yet.</p>
          ) : (
            <ul className="task-list">
              {visible.map((t) => (
                <TaskItem key={t.id} task={t} onUpdate={updateTask} onDelete={deleteTask} />
              ))}
            </ul>
          )}
        </main>

      </div>
    </div>
  )
}
