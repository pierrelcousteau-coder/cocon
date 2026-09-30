import { useState } from 'react'
import { useTracker } from '../lib/data'
import { enablePush, isIOS, isStandalone, pushSupported, testPush } from '../lib/push'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import Today from './Today'
import Week from './Week'

/** Vue du soutien : la journée et la semaine de la personne suivie, en lecture seule */
export default function Supporter({ me, partner, tab, todoSummary, onOpenTodo }: {
  me: Profile; partner: Profile | null | undefined; tab: 'today' | 'week' | 'settings'; todoSummary: { done: number; total: number }; onOpenTodo: () => void
}) {
  const tracker = useTracker(partner?.id)
  const [pushMsg, setPushMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const on = async () => {
    try { await enablePush(me.id); setPushMsg({ ok: true, text: 'Notifications activées sur cet appareil.' }) }
    catch (e) { setPushMsg({ ok: false, text: (e as Error).message }) }
  }
  const test = async () => { const text = await testPush(); setPushMsg({ ok: text.startsWith('Notification'), text }) }

  if (tab === 'settings') {
    return (
      <>
        <header className="head"><div className="grow"><div className="eyebrow">Réglages</div><h1 className="title">{me.name}</h1></div></header>
        <section className="panel" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>Notifications</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Pour être prévenu quand {partner?.name ?? 'elle'} t'écrit.</p>
          {isIOS() && !isStandalone() ? (
            <p className="small" style={{ margin: 0 }}>Sur iPhone, ajoute d'abord Cocon à l'écran d'accueil puis ouvre-la depuis l'icône.</p>
          ) : pushSupported() ? (
            <div className="row">
              <button className="btn primary s" onClick={on}>Activer</button>
              <button className="btn s" onClick={test}>Tester</button>
            </div>
          ) : <p className="small muted" style={{ margin: 0 }}>Indisponibles sur ce navigateur.</p>}
          {pushMsg && <p className={pushMsg.ok ? 'success' : 'error'}>{pushMsg.text}</p>}
        </section>
        <section className="panel" style={{ padding: 16 }}>
          <p className="small muted" style={{ marginTop: 0 }}>Connecté en soutien{partner ? ` de ${partner.name}` : ''}.</p>
          <button className="btn quiet block" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </section>
      </>
    )
  }
  if (!partner || tracker.loading) return <p className="center muted" style={{ marginTop: 120 }}>Chargement…</p>
  if (tab === 'week') return <Week profile={partner} tracker={tracker} />
  return <Today profile={partner} tracker={tracker} readOnly todoSummary={todoSummary} onOpenTodo={onOpenTodo} />
}
