import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CornerDownLeft, Trash2 } from 'lucide-react'
import { Burst, Ring } from '../components/ui'
import { addDays, dayLong, today } from '../lib/dates'
import type { TodosApi } from '../lib/todos'
import type { Profile, Todo as TodoT } from '../lib/types'

export default function Todo({ profile, todos: api, readOnly }: { profile: Profile; todos: TodosApi; readOnly?: boolean }) {
  const now = today()
  const [day, setDay] = useState(now)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [burst, setBurst] = useState(0)

  const list = api.ofDay(day)
  const open = list.filter((t) => !t.done)
  const done = list.filter((t) => t.done)
  const ratio = list.length ? done.length / list.length : 0
  const allDone = list.length > 0 && open.length === 0

  // tâches non faites d'hier, pas encore reportées aujourd'hui
  const titlesToday = new Set(list.map((t) => t.title.toLowerCase()))
  const leftover = day === now ? api.ofDay(addDays(now, -1)).filter((t) => !t.done && !titlesToday.has(t.title.toLowerCase())) : []

  const prev = useRef(allDone)
  useEffect(() => {
    if (!readOnly && !prev.current && allDone) setBurst((b) => b + 1)
    prev.current = allDone
  }, [allDone, readOnly])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // un collage de plusieurs lignes crée plusieurs tâches
    const titles = text.split('\n').map((s) => s.replace(/^[-•*\s]+/, '').trim()).filter(Boolean)
    if (!titles.length) return
    setErr('')
    try {
      await api.add(day, titles)
      setText('')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <>
      <Burst trigger={burst} />
      <header className="head">
        <div className="grow">
          <div className="daynav">
            <button disabled={day <= addDays(now, -13)} onClick={() => setDay(addDays(day, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
            <span className="eyebrow">{dayLong(day)}</span>
            <button disabled={day >= now} onClick={() => setDay(addDays(day, 1))} aria-label="Jour suivant"><ChevronRight size={16} /></button>
          </div>
          <h1 className="title">{readOnly ? `La to do de ${profile.name}` : 'Ma to do'}</h1>
          {list.length > 0 && (
            <div className={`small ${allDone ? 'ok-t' : 'muted'}`} style={{ marginTop: 6 }}>
              {allDone ? 'Tout est fait' : `${open.length} à faire · ${done.length} faite${done.length > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
        {list.length > 0 && <Ring value={ratio} size={58}>{done.length}/{list.length}</Ring>}
      </header>

      {!readOnly && (
        <form className="panel" style={{ padding: '10px 10px 10px 16px' }} onSubmit={submit}>
          <div className="row">
            <input className="input" style={{ border: 0, padding: '8px 0', background: 'transparent' }}
              placeholder={list.length ? 'Ajouter une tâche' : 'Qu’est-ce qui compte aujourd’hui ?'}
              value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="done"
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text')
                if (pasted.includes('\n')) { e.preventDefault(); setText(pasted) }
              }} />
            <button className="send" type="submit" disabled={!text.trim()} aria-label="Ajouter"><CornerDownLeft size={17} /></button>
          </div>
          {err && <p className="error">{err}</p>}
        </form>
      )}

      {!readOnly && leftover.length > 0 && (
        <button className="banner" onClick={() => api.add(now, leftover.map((t) => t.title))}>
          <CornerDownLeft size={17} strokeWidth={1.6} style={{ transform: 'scaleX(-1)' }} />
          <span className="grow">
            Reporter {leftover.length === 1 ? 'la tâche non faite' : `les ${leftover.length} tâches non faites`} d’hier
            <div className="from">{leftover.map((t) => t.title).join(' · ')}</div>
          </span>
        </button>
      )}

      {list.length === 0 ? (
        <p className="note">{readOnly ? 'Rien de noté pour ce jour.' : day === now ? 'Note ici les tâches du jour, puis coche-les au fil de la journée.' : 'Rien de noté ce jour-là.'}</p>
      ) : (
        <section className={`panel ${allDone ? 'is-done' : ''}`}>
          {[...open, ...done].map((t, i) => (
            <TodoRow key={t.id} t={t} first={i === 0} readOnly={readOnly} missed={day < now}
              editing={editing === t.id} onEdit={() => setEditing(t.id)} onStopEdit={() => setEditing(null)}
              onToggle={() => api.patch(t.id, { done: !t.done })}
              onRename={(title) => api.patch(t.id, { title })}
              onDelete={() => { setEditing(null); api.remove(t.id) }} />
          ))}
        </section>
      )}
    </>
  )
}

function TodoRow({ t, first, readOnly, missed, editing, onEdit, onStopEdit, onToggle, onRename, onDelete }: {
  t: TodoT; first: boolean; readOnly?: boolean; missed: boolean; editing: boolean
  onEdit: () => void; onStopEdit: () => void; onToggle: () => void; onRename: (s: string) => void; onDelete: () => void
}) {
  const [v, setV] = useState(t.title)
  useEffect(() => setV(t.title), [t.title])
  const commit = () => {
    const s = v.trim()
    if (s && s !== t.title) onRename(s)
    else setV(t.title)
    onStopEdit()
  }
  return (
    <div className={`item ${t.done ? 'on' : ''}`} style={first ? { borderTop: 0 } : undefined}>
      <button className={`tick ${!t.done && missed ? 'missed' : ''}`} disabled={readOnly} onClick={onToggle} aria-label={t.done ? 'Décocher' : 'Cocher'}>
        {t.done && <Check size={14} strokeWidth={2.5} />}
      </button>
      {editing ? (
        <>
          <input className="input" autoFocus value={v} style={{ padding: '6px 10px' }}
            onChange={(e) => setV(e.target.value)} onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setV(t.title); onStopEdit() } }} />
          <button className="btn danger s" onMouseDown={(e) => e.preventDefault()} onClick={onDelete} aria-label="Supprimer"><Trash2 size={16} /></button>
        </>
      ) : (
        <button className="txt name" style={{ textAlign: 'left', textDecoration: t.done ? 'line-through' : undefined, textDecorationColor: 'var(--line-2)' }}
          disabled={readOnly} onClick={onEdit}>
          {t.title}
        </button>
      )}
    </div>
  )
}
