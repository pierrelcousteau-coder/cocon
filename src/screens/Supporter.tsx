import { useEffect, useState } from 'react'
import { useTracker } from '../lib/data'
import { PRESET_ENCOURAGEMENTS } from '../lib/motivation'
import { notifyEncouragement } from '../lib/push'
import { supabase } from '../lib/supabase'
import type { Encouragement, Profile } from '../lib/types'
import Today from './Today'
import Week from './Week'

export default function Supporter({ me, tab }: { me: Profile; tab: 'today' | 'week' | 'settings' }) {
  const [partner, setPartner] = useState<Profile | null>(null)
  const tracker = useTracker(partner?.id)

  useEffect(() => {
    if (me.linked_to) supabase.from('profiles').select('*').eq('id', me.linked_to).single().then(({ data }) => setPartner(data))
  }, [me.linked_to])

  if (tab === 'settings') {
    return (
      <>
        <div className="hello"><div className="grow"><h1>Réglages</h1><p>Connecté en soutien{partner ? ` de ${partner.name}` : ''}</p></div></div>
        <div className="card"><button className="btn ghost block" onClick={() => supabase.auth.signOut()}>Se déconnecter</button></div>
      </>
    )
  }
  if (!partner || tracker.loading) return <p className="center muted" style={{ marginTop: 80 }}>Chargement…</p>
  if (tab === 'week') return <Week profile={partner} tracker={tracker} />
  return (
    <>
      <Composer me={me} partner={partner} />
      <Today profile={partner} tracker={tracker} readOnly />
    </>
  )
}

function Composer({ me, partner }: { me: Profile; partner: Profile }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState<Encouragement[]>([])

  useEffect(() => {
    supabase.from('encouragements').select('*').eq('from_id', me.id).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setSent(data ?? []))
  }, [me.id])

  const send = async (message: string) => {
    if (!message.trim()) return
    const { data } = await supabase.from('encouragements').insert({ from_id: me.id, to_id: partner.id, message: message.trim() }).select().single()
    if (data) {
      setSent((s) => [data, ...s].slice(0, 3))
      setText('')
      notifyEncouragement(data.id)
    }
  }

  return (
    <section className="card" style={{ background: 'var(--rose-soft)' }}>
      <div className="card-head"><span className="emoji-badge" style={{ background: 'var(--card)' }}>💌</span><h2>Encourager {partner.name}</h2></div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {PRESET_ENCOURAGEMENTS.map((m) => <button key={m} className="chip" style={{ background: 'var(--card)' }} onClick={() => send(m)}>{m}</button>)}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <input className="input" style={{ background: 'var(--card)' }} placeholder="Un petit mot…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary small" type="submit">Envoyer</button>
      </form>
      {sent[0] && (
        <p className="muted small-text" style={{ margin: '10px 0 0' }}>
          Dernier mot : « {sent[0].message} » · {sent[0].read_at ? 'lu ✓' : 'pas encore lu'}
        </p>
      )}
    </section>
  )
}
