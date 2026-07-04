import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const PRIORITY_COLORS = { high: 'var(--rose)', medium: 'var(--amber)', low: 'var(--cyan)' };
const PRIORITY_LABELS = { high: '🔴 High', medium: '🟡 Medium', low: '🔵 Low' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AssistantPage({ user }) {
  const [tab, setTab]           = useState('todo');
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDueAt, setNewDueAt] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [planner, setPlanner] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yaarax_planner') || '{}'); } catch { return {}; }
  });
  const [plannerEdit, setPlannerEdit] = useState({ day: null, time: '', subject: '' });

  useEffect(() => { loadTasks(); }, [tab]);

  async function loadTasks() {
    if (tab === 'planner') return;
    setLoading(true);
    try {
      const data = await api.getTasks(tab === 'todo' ? 'todo' : 'reminder');
      setTasks(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const data = { type: tab === 'todo' ? 'todo' : 'reminder', title: newTitle.trim(), notes: newNotes.trim(), due_at: newDueAt || null, priority: newPriority };
    const res = await api.createTask(data);
    setTasks(prev => [{ id: res.id, ...data, done: 0, created_at: new Date().toISOString() }, ...prev]);
    setNewTitle(''); setNewNotes(''); setNewDueAt('');
    if (tab === 'reminder' && newDueAt && 'Notification' in window) {
      if (Notification.permission === 'granted') scheduleNotification(newTitle.trim(), newDueAt);
      else Notification.requestPermission().then(p => { if (p === 'granted') scheduleNotification(newTitle.trim(), newDueAt); });
    }
  }

  function scheduleNotification(title, dueAt) {
    const delay = new Date(dueAt) - Date.now();
    if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000)
      setTimeout(() => new Notification('⏰ Yaarax AI Reminder', { body: title, icon: '/favicon.ico' }), delay);
  }

  async function toggleDone(task) {
    await api.updateTask(task.id, { done: !task.done });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: t.done ? 0 : 1 } : t));
  }

  async function deleteTask(id) {
    await api.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function formatDue(iso) {
    if (!iso) return null;
    const d = new Date(iso), now = new Date();
    const isOverdue = d < now;
    const str = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { str, isOverdue };
  }

  function savePlannerItem() {
    if (!plannerEdit.day || !plannerEdit.subject.trim()) return;
    const updated = { ...planner };
    if (!updated[plannerEdit.day]) updated[plannerEdit.day] = [];
    updated[plannerEdit.day] = [...(updated[plannerEdit.day] || []), { time: plannerEdit.time, subject: plannerEdit.subject.trim(), id: Date.now() }]
      .sort((a, b) => a.time.localeCompare(b.time));
    setPlanner(updated);
    localStorage.setItem('yaarax_planner', JSON.stringify(updated));
    setPlannerEdit({ day: null, time: '', subject: '' });
  }

  function deletePlannerItem(day, id) {
    const updated = { ...planner, [day]: planner[day].filter(i => i.id !== id) };
    setPlanner(updated); localStorage.setItem('yaarax_planner', JSON.stringify(updated));
  }

  const doneTasks    = tasks.filter(t => t.done);
  const pendingTasks = tasks.filter(t => !t.done);

  return (
    <div className="tool-page assistant-page">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-icon" style={{ background: 'linear-gradient(135deg,#F9A826,#E3A857)', boxShadow: '0 0 28px rgba(249, 168, 38,.3)' }}>📅</div>
        <div>
          <h1 className="tool-page-title">Personal Assistant</h1>
          <p className="tool-page-sub">Manage tasks, set reminders &amp; plan your week</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tool-tabs">
        <button className={`tool-tab ${tab === 'todo' ? 'active' : ''}`}     onClick={() => setTab('todo')}>✅ To-Do</button>
        <button className={`tool-tab ${tab === 'reminder' ? 'active' : ''}`} onClick={() => setTab('reminder')}>⏰ Reminders</button>
        <button className={`tool-tab ${tab === 'planner' ? 'active' : ''}`}  onClick={() => setTab('planner')}>📅 Study Planner</button>
      </div>

      {/* TO-DO & REMINDERS */}
      {(tab === 'todo' || tab === 'reminder') && (
        <div className="assistant-content">
          {/* Add Form */}
          <form className="task-add-form" onSubmit={addTask}>
            <input
              className="task-input"
              placeholder={tab === 'todo' ? '✏️  Add a new task...' : '⏰  Add a reminder...'}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
            <div className="task-form-row">
              <input
                className="task-input-sm"
                placeholder="Notes (optional)"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
              />
              {tab === 'reminder' && (
                <input
                  type="datetime-local"
                  className="task-input-sm"
                  value={newDueAt}
                  onChange={e => setNewDueAt(e.target.value)}
                />
              )}
              <select className="task-select" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Low</option>
              </select>
              <button className="task-add-btn" type="submit">+ Add</button>
            </div>
          </form>

          {/* Stats row */}
          {tasks.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Pending', value: pendingTasks.length, color: 'var(--cyan)' },
                { label: 'Done',    value: doneTasks.length,    color: 'var(--green)' },
                { label: 'High',    value: tasks.filter(t => t.priority === 'high' && !t.done).length, color: 'var(--rose)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--b1)', borderRadius: 'var(--r3)', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'Outfit' }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Task List */}
          {loading ? (
            <div className="typing-dots" style={{ margin: '40px auto', width: 'fit-content' }}><span /><span /><span /></div>
          ) : (
            <div className="task-list">
              {pendingTasks.length === 0 && doneTasks.length === 0 && (
                <div className="task-empty">
                  <span>{tab === 'todo' ? '✅' : '⏰'}</span>
                  <p>No {tab === 'todo' ? 'tasks' : 'reminders'} yet.</p>
                  <p style={{ fontSize: 13 }}>Add one above to get started!</p>
                </div>
              )}
              {pendingTasks.map(task => {
                const due = formatDue(task.due_at);
                return (
                  <div key={task.id} className={`task-item priority-${task.priority}`}>
                    <div className="task-check" onClick={() => toggleDone(task)} style={{ borderColor: PRIORITY_COLORS[task.priority] }} />
                    <div className="task-body">
                      <div className="task-title">{task.title}</div>
                      {task.notes && <div className="task-notes">{task.notes}</div>}
                      {due && <div className={`task-due ${due.isOverdue ? 'overdue' : ''}`}>⏰ {due.str}{due.isOverdue ? ' (Overdue!)' : ''}</div>}
                    </div>
                    <div className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
                    <button className="task-delete-btn" onClick={() => deleteTask(task.id)}>✕</button>
                  </div>
                );
              })}
              {doneTasks.length > 0 && (
                <>
                  <div className="task-section-label">Completed ({doneTasks.length})</div>
                  {doneTasks.map(task => (
                    <div key={task.id} className="task-item done">
                      <div className="task-check done" onClick={() => toggleDone(task)}>✓</div>
                      <div className="task-body">
                        <div className="task-title done-title">{task.title}</div>
                      </div>
                      <button className="task-delete-btn" onClick={() => deleteTask(task.id)}>✕</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* STUDY PLANNER */}
      {tab === 'planner' && (
        <div className="planner-content">
          <div style={{ marginBottom: 16, color: 'var(--t3)', fontSize: 13 }}>
            Click <strong style={{ color: 'var(--cyan)' }}>+ Add</strong> in any day column to schedule a study session.
          </div>
          <div className="planner-grid">
            {DAYS.map(day => (
              <div key={day} className="planner-day-col">
                <div className="planner-day-header">{day}</div>
                <div className="planner-day-items">
                  {(planner[day] || []).map(item => (
                    <div key={item.id} className="planner-item">
                      <div className="planner-item-time">{item.time || '—'}</div>
                      <div className="planner-item-subject">{item.subject}</div>
                      <button className="planner-delete-btn" onClick={() => deletePlannerItem(day, item.id)}>✕</button>
                    </div>
                  ))}
                  <button className="planner-add-btn" onClick={() => setPlannerEdit({ day, time: '', subject: '' })}>
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Modal */}
          {plannerEdit.day && (
            <div className="modal-backdrop" onClick={() => setPlannerEdit({ day: null, time: '', subject: '' })}>
              <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                <div className="modal-header">
                  <span className="modal-title">📅 Add to {plannerEdit.day}</span>
                  <button className="modal-close" onClick={() => setPlannerEdit({ day: null, time: '', subject: '' })}>✕</button>
                </div>
                <div className="planner-form">
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>Time</label>
                    <input
                      type="time"
                      className="task-input-sm"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--r3)' }}
                      value={plannerEdit.time}
                      onChange={e => setPlannerEdit(p => ({ ...p, time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>Subject / Topic</label>
                    <input
                      className="task-input-sm"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--r3)' }}
                      placeholder="e.g. Physics Chapter 3"
                      value={plannerEdit.subject}
                      onChange={e => setPlannerEdit(p => ({ ...p, subject: e.target.value }))}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') savePlannerItem(); }}
                    />
                  </div>
                  <button
                    className="page-btn-primary btn-violet"
                    onClick={savePlannerItem}
                    style={{ marginTop: 4 }}
                  >
                    Save Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
