import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Circle, ClipboardList, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    try { setTodos(await request('/todos')); setError(''); }
    catch (err) { setError(`Cannot load tasks: ${err.message}. Check that the Python backend is running.`); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function addTask(event) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const created = await request('/todos', { method: 'POST', body: JSON.stringify({ title: title.trim(), description: description.trim() }) });
      setTodos(old => [created, ...old]); setTitle(''); setDescription('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function toggleTask(todo) {
    setError('');
    try {
      const updated = await request(`/todos/${todo.id}`, { method: 'PATCH', body: JSON.stringify({ completed: !todo.completed }) });
      setTodos(old => old.map(item => item.id === updated.id ? updated : item));
    } catch (err) { setError(err.message); }
  }
  async function deleteTask(todo) {
    if (!window.confirm(`Delete "${todo.title}"?`)) return;
    setError('');
    try { await request(`/todos/${todo.id}`, { method: 'DELETE' }); setTodos(old => old.filter(item => item.id !== todo.id)); }
    catch (err) { setError(err.message); }
  }
  function beginEdit(todo) { setEditingId(todo.id); setEditTitle(todo.title); setEditDescription(todo.description); }
  async function saveEdit(id) {
    if (!editTitle.trim()) return;
    setError('');
    try {
      const updated = await request(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() }) });
      setTodos(old => old.map(item => item.id === id ? updated : item)); setEditingId(null);
    } catch (err) { setError(err.message); }
  }
  const completedCount = todos.filter(t => t.completed).length;
  const visible = useMemo(() => todos.filter(todo => {
    const matchesStatus = filter === 'all' || (filter === 'completed' ? todo.completed : !todo.completed);
    const matchesSearch = `${todo.title} ${todo.description}`.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  }), [todos, filter, search]);

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="brand-icon"><Check size={22}/></span> TaskFlow</div><span className="tag">YOUR DAILY ORGANIZER</span></header>
      <section className="hero"><div className="eyebrow">STAY ORGANIZED · STAY FOCUSED</div><h1>Make today <em>count.</em></h1><p>A calm space to plan your tasks and celebrate every little win.</p></section>
      <section className="stats"><div><span className="stat-num">{todos.length}</span><span className="stat-label">Total tasks</span></div><div><span className="stat-num">{todos.length - completedCount}</span><span className="stat-label">To do</span></div><div><span className="stat-num">{completedCount}</span><span className="stat-label">Completed</span></div></section>
      <section className="panel"><h2><Plus size={19}/> Add a new task</h2><form onSubmit={addTask} className="add-form"><input aria-label="Task title" placeholder="What needs to get done?" value={title} maxLength={200} onChange={e => setTitle(e.target.value)}/><textarea aria-label="Description" placeholder="Description (optional)" value={description} maxLength={1000} onChange={e => setDescription(e.target.value)} rows={2}/><button className="primary" type="submit" disabled={!title.trim() || busy}><Plus size={17}/> {busy ? 'Adding...' : 'Add task'}</button></form></section>
      <section className="tasks-section"><div className="tasks-heading"><h2>My tasks <span>{todos.length}</span></h2><div className="search"><Search size={17}/><input aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}/></div></div><div className="tabs">{[['all','All tasks'],['active','To do'],['completed','Completed']].map(([value,label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
      {error && <div role="alert" className="error">{error} <button onClick={refresh}>Retry</button></div>}
      {loading ? <div className="empty">Loading tasks...</div> : visible.length === 0 ? <div className="empty"><ClipboardList size={42}/><strong>No tasks to show</strong><p>Add a task above or try another filter.</p></div> : <div className="todo-list">{visible.map(todo => <article className={`todo ${todo.completed ? 'done' : ''}`} key={todo.id}>{editingId === todo.id ? <div className="edit-area"><input aria-label="Edit task title" value={editTitle} onChange={e => setEditTitle(e.target.value)}/><textarea aria-label="Edit description" value={editDescription} onChange={e => setEditDescription(e.target.value)}/><div className="actions"><button onClick={() => saveEdit(todo.id)} disabled={!editTitle.trim()}><Check size={16}/> Save</button><button onClick={() => setEditingId(null)}><X size={16}/> Cancel</button></div></div> : <><button className="check" aria-label={todo.completed ? 'Mark incomplete' : 'Mark completed'} onClick={() => toggleTask(todo)}>{todo.completed ? <CheckCircle2 size={24}/> : <Circle size={24}/>}</button><div className="todo-content"><h3>{todo.title}</h3>{todo.description && <p>{todo.description}</p>}<small>{new Date(todo.created_at).toLocaleDateString()}</small></div><div className="actions"><button title="Edit task" aria-label="Edit task" onClick={() => beginEdit(todo)}><Pencil size={17}/></button><button title="Delete task" aria-label="Delete task" className="delete" onClick={() => deleteTask(todo)}><Trash2 size={17}/></button></div></>}</article>)}</div>}
      </section><footer>Made with care · React + FastAPI + SQL Server</footer>
    </main>
  );
}
