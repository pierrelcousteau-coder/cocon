import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { dayLong, iso, today } from '../lib/dates'
import type { useMessages } from '../lib/messages'
import { PRESET_MESSAGES } from '../lib/motivation'
import type { Profile } from '../lib/types'

const OWNER_PRESETS = ['Merci, ça me touche', 'Journée réussie aujourd’hui', 'Journée difficile', 'Tu viens marcher avec moi ?']

export default function Messages({ me, partner, chat }: {
  me: Profile; partner: Profile | null | undefined; chat: ReturnType<typeof useMessages>
}) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const { messages, markRead, send } = chat

  useEffect(() => {
    markRead()
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (partner === undefined) return null
  if (!partner) {
    return (
      <>
        <header className="head"><div className="grow"><div className="eyebrow">Messages</div><h1 className="title">Ton soutien</h1></div></header>
        <section className="panel" style={{ padding: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            Personne n'est encore lié à ton compte. Donne ton code (Routine → Mon soutien) à ton partenaire pour pouvoir échanger ici.
          </p>
        </section>
      </>
    )
  }

  const submit = async (msg: string) => {
    setErr('')
    try {
      await send(partner.id, msg)
      setText('')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const presets = me.role === 'supporter' ? PRESET_MESSAGES : OWNER_PRESETS
  let lastDay = ''

  return (
    <>
      <header className="head"><div className="grow"><div className="eyebrow">Messages</div><h1 className="title">{partner.name}</h1></div></header>
      <div className="thread">
        {messages.length === 0 && <p className="muted center small">Aucun message pour l'instant. Un petit mot fait toujours du bien.</p>}
        {messages.map((m) => {
          const d = iso(new Date(m.created_at))
          const sep = d !== lastDay
          lastDay = d
          const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              {sep && <div className="day-sep eyebrow">{d === today() ? "Aujourd'hui" : dayLong(d)}</div>}
              <div className={`bubble ${m.from_id === me.id ? 'mine' : ''}`}>
                {m.message}
                <time>{time}{m.from_id === me.id && m.read_at ? ' · lu' : ''}</time>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <div className="composer">
        <div className="inner">
          <div className="chips">
            {presets.map((p) => <button key={p} className="chip" onClick={() => submit(p)}>{p}</button>)}
          </div>
          {err && <p className="error">{err}</p>}
          <form className="row" onSubmit={(e) => { e.preventDefault(); submit(text) }}>
            <input className="input" placeholder="Écrire un message" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="send" type="submit" disabled={!text.trim()} aria-label="Envoyer"><ArrowUp size={18} /></button>
          </form>
        </div>
      </div>
    </>
  )
}
