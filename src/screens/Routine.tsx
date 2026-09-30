import { useState } from 'react'
import { ChevronRight, Minus, Plus, X } from 'lucide-react'
import { Sheet } from '../components/ui'
import { ICONS, Icon } from '../components/Icon'
import { updateProfile, type TrackerApi } from '../lib/data'
import { enablePush, isIOS, isStandalone, pushSupported, testPush } from '../lib/push'
import { supabase } from '../lib/supabase'
import { KINDS, MOMENTS, REMINDER_MOMENTS, type Profile, type ReminderMoment, type RoutineItem } from '../lib/types'
import { itemIcon } from './Today'

type Draft = Partial<RoutineItem> & Pick<RoutineItem, 'name' | 'kind' | 'moment' | 'dose' | 'icon' | 'frequency' | 'weekly_target'>
const NEW: Draft = { name: '', dose: '', kind: 'supplement', moment: 'morning', icon: '', frequency: 'daily', weekly_target: 2 }

export default function Routine({ profile, setProfile, tracker: t }: {
  profile: Profile; setProfile: (p: Profile) => void; tracker: TrackerApi
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [newType, setNewType] = useState('')
  const [pushMsg, setPushMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const save = async (patch: Partial<Profile>) => {
    setProfile({ ...profile, ...patch })
    try { setProfile(await updateProfile(profile.id, patch)) } catch { /* l'état local reste */ }
  }

  const turnOnPush = async () => {
    setPushMsg(null)
    try {
      await enablePush(profile.id)
      await save({ reminders_on: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
      setPushMsg({ ok: true, text: 'Rappels activés sur cet appareil.' })
    } catch (e) {
      setPushMsg({ ok: false, text: (e as Error).message })
    }
  }

  const runTest = async () => {
    setPushMsg({ ok: true, text: 'Envoi…' })
    const text = await testPush()
    setPushMsg({ ok: text.startsWith('Notification'), text })
  }

  const share = async () => {
    const text = `Rejoins-moi sur Cocon. Mon code : ${profile.invite_code}\n${location.href}`
    if (navigator.share) await navigator.share({ text }).catch(() => {})
    else await navigator.clipboard.writeText(text)
  }

  const daily = t.items.filter((i) => i.frequency !== 'weekly')
  const weekly = t.items.filter((i) => i.frequency === 'weekly')
  const row = (i: RoutineItem) => (
    <button key={i.id} className="item" style={{ opacity: i.active ? 1 : 0.4 }} onClick={() => setDraft(i)}>
      <span className="ico"><Icon name={itemIcon(i)} /></span>
      <span className="txt">
        <div className="name">{i.name}</div>
        <div className="sub">
          {KINDS.find((k) => k.key === i.kind)?.label}
          {i.frequency === 'weekly' ? ` · ${i.weekly_target}× par semaine` : ''}
          {i.dose ? ` · ${i.dose}` : ''}
          {!i.active ? ' · en pause' : ''}
        </div>
      </span>
      <ChevronRight size={16} className="muted" />
    </button>
  )

  return (
    <>
      <header className="head">
        <div className="grow">
          <div className="eyebrow">Réglages</div>
          <h1 className="title">Ma routine</h1>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Éléments suivis</h2>
          <button className="link" onClick={() => setDraft({ ...NEW })}>Ajouter</button>
        </div>
        {t.items.length === 0 && (
          <p className="small muted" style={{ marginTop: 0, paddingBottom: 12 }}>
            Compléments, plantes ou activités (méditation, lecture, température…). Chacun apparaîtra au bon moment sur l'écran du jour.
          </p>
        )}
        {MOMENTS.map((m) => {
          const list = daily.filter((i) => i.moment === m.key)
          if (!list.length) return null
          return (
            <div key={m.key}>
              <div className="eyebrow" style={{ padding: '10px 0 2px' }}>{m.label}</div>
              {list.map(row)}
            </div>
          )
        })}
        {weekly.length > 0 && (
          <div>
            <div className="eyebrow" style={{ padding: '10px 0 2px' }}>Chaque semaine</div>
            {weekly.map(row)}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Objectifs</h2></div>
        <Stepper icon="Droplet" label="Eau par jour" value={profile.water_goal_ml} unit=" ml" step={250} min={500} onChange={(v) => save({ water_goal_ml: v })} />
        <Stepper icon="CupSoda" label="Taille d'un verre" value={profile.glass_ml} unit=" ml" step={50} min={100} onChange={(v) => save({ glass_ml: v })} />
        <Stepper icon="Dumbbell" label="Sport par semaine" value={profile.sport_per_week} step={1} min={1} onChange={(v) => save({ sport_per_week: v })} />
        <Stepper icon="Pizza" label="Repas plaisir max" value={profile.cheat_max} step={1} min={0} onChange={(v) => save({ cheat_max: v })} />
        <div className="line-row" style={{ display: 'block' }}>
          <div className="small muted" style={{ marginBottom: 8 }}>Mes sports</div>
          <div className="chips">
            {profile.sport_types.map((x) => (
              <button key={x} className="chip" onClick={() => save({ sport_types: profile.sport_types.filter((s) => s !== x) })}>
                {x} <X size={12} />
              </button>
            ))}
          </div>
          <form className="row" style={{ marginTop: 10 }} onSubmit={(e) => {
            e.preventDefault()
            const v = newType.trim()
            if (v && !profile.sport_types.includes(v)) save({ sport_types: [...profile.sport_types, v] })
            setNewType('')
          }}>
            <input className="input" placeholder="Ajouter un sport" value={newType} onChange={(e) => setNewType(e.target.value)} />
            <button className="btn s" type="submit">Ajouter</button>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Rappels</h2></div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Une notification à chaque moment, seulement s'il reste quelque chose à faire.
        </p>
        {REMINDER_MOMENTS.map((m) => (
          <div key={m.key} className="line-row">
            <span className="muted" style={{ display: 'grid' }}><Icon name={m.icon} size={16} /></span>
            <span className="grow">{m.label}</span>
            <input className="input num" type="time" value={profile.reminders[m.key]}
              onChange={(e) => save({ reminders: { ...profile.reminders, [m.key]: e.target.value } as Record<ReminderMoment, string> })} />
          </div>
        ))}
        <div style={{ padding: '12px 0 16px' }}>
          {isIOS() && !isStandalone() ? (
            <p className="small" style={{ margin: 0 }}>
              Sur iPhone, ajoute d'abord Cocon à l'écran d'accueil (Safari → Partager → « Sur l'écran d'accueil »), puis ouvre-la depuis l'icône pour activer les rappels.
            </p>
          ) : !pushSupported() ? (
            <p className="small muted" style={{ margin: 0 }}>Notifications indisponibles sur ce navigateur.</p>
          ) : (
            <div className="row">
              <button className="btn primary s" onClick={turnOnPush}>{profile.reminders_on ? 'Réactiver sur cet appareil' : 'Activer les rappels'}</button>
              <button className="btn s" onClick={runTest}>Tester</button>
              <span className="spacer" />
              {profile.reminders_on && <button className="btn quiet s" onClick={() => save({ reminders_on: false })}>Couper</button>}
            </div>
          )}
          {pushMsg && <p className={pushMsg.ok ? 'success' : 'error'}>{pushMsg.text}</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Mon soutien</h2></div>
        <p className="small muted" style={{ marginTop: 0 }}>
          Ton partenaire crée son compte, choisit « La soutenir » et entre ce code. Il verra ta progression et pourra t'écrire.
        </p>
        <div className="row" style={{ paddingBottom: 16 }}>
          <span className="title-s" style={{ letterSpacing: '.18em' }}>{profile.invite_code}</span>
          <span className="spacer" />
          <button className="btn s" onClick={share}>Partager</button>
        </div>
      </section>

      <section className="panel" style={{ paddingTop: 16, paddingBottom: 12 }}>
        <label className="field"><span>Mon prénom</span>
          <input className="input" defaultValue={profile.name} onBlur={(e) => e.target.value !== profile.name && save({ name: e.target.value })} />
        </label>
        <button className="btn quiet block" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </section>

      <ItemSheet draft={draft} onClose={() => setDraft(null)}
        onSave={async (d) => { await t.saveItem(d); setDraft(null) }}
        onDelete={async (id) => { await t.deleteItem(id); setDraft(null) }} />
    </>
  )
}

function Stepper({ icon, label, value, unit = '', step, min, onChange }: {
  icon: string; label: string; value: number; unit?: string; step: number; min: number; onChange: (v: number) => void
}) {
  return (
    <div className="line-row">
      <span className="muted" style={{ display: 'grid' }}><Icon name={icon} size={16} /></span>
      <span className="grow">{label}</span>
      <div className="stepper s">
        <button disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} aria-label="Moins"><Minus size={14} /></button>
        <span className="val">{value}{unit}</span>
        <button onClick={() => onChange(value + step)} aria-label="Plus"><Plus size={14} /></button>
      </div>
    </div>
  )
}

function ItemSheet({ draft, onClose, onSave, onDelete }: {
  draft: Draft | null; onClose: () => void; onSave: (d: Draft) => Promise<void>; onDelete: (id: string) => Promise<void>
}) {
  const [d, setD] = useState<Draft | null>(draft)
  const [err, setErr] = useState('')
  const [key, setKey] = useState(draft)
  if (draft !== key) { setKey(draft); setD(draft); setErr('') }
  if (!d) return null
  const set = (p: Partial<Draft>) => setD({ ...d, ...p })
  const shownIcon = d.icon || KINDS.find((k) => k.key === d.kind)!.icon
  const placeholder = d.kind === 'phyto' ? 'ex. Tisane de framboisier' : d.kind === 'activity' ? 'ex. Méditation' : 'ex. Acide folique'
  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? 'Modifier' : 'Nouvel élément'}>
      <div className="field"><span>Type</span>
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k.key} className={`chip ${d.kind === k.key ? 'on' : ''}`} onClick={() => set({ kind: k.key })}>
              <Icon name={k.icon} size={14} /> {k.label}
            </button>
          ))}
        </div>
      </div>
      <label className="field"><span>Nom</span>
        <input className="input" value={d.name} placeholder={placeholder} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="field"><span>{d.kind === 'activity' ? 'Détail (optionnel)' : 'Dose (optionnel)'}</span>
        <input className="input" value={d.dose} placeholder={d.kind === 'activity' ? 'ex. 10 minutes' : 'ex. 1 gélule'} onChange={(e) => set({ dose: e.target.value })} />
      </label>
      <div className="field"><span>Icône</span>
        <div className="icon-grid">
          {Object.keys(ICONS).map((n) => (
            <button key={n} className={shownIcon === n ? 'on' : ''} onClick={() => set({ icon: n })} aria-label={n}><Icon name={n} size={19} /></button>
          ))}
        </div>
      </div>
      <div className="field"><span>Fréquence</span>
        <div className="chips">
          <button className={`chip ${d.frequency === 'daily' ? 'on' : ''}`} onClick={() => set({ frequency: 'daily' })}>Chaque jour</button>
          <button className={`chip ${d.frequency === 'weekly' ? 'on' : ''}`} onClick={() => set({ frequency: 'weekly' })}>Par semaine</button>
        </div>
      </div>
      {d.frequency === 'weekly' ? (
        <div className="field"><span>Combien de fois par semaine</span>
          <div className="stepper">
            <button disabled={d.weekly_target <= 1} onClick={() => set({ weekly_target: d.weekly_target - 1 })} aria-label="Moins"><Minus size={15} /></button>
            <span className="val">{d.weekly_target}</span>
            <button disabled={d.weekly_target >= 7} onClick={() => set({ weekly_target: d.weekly_target + 1 })} aria-label="Plus"><Plus size={15} /></button>
          </div>
        </div>
      ) : (
        <div className="field"><span>Moment</span>
          <div className="chips">
            {MOMENTS.map((m) => (
              <button key={m.key} className={`chip ${d.moment === m.key ? 'on' : ''}`} onClick={() => set({ moment: m.key })}>{m.label}</button>
            ))}
          </div>
        </div>
      )}
      {d.id && (
        <label className="row" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={d.active ?? true} onChange={(e) => set({ active: e.target.checked })} />
          <span className="small">Actif — décoche pour mettre en pause sans perdre l'historique</span>
        </label>
      )}
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={!d.name.trim()}
        onClick={() => onSave({ ...d, name: d.name.trim() }).catch((e) => setErr(e.message))}>Enregistrer</button>
      {d.id && (
        <button className="btn danger block" style={{ marginTop: 8 }}
          onClick={() => confirm('Supprimer cet élément et son historique ?') && onDelete(d.id!)}>Supprimer</button>
      )}
    </Sheet>
  )
}
