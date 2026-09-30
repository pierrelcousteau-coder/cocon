import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ListTodo, MessageCircle, Minus, Plus, X } from 'lucide-react'
import { Burst, Ring, Sheet } from '../components/ui'
import { Icon } from '../components/Icon'
import type { TrackerApi } from '../lib/data'
import { addDays, dayLong, today, weekDays, weekStart } from '../lib/dates'
import { cheatMessage, dailyItems, dailyMessage, gentleStreak, milestone, scoreDay, sportMessage, weeklyItems } from '../lib/motivation'
import { KINDS, MOMENTS, type Encouragement, type Profile, type RoutineItem } from '../lib/types'

interface Props {
  profile: Profile
  tracker: TrackerApi
  readOnly?: boolean
  unread?: Encouragement | null
  onOpenMessages?: () => void
  onGoRoutine?: () => void
  todoSummary?: { done: number; total: number }
  onOpenTodo?: () => void
}

export const itemIcon = (i: RoutineItem) => i.icon || KINDS.find((k) => k.key === i.kind)!.icon

export default function Today({ profile, tracker: t, readOnly, unread, onOpenMessages, onGoRoutine, todoSummary, onOpenTodo }: Props) {
  const now = today()
  const [day, setDay] = useState(now)
  const [sportOpen, setSportOpen] = useState(false)
  const [burst, setBurst] = useState(0)
  const past = day < now

  const log = t.logs.find((l) => l.day === day)
  const score = scoreDay(day, profile, t.items, t.checks, log)
  const present = (d: string) => scoreDay(d, profile, t.items, t.checks, t.logs.find((l) => l.day === d)).present
  const streak = gentleStreak(now, present)
  const ms = day === now && present(now) ? milestone(streak) : undefined

  const prev = useRef(score.ratio)
  useEffect(() => {
    if (!readOnly && prev.current < 0.999 && score.ratio >= 0.999) setBurst((b) => b + 1)
    prev.current = score.ratio
  }, [score.ratio, readOnly])

  const week = weekDays(weekStart(day))
  const weekSports = t.sports.filter((s) => week.includes(s.day))
  const weekCheats = t.cheats.filter((c) => week.includes(c.day)).sort((a, b) => (a.day < b.day ? -1 : 1))
  const daysLeft = week.filter((d) => d >= now).length

  const daily = dailyItems(t.items)
  const weekly = weeklyItems(t.items)
  const isChecked = (d: string, id: string) => t.checks.some((c) => c.day === d && c.item_id === id)

  const glasses = Math.max(1, Math.ceil(profile.water_goal_ml / profile.glass_ml))
  const water = log?.water_ml ?? 0
  const filled = Math.floor(water / profile.glass_ml)
  const waterDone = water >= profile.water_goal_ml
  const liters = (ml: number) => (ml / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })

  const tapGlass = (i: number) => {
    if (readOnly) return
    const target = i + 1 === filled ? i : i + 1
    t.patchLog(day, { water_ml: target * profile.glass_ml })
  }

  const sportDone = weekSports.length >= profile.sport_per_week
  const cheatOver = weekCheats.length > profile.cheat_max

  return (
    <>
      <Burst trigger={burst} />
      <header className="head">
        <div className="grow">
          <div className="daynav">
            <button disabled={day <= addDays(now, -6)} onClick={() => setDay(addDays(day, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
            <span className="eyebrow">{dayLong(day)}</span>
            <button disabled={day >= now} onClick={() => setDay(addDays(day, 1))} aria-label="Jour suivant"><ChevronRight size={16} /></button>
          </div>
          <h1 className="title">{readOnly ? `La journée de ${profile.name}` : `Bonjour ${profile.name}`}</h1>
          {streak > 0 && <div className="small muted" style={{ marginTop: 6 }}>{streak} jour{streak > 1 ? 's' : ''} de suite</div>}
        </div>
        <Ring value={score.ratio} size={58}>{Math.round(score.ratio * 100)}</Ring>
      </header>

      {unread && !readOnly && (
        <button className="banner" onClick={onOpenMessages}>
          <MessageCircle size={18} strokeWidth={1.6} />
          <span className="grow">
            <span className="from">Nouveau message</span>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unread.message}</div>
          </span>
          <ChevronRight size={16} className="muted" />
        </button>
      )}

      {ms ? <p className="note ok">{ms}</p> : day === now && !readOnly && (
        <p className={`note ${score.ratio >= 0.999 ? 'ok' : ''}`}>
          {dailyMessage({ ratio: score.ratio, presentToday: present(now), presentYesterday: present(addDays(now, -1)), name: profile.name })}
        </p>
      )}

      {todoSummary && day === now && (
        <button className={`banner ${todoSummary.total && todoSummary.done === todoSummary.total ? 'ok' : ''}`} onClick={onOpenTodo}>
          <ListTodo size={18} strokeWidth={1.6} />
          <span className="grow">
            <span className="from">To do du jour</span>
            <div>
              {!todoSummary.total ? (readOnly ? 'Rien de noté pour l’instant' : 'Écrire ma to do')
                : todoSummary.done === todoSummary.total ? 'Tout est fait'
                : `${todoSummary.done}/${todoSummary.total} faite${todoSummary.done > 1 ? 's' : ''}`}
            </div>
          </span>
          <ChevronRight size={16} className="muted" />
        </button>
      )}

      {daily.length === 0 && weekly.length === 0 && !readOnly && (
        <section className="panel center" style={{ padding: 20 }}>
          <p style={{ marginTop: 0 }} className="muted">Ajoute tes compléments, tes plantes et tes activités pour les retrouver ici.</p>
          <button className="btn primary" onClick={onGoRoutine}>Configurer ma routine</button>
        </section>
      )}

      {MOMENTS.map((m) => {
        const list = daily.filter((i) => i.moment === m.key)
        if (!list.length) return null
        const done = list.filter((i) => isChecked(day, i.id))
        const all = done.length === list.length
        return (
          <section className={`panel ${all ? 'is-done' : ''}`} key={m.key}>
            <div className="panel-head">
              <span className="ico"><Icon name={m.icon} /></span>
              <h2>{m.label} <span className="count">{done.length}/{list.length}</span></h2>
              {!readOnly && list.length > 1 && (
                <button className={`link ${all ? 'ok' : ''}`} onClick={() => t.checkMany(day, list.map((i) => i.id))}>
                  {all ? 'Tout décocher' : 'Tout cocher'}
                </button>
              )}
            </div>
            {list.map((i) => (
              <CheckRow key={i.id} on={done.includes(i)} missed={past} readOnly={readOnly} icon={itemIcon(i)}
                name={i.name} sub={i.dose} onToggle={() => t.toggleItem(day, i.id)} />
            ))}
          </section>
        )
      })}

      {weekly.length > 0 && (
        <section className={`panel ${weekly.every((i) => countWeek(t, week, i.id) >= i.weekly_target) ? 'is-done' : ''}`}>
          <div className="panel-head">
            <span className="ico"><Icon name="CalendarCheck" /></span>
            <h2>Cette semaine</h2>
          </div>
          {weekly.map((i) => {
            const n = countWeek(t, week, i.id)
            return (
              <CheckRow key={i.id} on={isChecked(day, i.id)} readOnly={readOnly} icon={itemIcon(i)} name={i.name}
                sub={`${n}/${i.weekly_target} cette semaine${n >= i.weekly_target ? ' · objectif atteint' : ''}`}
                subClass={n >= i.weekly_target ? 'ok-t' : ''} onToggle={() => t.toggleItem(day, i.id)} />
            )
          })}
        </section>
      )}

      <section className={`panel ${waterDone ? 'is-done' : ''}`}>
        <div className="panel-head">
          <span className="ico"><Icon name="Droplet" /></span>
          <h2>Eau <span className="count">{liters(water)} / {liters(profile.water_goal_ml)} L</span></h2>
        </div>
        <div className="water">
          {Array.from({ length: glasses }, (_, i) => (
            <button key={i} className={i < filled ? 'full' : ''} disabled={readOnly} onClick={() => tapGlass(i)} aria-label={`Verre ${i + 1}`} />
          ))}
        </div>
        <div className="water-foot">
          <span className={`small ${waterDone ? 'ok-t' : past && !waterDone ? 'bad-t' : 'muted'}`}>
            {waterDone ? 'Objectif atteint' : `${filled} verre${filled > 1 ? 's' : ''} de ${profile.glass_ml} ml`}
          </span>
          {!readOnly && (
            <div className="stepper s">
              <button disabled={!water} onClick={() => t.patchLog(day, { water_ml: Math.max(0, water - profile.glass_ml) })} aria-label="Retirer un verre"><Minus size={15} /></button>
              <button onClick={() => t.patchLog(day, { water_ml: water + profile.glass_ml })} aria-label="Ajouter un verre"><Plus size={15} /></button>
            </div>
          )}
        </div>
      </section>

      <section className={`panel ${log?.walked ? 'is-done' : ''}`}>
        <div className="panel-head" style={{ paddingBottom: 0 }} />
        <CheckRow on={!!log?.walked} missed={past} readOnly={readOnly} icon="Footprints" name={readOnly ? 'Sortie marcher' : 'Je suis sortie marcher'}
          onToggle={() => t.patchLog(day, { walked: !log?.walked })} first />
        <div className="line-row">
          <span className="grow small muted">Nombre de pas</span>
          <StepsInput value={log?.steps ?? null} readOnly={readOnly}
            onSave={(steps) => t.patchLog(day, { steps, walked: steps ? true : !!log?.walked })} />
        </div>
      </section>

      <section className={`panel ${sportDone ? 'is-done' : ''}`}>
        <div className="panel-head">
          <span className="ico"><Icon name="Dumbbell" /></span>
          <h2>Sport <span className="count">{weekSports.length}/{profile.sport_per_week} cette semaine</span></h2>
          {!readOnly && <button className="link" onClick={() => setSportOpen(true)}>Ajouter</button>}
        </div>
        <div className="row" style={{ paddingBottom: 12 }}>
          <div className="segs">
            {Array.from({ length: Math.max(profile.sport_per_week, weekSports.length) }, (_, i) => <i key={i} className={i < weekSports.length ? 'on' : ''} />)}
          </div>
          <span className={`small ${sportDone ? 'ok-t' : 'muted'}`} style={{ whiteSpace: 'nowrap' }}>
            {sportMessage(weekSports.length, profile.sport_per_week, daysLeft)}
          </span>
        </div>
        {weekSports.map((s) => (
          <div key={s.id} className="line-row small">
            <span className="grow">{s.type}{s.minutes ? ` · ${s.minutes} min` : ''} <span className="muted">— {dayLong(s.day)}</span></span>
            {!readOnly && <button className="btn quiet s" onClick={() => t.removeSport(s.id)} aria-label="Supprimer"><X size={14} /></button>}
          </div>
        ))}
      </section>

      <section className={`panel ${!cheatOver && weekCheats.length > 0 ? 'is-done' : ''}`} style={cheatOver ? { borderColor: 'var(--bad)' } : undefined}>
        <div className="panel-head">
          <span className="ico" style={cheatOver ? { color: 'var(--bad)' } : undefined}><Icon name="Pizza" /></span>
          <h2>Repas plaisir <span className="count">max {profile.cheat_max} / semaine</span></h2>
        </div>
        <div className="line-row" style={{ borderTop: 0, paddingTop: 0 }}>
          <span className={`grow small ${cheatOver ? 'bad-t' : 'muted'}`}>{cheatMessage(weekCheats.length, profile.cheat_max)}</span>
          <div className="stepper">
            {!readOnly && (
              <button disabled={!weekCheats.length} onClick={() => t.removeCheat(weekCheats[weekCheats.length - 1].id)} aria-label="Retirer"><Minus size={15} /></button>
            )}
            <span className={`val ${cheatOver ? 'bad' : ''}`}>{weekCheats.length}</span>
            {!readOnly && <button onClick={() => t.addCheat(day)} aria-label="Ajouter"><Plus size={15} /></button>}
          </div>
        </div>
      </section>

      <SportSheet open={sportOpen} onClose={() => setSportOpen(false)} types={profile.sport_types}
        onAdd={async (type, minutes) => {
          await t.addSport(day, type, minutes)
          setSportOpen(false)
          if (weekSports.length + 1 === profile.sport_per_week) setBurst((b) => b + 1)
        }} />
    </>
  )
}

const countWeek = (t: TrackerApi, week: string[], id: string) => t.checks.filter((c) => c.item_id === id && week.includes(c.day)).length

function CheckRow({ on, missed, readOnly, icon, name, sub, subClass, onToggle, first }: {
  on: boolean; missed?: boolean; readOnly?: boolean; icon: string; name: string; sub?: string; subClass?: string; onToggle: () => void; first?: boolean
}) {
  return (
    <button className={`item ${on ? 'on' : ''}`} style={first ? { borderTop: 0 } : undefined} disabled={readOnly} onClick={onToggle}>
      <span className="ico"><Icon name={icon} /></span>
      <span className="txt">
        <div className="name">{name}</div>
        {sub && <div className={`sub ${subClass ?? ''}`}>{sub}</div>}
      </span>
      <span className={`tick ${!on && missed ? 'missed' : ''}`}>{on && <Check size={14} strokeWidth={2.5} />}</span>
    </button>
  )
}

function StepsInput({ value, onSave, readOnly }: { value: number | null; onSave: (v: number | null) => void; readOnly?: boolean }) {
  const [v, setV] = useState(value?.toString() ?? '')
  useEffect(() => setV(value?.toString() ?? ''), [value])
  if (readOnly) return <strong>{value ? value.toLocaleString('fr-FR') : '—'}</strong>
  return (
    <input className="input num" inputMode="numeric" placeholder="—" value={v}
      onChange={(e) => setV(e.target.value.replace(/\D/g, ''))}
      onBlur={() => { const n = v ? Number(v) : null; if (n !== value) onSave(n) }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
  )
}

function SportSheet({ open, onClose, types, onAdd }: {
  open: boolean; onClose: () => void; types: string[]; onAdd: (type: string, minutes: number | null) => void
}) {
  const [type, setType] = useState('')
  const [custom, setCustom] = useState('')
  const [minutes, setMinutes] = useState<number | null>(30)
  const chosen = custom.trim() || type
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle séance">
      <div className="field"><span>Activité</span>
        <div className="chips">
          {types.map((x) => (
            <button key={x} className={`chip ${type === x && !custom ? 'on' : ''}`} onClick={() => { setType(x); setCustom('') }}>{x}</button>
          ))}
        </div>
      </div>
      <label className="field"><span>Ou autre</span>
        <input className="input" value={custom} placeholder="ex. Danse" onChange={(e) => setCustom(e.target.value)} />
      </label>
      <div className="field"><span>Durée</span>
        <div className="chips">
          {[15, 30, 45, 60].map((m) => (
            <button key={m} className={`chip ${minutes === m ? 'on' : ''}`} onClick={() => setMinutes(m)}>{m} min</button>
          ))}
          <button className={`chip ${minutes === null ? 'on' : ''}`} onClick={() => setMinutes(null)}>—</button>
        </div>
      </div>
      <button className="btn primary block" disabled={!chosen} onClick={() => onAdd(chosen, minutes)}>Enregistrer</button>
    </Sheet>
  )
}
