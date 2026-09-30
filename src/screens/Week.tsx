import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Icon } from '../components/Icon'
import { HISTORY_DAYS, type TrackerApi } from '../lib/data'
import { addDays, dayNum, dayShort, rangeLabel, today, weekDays, weekStart } from '../lib/dates'
import { dailyItems, scoreDay, status, weeklyItems, type Status } from '../lib/motivation'
import type { Profile } from '../lib/types'
import { itemIcon } from './Today'

export default function Week({ profile, tracker: t }: { profile: Profile; tracker: TrackerApi }) {
  const now = today()
  const current = weekStart(now)
  const oldest = weekStart(addDays(now, -HISTORY_DAYS + 7))
  const [start, setStart] = useState(current)
  const days = weekDays(start)
  const elapsed = days.filter((d) => d <= now)

  const daily = dailyItems(t.items)
  const weekly = weeklyItems(t.items)
  const logOf = (d: string) => t.logs.find((l) => l.day === d)
  const scores = Object.fromEntries(days.map((d) => [d, scoreDay(d, profile, t.items, t.checks, logOf(d))]))

  const itemRatio = (d: string) =>
    daily.length ? t.checks.filter((c) => c.day === d && daily.some((i) => i.id === c.item_id)).length / daily.length : 0
  const waterRatio = (d: string) => Math.min(1, (logOf(d)?.water_ml ?? 0) / profile.water_goal_ml)
  const sportsOf = (d: string) => t.sports.filter((s) => s.day === d).length
  const cheatsOf = (d: string) => t.cheats.filter((c) => c.day === d).length

  const sportCount = days.reduce((n, d) => n + sportsOf(d), 0)
  const cheatCount = days.reduce((n, d) => n + cheatsOf(d), 0)
  const completeDays = days.filter((d) => scores[d].ratio >= 0.999).length
  const waterDays = days.filter((d) => waterRatio(d) >= 1).length
  const walkDays = days.filter((d) => logOf(d)?.walked).length
  const steps = elapsed.map((d) => logOf(d)?.steps).filter((s): s is number => !!s)
  const avgSteps = steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null
  const weekDone = (id: string) => t.checks.filter((c) => c.item_id === id && days.includes(c.day)).length

  const cell = (ratio: number, d: string) => <div className={`cell ${status(ratio, d, now)}`} />

  return (
    <>
      <div className="week-nav">
        <div>
          <div className="eyebrow">{rangeLabel(start)}</div>
          <h1 className="title">{start === current ? 'Ma semaine' : 'Semaine passée'}</h1>
        </div>
        <div className="arrows">
          <button disabled={start <= oldest} onClick={() => setStart(addDays(start, -7))} aria-label="Semaine précédente"><ChevronLeft size={18} /></button>
          <button disabled={start >= current} onClick={() => setStart(addDays(start, 7))} aria-label="Semaine suivante"><ChevronRight size={18} /></button>
        </div>
      </div>

      <section className="panel">
        <div className="days">
          {days.map((d) => (
            <div key={d}>
              <div className={`d ${d === now ? 'today' : ''}`}>{dayShort(d)}</div>
              <div className={`pip ${status(scores[d].ratio, d, now)}`}>{dayNum(d)}</div>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--ok)' }} />Complète</span>
          <span><i style={{ background: 'var(--warn)' }} />Partielle</span>
          <span><i style={{ background: 'var(--bad)' }} />Manquée</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Objectifs</h2></div>
        <Goal icon="CalendarCheck" label="Journées complètes" done={completeDays} target={7}
          hint="Tout est coché : routine, eau et marche" />
        <Goal icon="Dumbbell" label="Sport" done={sportCount} target={profile.sport_per_week} />
        {weekly.map((i) => <Goal key={i.id} icon={itemIcon(i)} label={i.name} done={weekDone(i.id)} target={i.weekly_target} />)}
        <Goal icon="Droplet" label="Objectif eau" done={waterDays} target={7} unit=" j" />
        <Goal icon="Footprints" label="Sortie marcher" done={walkDays} target={7} unit=" j"
          hint={avgSteps ? `Moyenne : ${avgSteps.toLocaleString('fr-FR')} pas par jour` : undefined} />
        <Goal icon="Pizza" label="Repas plaisir" done={cheatCount} target={profile.cheat_max} max />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Détail</h2></div>
        <table className="grid">
          <thead>
            <tr><td />{days.map((d) => <td key={d} style={{ textTransform: 'capitalize' }}>{dayShort(d).slice(0, 1)}</td>)}</tr>
          </thead>
          <tbody>
            {daily.length > 0 && <tr><td>Routine</td>{days.map((d) => <td key={d}>{cell(itemRatio(d), d)}</td>)}</tr>}
            <tr><td>Eau</td>{days.map((d) => <td key={d}>{cell(waterRatio(d), d)}</td>)}</tr>
            <tr><td>Marche</td>{days.map((d) => <td key={d}>{cell(logOf(d)?.walked ? 1 : 0, d)}</td>)}</tr>
            <tr><td>Sport</td>{days.map((d) => <td key={d}><div className={`cell ${sportsOf(d) ? 'done' : d > now ? 'future' : 'pending'}`} /></td>)}</tr>
            <tr><td>Plaisir</td>{days.map((d) => <td key={d}><div className={`cell ${cheatsOf(d) ? 'bad' : d > now ? 'future' : 'pending'}`} /></td>)}</tr>
          </tbody>
        </table>
      </section>
    </>
  )
}

function Goal({ icon, label, done, target, unit = '', max, hint }: {
  icon: string; label: string; done: number; target: number; unit?: string; max?: boolean; hint?: string
}) {
  // « max » : objectif à ne pas dépasser (repas plaisir)
  const st: Status = max ? (done > target ? 'missed' : 'done') : done >= target ? 'done' : done > 0 ? 'partial' : 'pending'
  const color = st === 'done' ? 'ok-t' : st === 'missed' ? 'bad-t' : st === 'partial' ? 'warn-t' : 'muted'
  const n = max ? Math.max(done, target, 1) : Math.max(target, done)
  return (
    <div className="goal">
      <div className="top">
        <span className="ico"><Icon name={icon} size={16} /></span>
        <span className="name">{label}</span>
        <span className={`v ${color}`}>{done}/{target}{unit}{max ? ' max' : ''}</span>
      </div>
      <div className={`segs ${max && done > target ? 'bad' : ''}`}>
        {Array.from({ length: n }, (_, i) => <i key={i} className={i < done ? 'on' : ''} />)}
      </div>
      {hint && <div className="small muted" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  )
}
