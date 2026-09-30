import { useState } from 'react'
import { Ring } from '../components/ui'
import { HISTORY_DAYS, type TrackerApi } from '../lib/data'
import { addDays, dayNum, dayShort, rangeLabel, today, weekDays, weekStart } from '../lib/dates'
import { scoreDay } from '../lib/motivation'
import type { Profile } from '../lib/types'

export default function Week({ profile, tracker: t }: { profile: Profile; tracker: TrackerApi }) {
  const now = today()
  const current = weekStart(now)
  const oldest = weekStart(addDays(now, -HISTORY_DAYS + 7))
  const [start, setStart] = useState(current)
  const days = weekDays(start)
  const past = days.filter((d) => d <= now)

  const active = t.items.filter((i) => i.active)
  const logOf = (d: string) => t.logs.find((l) => l.day === d)
  const scores = days.map((d) => scoreDay(d, profile, t.items, t.checks, logOf(d)))

  const itemRatio = (d: string) =>
    active.length ? t.checks.filter((c) => c.day === d && active.some((i) => i.id === c.item_id)).length / active.length : 0
  const waterRatio = (d: string) => Math.min(1, (logOf(d)?.water_ml ?? 0) / profile.water_goal_ml)
  const sportsOf = (d: string) => t.sports.filter((s) => s.day === d).length
  const cheatsOf = (d: string) => t.cheats.filter((c) => c.day === d).length

  const sportCount = days.reduce((n, d) => n + sportsOf(d), 0)
  const cheatCount = days.reduce((n, d) => n + cheatsOf(d), 0)
  const goodDays = past.filter((_, i) => scores[i].ratio >= 0.8).length
  const presentDays = past.filter((_, i) => scores[i].present).length
  const waterDays = past.filter((d) => waterRatio(d) >= 1).length
  const walkDays = past.filter((d) => logOf(d)?.walked).length
  const steps = past.map((d) => logOf(d)?.steps).filter((s): s is number => !!s)
  const avgSteps = steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null

  const recap = (() => {
    if (!past.length) return ''
    const wins: string[] = []
    if (sportCount >= profile.sport_per_week) wins.push('objectif sport atteint')
    if (cheatCount <= profile.cheat_max) wins.push('repas plaisir maîtrisés')
    if (waterDays >= past.length - 1) wins.push("bien hydratée")
    if (walkDays >= past.length - 1) wins.push('sortie marcher presque tous les jours')
    const base = `Tu étais présente ${presentDays} jour${presentDays > 1 ? 's' : ''} sur ${past.length}`
    return wins.length ? `${base} : ${wins.join(', ')}. Bravo 🌸` : `${base}. Chaque jour compte, on continue 💛`
  })()

  const cell = (ratio: number, d: string) => (
    <div className={`cell ${d > now ? 'future' : ratio >= 0.999 ? 'on' : ratio > 0 ? 'half' : ''}`} />
  )

  return (
    <>
      <div className="week-nav">
        <button disabled={start <= oldest} onClick={() => setStart(addDays(start, -7))} aria-label="Semaine précédente">‹</button>
        <div className="center">
          <h1>{start === current ? 'Ma semaine' : 'Semaine passée'}</h1>
          <span className="muted small-text">{rangeLabel(start)}</span>
        </div>
        <button disabled={start >= current} onClick={() => setStart(addDays(start, 7))} aria-label="Semaine suivante">›</button>
      </div>

      <section className="card">
        <div className="week-rings">
          {days.map((d, i) => (
            <div key={d}>
              <div className={`d ${d === now ? 'today' : ''}`}>{dayShort(d)}</div>
              <div style={{ display: 'grid', placeItems: 'center', marginTop: 4 }}>
                <Ring value={d > now ? 0 : scores[i].ratio} size={38} stroke={5}>
                  <span style={{ fontSize: 12 }}>{dayNum(d)}</span>
                </Ring>
              </div>
            </div>
          ))}
        </div>
        {recap && <p className="small-text" style={{ margin: '14px 0 0' }}>{recap}</p>}
      </section>

      <section className="card">
        <div className="card-head"><h2>Objectifs de la semaine</h2></div>
        <Goal label="🏃‍♀️ Sport" value={`${sportCount}/${profile.sport_per_week}`} ratio={sportCount / profile.sport_per_week} />
        <Goal label="🍕 Repas plaisir" value={`${cheatCount}/${profile.cheat_max} max`} ratio={cheatCount / Math.max(1, profile.cheat_max)}
          sage={cheatCount <= profile.cheat_max} />
        <Goal label="✨ Jours à 80 % et plus" value={`${goodDays}/${past.length || 7}`} ratio={goodDays / 7} />
        <Goal label="💧 Objectif eau" value={`${waterDays}/${past.length || 7} j`} ratio={waterDays / 7} />
        <Goal label="🚶‍♀️ Sortie marcher" value={`${walkDays}/${past.length || 7} j`} ratio={walkDays / 7} />
        {avgSteps && <p className="muted small-text" style={{ margin: '4px 0 0' }}>Moyenne : {avgSteps.toLocaleString('fr-FR')} pas/jour</p>}
      </section>

      <section className="card">
        <div className="card-head"><h2>Détail</h2></div>
        <table className="grid">
          <thead>
            <tr>
              <td />
              {days.map((d) => <td key={d} className="muted small-text" style={{ textTransform: 'capitalize' }}>{dayShort(d).slice(0, 1)}</td>)}
            </tr>
          </thead>
          <tbody>
            {active.length > 0 && <tr><td>💊 Routine</td>{days.map((d) => <td key={d}>{cell(itemRatio(d), d)}</td>)}</tr>}
            <tr><td>💧 Eau</td>{days.map((d) => <td key={d}>{cell(waterRatio(d), d)}</td>)}</tr>
            <tr><td>🚶‍♀️ Marche</td>{days.map((d) => <td key={d}>{cell(logOf(d)?.walked ? 1 : 0, d)}</td>)}</tr>
            <tr><td>🏃‍♀️ Sport</td>{days.map((d) => <td key={d}>{cell(sportsOf(d) ? 1 : 0, d)}</td>)}</tr>
            <tr><td>🍕 Plaisir</td>{days.map((d) => <td key={d} style={{ fontSize: 14 }}>{cheatsOf(d) ? '🍕' : d > now ? '' : '·'}</td>)}</tr>
          </tbody>
        </table>
      </section>
    </>
  )
}

function Goal({ label, value, ratio, sage }: { label: string; value: string; ratio: number; sage?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row small-text" style={{ marginBottom: 5 }}>
        <strong>{label}</strong><span className="spacer" /><span className="muted">{value}</span>
      </div>
      <div className={`bar ${sage || ratio >= 1 ? 'sage' : ''}`}><i style={{ width: `${Math.min(1, ratio) * 100}%` }} /></div>
    </div>
  )
}
