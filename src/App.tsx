import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { CalendarDays, House, ListTodo, MessageCircle, Settings2, type LucideIcon } from 'lucide-react'
import { configured, supabase } from './lib/supabase'
import { useTracker } from './lib/data'
import { useMessages, usePartner } from './lib/messages'
import { useTodos } from './lib/todos'
import { today } from './lib/dates'
import type { Profile } from './lib/types'
import { Toast } from './components/ui'
import Auth, { NewPassword } from './screens/Auth'
import Setup from './screens/Setup'
import Today from './screens/Today'
import Week from './screens/Week'
import Routine from './screens/Routine'
import Supporter from './screens/Supporter'
import Messages from './screens/Messages'
import Todo from './screens/Todo'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    setProfile(null)
    if (uid) supabase.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data))
  }, [uid])

  const loading = <div className="app"><p className="center muted" style={{ marginTop: 140 }}>Cocon</p></div>
  if (!configured) return <div className="app"><div className="panel" style={{ padding: 16 }}>Configuration manquante : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir README).</div></div>
  if (recovery && session) return <div className="app"><NewPassword onDone={() => setRecovery(false)} /></div>
  if (session === undefined || (session && !profile)) return loading
  if (!session || !profile) return <div className="app"><Auth /></div>
  if (!profile.name) return <div className="app"><Setup profile={profile} onDone={setProfile} /></div>
  return <Shell profile={profile} setProfile={setProfile} />
}

type Tab = 'today' | 'todo' | 'week' | 'messages' | 'settings'

function Shell({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const supporter = profile.role === 'supporter'
  const [tab, setTab] = useState<Tab>('today')
  const tracker = useTracker(supporter ? undefined : profile.id)
  const partner = usePartner(profile)
  const chat = useMessages(profile.id)
  const todos = useTodos(supporter ? partner?.id ?? undefined : profile.id)
  const todayTodos = todos.ofDay(today())
  const todoSummary = { done: todayTodos.filter((t) => t.done).length, total: todayTodos.length }
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  // toast discret quand un message arrive pendant qu'on est ailleurs dans l'app
  const seen = useRef<number | null>(null)
  useEffect(() => {
    const incoming = chat.messages.filter((m) => m.to_id === profile.id)
    if (seen.current !== null && incoming.length > seen.current && tab !== 'messages') {
      setToast(`${partner?.name ?? 'Nouveau message'} : ${incoming[incoming.length - 1].message}`)
    }
    seen.current = incoming.length
  }, [chat.messages, profile.id, tab, partner?.name])

  const lastUnread = [...chat.messages].reverse().find((m) => m.to_id === profile.id && !m.read_at) ?? null
  const go = (t: Tab) => { setTab(t); window.scrollTo(0, 0) }

  let screen
  if (tab === 'messages') screen = <Messages me={profile} partner={partner} chat={chat} />
  else if (tab === 'todo') screen = supporter && !partner ? null : <Todo profile={supporter ? partner! : profile} todos={todos} readOnly={supporter} />
  else if (supporter) screen = <Supporter me={profile} partner={partner} tab={tab} todoSummary={todoSummary} onOpenTodo={() => go('todo')} />
  else if (tracker.loading) screen = <p className="center muted" style={{ marginTop: 140 }}>Cocon</p>
  else if (tab === 'today') screen = <Today profile={profile} tracker={tracker} unread={lastUnread} onOpenMessages={() => go('messages')} onGoRoutine={() => go('settings')}
    todoSummary={todoSummary} onOpenTodo={() => go('todo')} />
  else if (tab === 'week') screen = <Week profile={profile} tracker={tracker} />
  else screen = <Routine profile={profile} setProfile={setProfile} tracker={tracker} />

  const items: [Tab, LucideIcon, string][] = [
    ['today', House, "Aujourd'hui"],
    ['todo', ListTodo, 'To do'],
    ['week', CalendarDays, 'Semaine'],
    ['messages', MessageCircle, 'Messages'],
    ['settings', Settings2, supporter ? 'Réglages' : 'Routine'],
  ]

  return (
    <>
      <Toast text={toast} onDone={clearToast} />
      <main className="app">{screen}</main>
      <div className="tabs">
        <nav>
          {items.map(([k, I, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
              <I size={21} strokeWidth={tab === k ? 1.9 : 1.5} />
              {label}
              {k === 'messages' && chat.unread > 0 && <span className="badge">{chat.unread}</span>}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}
