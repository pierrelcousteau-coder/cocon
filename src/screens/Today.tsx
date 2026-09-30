import { useEffect, useRef, useState } from 'react'
import { Burst, Ring, Sheet } from '../components/ui'
import type { TrackerApi } from '../lib/data'
import { addDays, dayLong, today, weekDays, weekStart } from '../lib/dates'
import { cheatMessage, dailyMessage, gentleStreak, milestone, scoreDay, sportMessage } from '../lib/motivation'
import { MOMENTS, type Encouragement, type Profile } from '../lib/types'

interface Props {
  profile: Profile
  tracker: TrackerApi
  readOnly?: boolean
  encouragement?: Encouragement | null
  onReadEncouragement?: () => void
  onGoRoutine?: () => void
}

export default function Today({ profile, tracker: t, readOnly, encouragement, onReadEncouragement, onGoRoutine }: Props) {
  const now = today()
  const [day, setDay] = useState(now)
  const [sportOpen, setSportOpen] = useState(false)
  const [burst, setBurst] = useState(0)

  const log = t.logs.find((l) => l.day === day)
  const score = scoreDay(day, profile, t.items, t.checks, log)
  const present = (d: string) => scoreDay(d, profile, t.items, t.checks, t.logs.find((l) => l.day === d)).present
  const streak = gentleStreak(now, present)
  const ms = day === now && present(now) ? milestone(streak) : undefined

  // célébration quand la journée passe à 100 %
  const prev = useRef(score.ratio)
  useEffect(() => {
    if (!readOnly && prev.current < 0.999 && score.ratio >= 0.999) setBurst((b) => b + 1)
    prev.current = score.ratio
  }, [score.ratio, readOnly])

  const week = weekDays(weekStart(day))
  const weekSports = t.sports.filter((s) => week.includes(s.day))
  const weekCheats = t.cheats.filter((c) => week.includes(c.day))
  const daysLeft = week.filter((d) => d >= now).length

  const active = t.items.filter((i) => i.active)
  const glasses = Math.max(1, Math.ceil(profile.water_goal_ml / profile.glass_ml))
  const filled = Math.floor((log?.water_ml ?? 0) / profile.glass_ml)
  const liters = (ml: number) => `${(ml / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} L`
  const who = readOnly ? profile.name || 'Elle' : ''

  const tapGlass = (i: number) => {
    if (readOnly) return
    const target = i + 1 === filled ? i : i + 1
    t.patchLog(day, { water_ml: target * profile.glass_ml })
  }

  return (
    <>
      <Burst trigger={burst} />
      <header className="hello">
        <Ring value={score.ratio} size={72}>{Math.round(score.ratio * 100)}%</Ring>
        <div className="grow">
          <h1>{readOnly ? `La journée de ${who}` : `Bonjour ${profile.name} 🌷`}</h1>
          <div className="row" style={{ marginTop: 2 }}>
            <button className="btn ghost small" style={{ padding: '2px 4px' }} disabled={day <= addDays(now, -6)}
              onClick={() => setDay(addDays(day, -1))} aria-label="Jour précédent">‹</button>
            <p className="date" style={{ margin: 0 }}>{day === now ? "Aujourd'hui" : dayLong(day)}</p>
            <button className="btn ghost small" style={{ padding: '2px 4px' }} disabled={day >= now}
              onClick={() => setDay(addDays(day, 1))} aria-label="Jour suivant">›</button>
          </div>
        </div>
        {streak > 0 && <span className="pill" title="Jours présents (la série ne casse qu'après 2 jours manqués)">🌱 {streak} j</span>}
      </header>

      {encouragement && !readOnly && (
        <button className="msg love" style={{ width: '100%', textAlign: 'left' }} onClick={onReadEncouragement}>
          <span style={{ fontSize: 22 }}>💌</span>
          <span>
            {encouragement.message}
            <small>Touche pour marquer comme lu</small>
          </span>
        </button>
      )}

      {ms ? (
        <div className="msg milestone">{ms}</div>
      ) : (
        day === now && !readOnly && (
          <div className="msg">
            {dailyMessage({ ratio: score.ratio, presentToday: present(now), presentYesterday: present(addDays(now, -1)), name: profile.name })}
          </div>
        )
      )}

      {active.length === 0 && !readOnly && (
        <div className="card center">
          <p style={{ marginTop: 0 }}>Ajoute tes compléments et tes plantes pour les retrouver ici, rangés par moment de la journée.</p>
          <button className="btn primary" onClick={onGoRoutine}>Configurer ma routine</button>
        </div>
      )}

      {MOMENTS.map((m) => {
        const list = active.filter((i) => i.moment === m.key)
        if (!list.length) return null
        const doneIds = list.filter((i) => t.checks.some((c) => c.day === day && c.item_id === i.id))
        const all = doneIds.length === list.length
        return (
          <section className="card" key={m.key}>
            <div className="card-head">
              <span className={`emoji-badge m-${m.key}`}>{m.emoji}</span>
              <h2>{m.label} <span className="sub">{doneIds.length}/{list.length}</span></h2>
              {!readOnly && (
                <button className={`btn-all ${all ? 'done' : ''}`} onClick={() => t.checkMany(day, list.map((i) => i.id))}>
                  {all ? '✓ Fait' : 'Tout pris'}
                </button>
              )}
            </div>
            {list.map((i) => {
              const on = doneIds.includes(i)
              return (
                <button key={i.id} className={`check ${on ? 'on' : ''}`} disabled={readOnly} onClick={() => t.toggleItem(day, i.id)}>
                  <span className="box">{on ? '✓' : ''}</span>
                  <span>
                    <div className="name">{i.name}</div>
                    {i.dose && <div className="dose">{i.dose}</div>}
                  </span>
                  <span className={`tag ${i.kind}`}>{i.kind === 'phyto' ? 'Plante' : 'Complément'}</span>
                </button>
              )
            })}
          </section>
        )
      })}

      <section className="card">
        <div className="card-head">
          <span className="emoji-badge m-water">💧</span>
          <h2>Eau <span className="sub">{liters(log?.water_ml ?? 0)} / {liters(profile.water_goal_ml)}</span></h2>
        </div>
        <div className="glasses">
          {Array.from({ length: glasses }, (_, i) => (
            <button key={i} className={`glass ${i < filled ? 'full' : ''}`} disabled={readOnly}
              onClick={() => tapGlass(i)} aria-label={`Verre ${i + 1}`} />
          ))}
        </div>
        {!readOnly && (
          <div className="row">
            <button className="btn sky small" onClick={() => t.patchLog(day, { water_ml: (log?.water_ml ?? 0) + profile.glass_ml })}>
              + 1 verre ({profile.glass_ml} ml)
            </button>
            {(log?.water_ml ?? 0) > 0 && (
              <button className="btn ghost small" onClick={() => t.patchLog(day, { water_ml: Math.max(0, (log?.water_ml ?? 0) - profile.glass_ml) })}>
                − 1
              </button>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="emoji-badge m-walk">🚶‍♀️</span>
          <h2>Marche du jour</h2>
        </div>
        <button className={`check ${log?.walked ? 'on' : ''}`} disabled={readOnly}
          onClick={() => t.patchLog(day, { walked: !log?.walked })}>
          <span className="box">{log?.walked ? '✓' : ''}</span>
          <span className="name">{readOnly ? 'Sortie marcher' : 'Je suis sortie marcher'}</span>
        </button>
        <div className="row" style={{ marginTop: 6 }}>
          <span className="muted small-text">Nombre de pas (optionnel)</span>
          <span className="spacer" />
          <StepsInput value={log?.steps ?? null} readOnly={readOnly}
            onSave={(steps) => t.patchLog(day, { steps, walked: steps ? true : !!log?.walked })} />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <span className="emoji-badge m-noon">🏃‍♀️</span>
          <h2>Sport <span className="sub">cette semaine</span></h2>
          {!readOnly && <button className="btn-all" onClick={() => setSportOpen(true)}>+ Séance</button>}
        </div>
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="dots">
            {Array.from({ length: Math.max(profile.sport_per_week, weekSports.length) }, (_, i) => (
              <span key={i} className={`dot ${i < weekSports.length ? 'on' : ''}`} />
            ))}
          </div>
          <span className="muted small-text">{weekSports.length}/{profile.sport_per_week}</span>
        </div>
        <p className="small-text" style={{ margin: '0 0 4px' }}>{sportMessage(weekSports.length, profile.sport_per_week, daysLeft)}</p>
        {weekSports.map((s) => (
          <div key={s.id} className="list-item small-text">
            <span>{s.type}{s.minutes ? ` · ${s.minutes} min` : ''}</span>
            <span className="muted">{dayLong(s.day)}</span>
            <span className="spacer" />
            {!readOnly && <button className="btn ghost small" onClick={() => t.removeSport(s.id)} aria-label="Supprimer">✕</button>}
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="emoji-badge m-morning">🍕</span>
          <h2>Repas plaisir <span className="sub">{weekCheats.length}/{profile.cheat_max} cette semaine</span></h2>
          {!readOnly && <button className="btn-all" onClick={() => t.addCheat(day)}>+ 1</button>}
        </div>
        <p className="small-text" style={{ margin: 0 }}>{cheatMessage(weekCheats.length, profile.cheat_max)}</p>
        {weekCheats.map((c) => (
          <div key={c.id} className="list-item small-text">
            <span className="muted">{dayLong(c.day)}</span>
            <span className="spacer" />
            {!readOnly && <button className="btn ghost small" onClick={() => t.removeCheat(c.id)} aria-label="Supprimer">✕</button>}
          </div>
        ))}
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

function StepsInput({ value, onSave, readOnly }: { value: number | null; onSave: (v: number | null) => void; readOnly?: boolean }) {
  const [v, setV] = useState(value?.toString() ?? '')
  useEffect(() => setV(value?.toString() ?? ''), [value])
  if (readOnly) return <strong>{value ? value.toLocaleString('fr-FR') : '—'}</strong>
  return (
    <input className="input small" inputMode="numeric" placeholder="ex. 6500" value={v}
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
      <div className="row wrap" style={{ marginBottom: 12 }}>
        {types.map((x) => (
          <button key={x} className={`chip ${type === x && !custom ? 'on' : ''}`} onClick={() => { setType(x); setCustom('') }}>{x}</button>
        ))}
      </div>
      <label className="field"><span>Ou autre activité</span>
        <input className="input" value={custom} placeholder="ex. Danse" onChange={(e) => setCustom(e.target.value)} />
      </label>
      <label className="field"><span>Durée</span>
        <div className="row wrap">
          {[15, 30, 45, 60].map((m) => (
            <button key={m} className={`chip ${minutes === m ? 'on' : ''}`} onClick={() => setMinutes(m)}>{m} min</button>
          ))}
          <button className={`chip ${minutes === null ? 'on' : ''}`} onClick={() => setMinutes(null)}>—</button>
        </div>
      </label>
      <button className="btn primary block" disabled={!chosen} onClick={() => onAdd(chosen, minutes)}>Enregistrer 💪</button>
    </Sheet>
  )
}
