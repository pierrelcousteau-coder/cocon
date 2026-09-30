import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { useTracker } from './lib/data'
import type { Encouragement, Profile } from './lib/types'
import Auth from './screens/Auth'
import Setup from './screens/Setup'
import Today from './screens/Today'
import Week from './screens/Week'
import Routine from './screens/Routine'
import Supporter from './screens/Supporter'

type Tab = 'today' | 'week' | 'routine'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    setProfile(null)
    if (uid) supabase.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data))
  }, [uid])

  if (!configured) return <div className="app"><div className="card">Configuration manquante : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir README).</div></div>
  if (session === undefined || (session && !profile)) return <div className="app"><p className="center muted" style={{ marginTop: 120 }}>🌷</p></div>
  if (!session || !profile) return <div className="app"><Auth /></div>
  if (!profile.name) return <div className="app"><Setup profile={profile} onDone={setProfile} /></div>
  return profile.role === 'supporter' ? <SupporterShell me={profile} /> : <OwnerShell profile={profile} setProfile={setProfile} />
}

function OwnerShell({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [tab, setTab] = useState<Tab>('today')
  const tracker = useTracker(profile.id)
  const [enc, setEnc] = useState<Encouragement | null>(null)

  useEffect(() => {
    const load = () =>
      supabase.from('encouragements').select('*').eq('to_id', profile.id).is('read_at', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => setEnc(data))
    load()
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [profile.id])

  const readEnc = async () => {
    if (!enc) return
    setEnc(null)
    await supabase.from('encouragements').update({ read_at: new Date().toISOString() }).eq('to_id', profile.id).is('read_at', null)
  }

  return (
    <>
      <main className="app">
        {tracker.loading ? <p className="center muted" style={{ marginTop: 120 }}>🌷</p>
          : tab === 'today' ? <Today profile={profile} tracker={tracker} encouragement={enc} onReadEncouragement={readEnc} onGoRoutine={() => setTab('routine')} />
          : tab === 'week' ? <Week profile={profile} tracker={tracker} />
          : <Routine profile={profile} setProfile={setProfile} tracker={tracker} />}
      </main>
      <Tabs tab={tab} setTab={setTab} items={[['today', '🌷', "Aujourd'hui"], ['week', '📅', 'Semaine'], ['routine', '⚙️', 'Routine']]} />
    </>
  )
}

function SupporterShell({ me }: { me: Profile }) {
  const [tab, setTab] = useState<'today' | 'week' | 'settings'>('today')
  return (
    <>
      <main className="app"><Supporter me={me} tab={tab} /></main>
      <Tabs tab={tab} setTab={setTab} items={[['today', '💛', "Aujourd'hui"], ['week', '📅', 'Semaine'], ['settings', '⚙️', 'Réglages']]} />
    </>
  )
}

function Tabs<T extends string>({ tab, setTab, items }: { tab: T; setTab: (t: T) => void; items: [T, string, string][] }) {
  return (
    <div className="tabs">
      <nav>
        {items.map(([k, ico, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); window.scrollTo(0, 0) }}>
            <span className="ico">{ico}</span>{label}
          </button>
        ))}
      </nav>
    </div>
  )
}
