import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Edit3,
  GripVertical,
  ListPlus,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Send,
  Sun,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import './index.css'

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} startTime ISO string
 * @property {string} endTime ISO string
 * @property {'Work'|'Personal'|'Fitness'|'Focus'} category
 * @property {string} color
 * @property {'high'|'med'|'low'} priority
 * @property {boolean} completed
 */

const STORAGE_KEY = 'koops-calendar-events'
const HABITS_KEY = 'koops-calendar-habits'
const TASKS_KEY = 'koops-calendar-tasks'
const AUTH_KEY = 'koops-calendar-user'
const HOUR_START = 7
const HOUR_END = 22
const SLOT_HEIGHT = 64
const categories = ['Work', 'Personal', 'Fitness', 'Focus']
const palette = ['#0f766e', '#f97316', '#7c3aed', '#2563eb', '#dc2626', '#ca8a04']
const habitNames = ['Workout', '2L Water', 'Read 20m']

const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const atTime = (date, hour, minute = 0) => {
  const next = new Date(date)
  next.setHours(hour, minute, 0, 0)
  return next.toISOString()
}
const startOfWeek = (date) => {
  const next = new Date(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  next.setHours(0, 0, 0, 0)
  return next
}
const formatTime = (iso) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
const formatHour = (hour) => new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(2020, 0, 1, hour))
const localInputValue = (iso) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const seedEvents = (weekStart) => [
  { id: 'seed-1', title: 'Weekly team sync', description: 'Align on priorities and clear blockers.', startTime: atTime(weekStart, 9), endTime: atTime(weekStart, 10), category: 'Work', color: '#0f766e', priority: 'high', completed: false },
  { id: 'seed-2', title: 'Deep work block', description: 'Product planning and focused writing.', startTime: atTime(new Date(weekStart.getTime() + 86400000), 10, 30), endTime: atTime(new Date(weekStart.getTime() + 86400000), 12), category: 'Focus', color: '#7c3aed', priority: 'high', completed: false },
  { id: 'seed-3', title: 'Lunch with Maya', description: 'Try the new place near the studio.', startTime: atTime(new Date(weekStart.getTime() + 86400000 * 2), 12), endTime: atTime(new Date(weekStart.getTime() + 86400000 * 2), 13), category: 'Personal', color: '#f97316', priority: 'med', completed: false },
  { id: 'seed-4', title: 'Gym · Lower body', description: 'Keep it steady, 45 minutes.', startTime: atTime(new Date(weekStart.getTime() + 86400000 * 3), 18), endTime: atTime(new Date(weekStart.getTime() + 86400000 * 3), 19), category: 'Fitness', color: '#2563eb', priority: 'low', completed: false },
  { id: 'seed-5', title: 'Design review', description: 'Review the latest calendar flows.', startTime: atTime(new Date(weekStart.getTime() + 86400000 * 3), 14), endTime: atTime(new Date(weekStart.getTime() + 86400000 * 3), 15, 30), category: 'Work', color: '#0f766e', priority: 'med', completed: false },
  { id: 'seed-6', title: 'Weekly reset', description: 'Review the week and set three priorities.', startTime: atTime(new Date(weekStart.getTime() + 86400000 * 4), 16), endTime: atTime(new Date(weekStart.getTime() + 86400000 * 4), 17), category: 'Focus', color: '#7c3aed', priority: 'med', completed: false },
  { id: 'seed-7', title: 'Long run', description: 'Easy pace, fresh air, no stopwatch pressure.', startTime: atTime(new Date(weekStart.getTime() + 86400000 * 5), 9), endTime: atTime(new Date(weekStart.getTime() + 86400000 * 5), 10, 30), category: 'Fitness', color: '#2563eb', priority: 'low', completed: false },
  { id: 'seed-8', title: 'Dinner with family', description: 'Put the phone away and be present.', startTime: atTime(new Date(weekStart.getTime() + 86400000 * 6), 18), endTime: atTime(new Date(weekStart.getTime() + 86400000 * 6), 20), category: 'Personal', color: '#f97316', priority: 'med', completed: false },
]

function loadEvents(fallbackWeek) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    const seeded = seedEvents(fallbackWeek)
    if (!Array.isArray(saved) || !saved.length) return seeded
    return [...saved, ...seeded.filter((seed) => !saved.some((event) => event.id === seed.id))]
  } catch {
    return seedEvents(fallbackWeek)
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback } catch { return fallback }
}

function decodeGoogleCredential(credential) {
  try {
    const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function App() {
  const initialWeek = startOfWeek(new Date())
  const [weekStart, setWeekStart] = useState(initialWeek)
  const [events, setEvents] = useState(() => loadEvents(initialWeek))
  const [habits, setHabits] = useState(() => loadJson(HABITS_KEY, {}))
  const [tasks, setTasks] = useState(() => loadJson(TASKS_KEY, [
    { id: 'task-1', title: 'Reply to product feedback', duration: 30 },
    { id: 'task-2', title: 'Book dentist appointment', duration: 15 },
    { id: 'task-3', title: 'Outline newsletter', duration: 45 },
  ]))
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [taskDraft, setTaskDraft] = useState({ title: '', duration: '30' })
  const [now, setNow] = useState(new Date())
  const [user, setUser] = useState(() => loadJson(AUTH_KEY, null))
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantPrompt, setAssistantPrompt] = useState('')
  const [assistantResponse, setAssistantResponse] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)

  useEffect(() => { saveEvents(events) }, [events])
  useEffect(() => { localStorage.setItem(HABITS_KEY, JSON.stringify(habits)) }, [habits])
  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => { window.removeEventListener('resize', onResize); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_KEY)
  }, [user])

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * 86400000)), [weekStart])
  const visibleDays = isMobile ? [days[selectedDay]] : days
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(weekStart)
  const weekLabel = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(days[0])} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(days[6])}`

  const moveWeek = (amount) => setWeekStart(new Date(weekStart.getTime() + amount * 7 * 86400000))
  const goToday = () => { setWeekStart(startOfWeek(new Date())); setSelectedDay(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) }
  const isToday = (date) => dateKey(date) === dateKey(new Date())
  const eventsForDay = (date) => events.filter((event) => dateKey(new Date(event.startTime)) === dateKey(date))

  const openCreate = (date, hour, task = null) => {
    const duration = task ? task.duration : 60
    setModal({ mode: 'create', event: {
      id: makeId(), title: task?.title || '', description: '', startTime: atTime(date, hour), endTime: atTime(date, hour + duration / 60), category: 'Work', color: '#0f766e', priority: 'med', completed: false,
    }, sourceTask: task?.id })
  }

  const openEdit = (event) => { setDetail(null); setModal({ mode: 'edit', event: { ...event } }) }
  const updateModalEvent = (field, value) => setModal((current) => ({ ...current, event: { ...current.event, [field]: value } }))
  const submitEvent = (event) => {
    setEvents((current) => current.some((item) => item.id === event.id) ? current.map((item) => item.id === event.id ? event : item) : [...current, event])
    if (modal?.sourceTask) setTasks((current) => current.filter((task) => task.id !== modal.sourceTask))
    setModal(null)
  }
  const deleteEvent = (id) => { setEvents((current) => current.filter((event) => event.id !== id)); setDetail(null) }
  const toggleHabit = (day, habit) => setHabits((current) => ({ ...current, [dateKey(day)]: { ...(current[dateKey(day)] || {}), [habit]: !current[dateKey(day)]?.[habit] } }))
  const addTask = (event) => {
    event.preventDefault()
    if (!taskDraft.title.trim()) return
    setTasks((current) => [...current, { id: makeId(), title: taskDraft.title.trim(), duration: Number(taskDraft.duration) || 30 }])
    setTaskDraft({ title: '', duration: '30' })
  }
  const onDrop = (event, date, hour) => {
    event.preventDefault()
    const task = tasks.find((item) => item.id === event.dataTransfer.getData('task/id'))
    if (task) openCreate(date, hour, task)
  }

  const askGemini = async (event) => {
    event.preventDefault()
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setAssistantResponse('Add VITE_GEMINI_API_KEY to .env.local, then restart the dev server to enable Gemini.')
      return
    }
    setAssistantLoading(true)
    setAssistantResponse('')
    const context = events.map((item) => `${item.title} (${formatTime(item.startTime)}-${formatTime(item.endTime)}, ${item.category})`).join(', ')
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are a concise personal calendar assistant. The visible week has these events: ${context || 'no events yet'}. Answer this request in 3 short bullets maximum: ${assistantPrompt}` }] }] }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed.')
      setAssistantResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini returned no suggestions.')
    } catch (error) {
      setAssistantResponse(error.message)
    } finally {
      setAssistantLoading(false)
    }
  }

  if (!user) return <GoogleLoginScreen onLogin={setUser} />

  const analytics = categories.map((category) => {
    const total = events.filter((event) => days.some((day) => dateKey(day) === dateKey(new Date(event.startTime))) && event.category === category).reduce((sum, event) => sum + (new Date(event.endTime) - new Date(event.startTime)) / 3600000, 0)
    return { category, total }
  })
  const maxHours = Math.max(...analytics.map((item) => item.total), 1)

  return (
    <div className={`app-shell ${darkMode ? 'dark' : ''}`}>
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><CalendarDays size={19} /></div><div><p className="brand-name">koops</p><p className="brand-subtitle">personal command center</p></div></div>
        <div className="topbar-actions">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle tasks"><Menu size={18} /></button>
          <button className="text-button" onClick={goToday}>Today</button>
          <div className="week-controls"><button className="icon-button" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={18} /></button><button className="icon-button" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={18} /></button></div>
          <button className={`assistant-button ${assistantOpen ? 'active' : ''}`} onClick={() => setAssistantOpen((value) => !value)}><Sparkles size={16} /> Gemini</button>
          <button className={`analytics-button ${analyticsOpen ? 'active' : ''}`} onClick={() => setAnalyticsOpen((value) => !value)}><Activity size={16} /> Analytics</button>
          <button className="user-chip" onClick={() => setUser(null)} title="Sign out"><span>{user.name?.[0] || user.email?.[0] || 'G'}</span><b>{user.name?.split(' ')[0] || 'Account'}</b></button>
          <button className="icon-button" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle dark mode">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </header>

      <main className="main-content">
        <section className="calendar-section">
          <div className="calendar-heading"><div><p className="eyebrow">Your week at a glance</p><h1>{monthLabel}</h1><p className="date-range">{weekLabel}</p></div><div className="heading-status"><span className="live-dot" />{isToday(weekStart) ? 'This week' : 'Planning view'}<ChevronDown size={15} /></div></div>
          {isMobile && <div className="mobile-day-picker">{days.map((day, index) => <button key={dateKey(day)} className={index === selectedDay ? 'selected' : ''} onClick={() => setSelectedDay(index)}>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)} <b>{day.getDate()}</b></button>)}</div>}
          <div className="calendar-wrap">
            <div className="calendar-grid" style={{ '--day-count': visibleDays.length }}>
              <div className="time-gutter-header" />
              {visibleDays.map((day) => <div className={`day-header ${isToday(day) ? 'today' : ''}`} key={dateKey(day)}><div className="day-header-top"><span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong></div><div className="habit-strip">{habitNames.map((habit) => <label key={habit} title={habit}><input type="checkbox" checked={Boolean(habits[dateKey(day)]?.[habit])} onChange={() => toggleHabit(day, habit)} /><span>{habit === 'Workout' ? 'W' : habit === '2L Water' ? 'H' : 'R'}</span></label>)}</div></div>)}
              <div className="time-labels">{Array.from({ length: HOUR_END - HOUR_START }, (_, index) => <span key={index}>{formatHour(HOUR_START + index)}</span>)}</div>
              <div className="grid-canvas" style={{ height: (HOUR_END - HOUR_START) * SLOT_HEIGHT }}>
                {visibleDays.map((day, dayIndex) => <div className="day-column" key={dateKey(day)}>{Array.from({ length: HOUR_END - HOUR_START }, (_, index) => <button className="hour-slot" key={index} onClick={() => openCreate(day, HOUR_START + index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, day, HOUR_START + index)} />)}
                  {isToday(day) && <div className="current-time-line" style={{ top: `${((now.getHours() + now.getMinutes() / 60) - HOUR_START) * SLOT_HEIGHT}px` }}><span /></div>}
                  {eventsForDay(day).map((event, index, dayEvents) => {
                    const start = new Date(event.startTime); const end = new Date(event.endTime); const top = ((start.getHours() + start.getMinutes() / 60) - HOUR_START) * SLOT_HEIGHT; const height = Math.max(((end - start) / 3600000) * SLOT_HEIGHT, 34); const overlapping = dayEvents.filter((other) => new Date(other.startTime) < end && new Date(other.endTime) > start); const position = overlapping.findIndex((item) => item.id === event.id)
                    return <button key={event.id} className="event-card" style={{ top, height, left: `${position * (100 / overlapping.length)}%`, width: `${100 / overlapping.length}%`, '--event-color': event.color }} onClick={(click) => { click.stopPropagation(); setDetail({ event, anchor: { top, left: `${position * (100 / overlapping.length)}%` } }) }}><span className="event-time">{formatTime(event.startTime)}</span><strong>{event.title}</strong><span className="event-category">{event.category} · {event.priority}</span></button>
                  })}
                </div>)}
              </div>
            </div>
          </div>
        </section>

        <aside className={`task-sidebar ${sidebarOpen ? '' : 'collapsed'}`}><div className="sidebar-header"><div><p className="eyebrow">Loose ends</p><h2>Unscheduled</h2></div><button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Collapse task sidebar"><ChevronRight size={17} /></button></div>{sidebarOpen && <><p className="sidebar-intro">Drag a task onto the calendar to give it a home.</p><div className="task-list">{tasks.map((task) => <div className="task-item" key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData('task/id', task.id)}><GripVertical size={16} className="drag-icon" /><div><strong>{task.title}</strong><span><Clock3 size={12} /> {task.duration} mins</span></div><MoreHorizontal size={16} className="muted-icon" /></div>)}</div><form className="task-form" onSubmit={addTask}><input value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder="Add a task..." aria-label="Task title" /><div><select value={taskDraft.duration} onChange={(event) => setTaskDraft({ ...taskDraft, duration: event.target.value })} aria-label="Task duration"><option value="15">15 mins</option><option value="30">30 mins</option><option value="45">45 mins</option><option value="60">60 mins</option></select><button type="submit" className="add-task-button" aria-label="Add task"><Plus size={18} /></button></div></form><div className="sidebar-foot"><Bell size={15} /> {tasks.length} tasks waiting for time</div></>}</aside>
      </main>

      {assistantOpen && <div className="assistant-panel"><div className="assistant-heading"><div><p className="eyebrow">Gemini planning partner</p><h2>Make this week lighter.</h2></div><button className="icon-button" onClick={() => setAssistantOpen(false)} aria-label="Close Gemini"><X size={16} /></button></div><p className="assistant-copy">Ask for a plan, a priority check, or ideas to make room for what matters.</p><form onSubmit={askGemini}><textarea value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder="e.g. Where can I fit a 45 minute workout?" rows="3" /><button type="submit" className="assistant-submit" disabled={assistantLoading || !assistantPrompt.trim()}>{assistantLoading ? 'Thinking...' : 'Ask Gemini'} <Send size={15} /></button></form>{assistantResponse && <div className="assistant-response">{assistantResponse}</div>}</div>}

      {analyticsOpen && <div className="drawer-backdrop" onClick={() => setAnalyticsOpen(false)}><aside className="analytics-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-title"><div><p className="eyebrow">Time allocation</p><h2>Where your week goes</h2></div><button className="icon-button" onClick={() => setAnalyticsOpen(false)} aria-label="Close analytics"><X size={18} /></button></div><p className="drawer-copy">A simple read on your planned time for {weekLabel}.</p><div className="analytics-list">{analytics.map((item) => <div className="analytics-row" key={item.category}><div className="analytics-label"><span>{item.category}</span><strong>{item.total.toFixed(1)}h</strong></div><div className="progress-track"><span style={{ width: `${(item.total / maxHours) * 100}%`, background: palette[categories.indexOf(item.category)] }} /></div></div>)}</div><div className="analytics-total"><span>Total planned</span><strong>{analytics.reduce((sum, item) => sum + item.total, 0).toFixed(1)} hours</strong></div></aside></div>}

      {detail && <div className="popover" style={{ '--popover-color': detail.event.color }}><div className="popover-accent" /><div className="popover-content"><div className="popover-top"><span className="category-dot" />{detail.event.category}<button className="icon-button small" onClick={() => setDetail(null)} aria-label="Close event details"><X size={15} /></button></div><h3>{detail.event.title}</h3><p>{detail.event.description || 'No notes added.'}</p><span className="popover-time"><Clock3 size={14} />{formatTime(detail.event.startTime)} – {formatTime(detail.event.endTime)}</span><div className="popover-actions"><button className="ghost-button" onClick={() => openEdit(detail.event)}><Edit3 size={14} /> Edit</button><button className="delete-button" onClick={() => deleteEvent(detail.event.id)}><Trash2 size={14} /> Delete</button></div></div></div>}

      {modal && <EventModal modal={modal} updateEvent={updateModalEvent} onClose={() => setModal(null)} onSubmit={submitEvent} />}
    </div>
  )
}

function GoogleLoginScreen({ onLogin }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [googleLoaded, setGoogleLoaded] = useState(Boolean(window.google?.accounts?.id))
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    if (!clientId || googleLoaded) return undefined
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    const script = existing || document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGoogleLoaded(true)
    if (!existing) document.head.appendChild(script)
    return undefined
  }, [clientId, googleLoaded])

  useEffect(() => {
    if (!clientId || !googleLoaded || !window.google?.accounts?.id || demoMode) return
    window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => {
      const profile = decodeGoogleCredential(response.credential)
      if (profile) onLogin({ name: profile.name, email: profile.email, picture: profile.picture })
    } })
    const container = document.getElementById('google-signin-button')
    if (container) window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 300, text: 'continue_with' })
  }, [clientId, googleLoaded, demoMode, onLogin])

  return <div className="login-screen"><div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><div className="login-card"><div className="brand-mark login-mark"><CalendarDays size={22} /></div><p className="eyebrow">Your week, with intention</p><h1>Welcome to koops.</h1><p className="login-copy">A calmer home for plans, habits, and the time between them.</p>{clientId ? <div id="google-signin-button" className="google-button" /> : <div className="google-setup"><p>Google sign-in is ready for your OAuth client.</p><span>Add <b>VITE_GOOGLE_CLIENT_ID</b> to .env.local, then restart Vite.</span></div>}<button className="demo-login" onClick={() => { setDemoMode(true); onLogin({ name: 'Demo user', email: 'demo@koops.local' }) }}>Continue in demo mode <ChevronRight size={15} /></button><p className="login-foot">Your calendar data stays in this browser.</p></div></div>
}

function EventModal({ modal, updateEvent, onClose, onSubmit }) {
  const { event } = modal
  return (
    <div className="modal-backdrop">
      <form className="event-modal" onSubmit={(formEvent) => { formEvent.preventDefault(); onSubmit(event) }}>
        <div className="modal-header"><div><p className="eyebrow">{modal.mode === 'edit' ? 'Update plan' : 'New calendar event'}</p><h2>{modal.mode === 'edit' ? 'Edit event' : 'Add event'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button></div>
        <label>Title<input required autoFocus value={event.title} onChange={(input) => updateEvent('title', input.target.value)} placeholder="What are you doing?" /></label>
        <div className="form-row"><label>Category<select value={event.category} onChange={(input) => updateEvent('category', input.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Priority<select value={event.priority} onChange={(input) => updateEvent('priority', input.target.value)}><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select></label></div>
        <div className="form-row"><label>Starts<input type="datetime-local" value={localInputValue(event.startTime)} onChange={(input) => updateEvent('startTime', new Date(input.target.value).toISOString())} /></label><label>Ends<input type="datetime-local" value={localInputValue(event.endTime)} onChange={(input) => updateEvent('endTime', new Date(input.target.value).toISOString())} /></label></div>
        <label>Color<div className="color-picker">{palette.map((color) => <button type="button" key={color} className={event.color === color ? 'selected' : ''} style={{ background: color }} onClick={() => updateEvent('color', color)} aria-label={`Choose ${color}`} />)}</div></label>
        <label>Notes<textarea rows="3" value={event.description} onChange={(input) => updateEvent('description', input.target.value)} placeholder="Add context, links, or a little intention..." /></label>
        <button className="submit-button" type="submit">{modal.mode === 'edit' ? 'Save changes' : 'Add to calendar'} <Plus size={16} /></button>
      </form>
    </div>
  )
}

export default App

createRoot(document.getElementById('root')).render(<App />)
