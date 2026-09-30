import { useState } from 'react'
import { Sheet } from '../components/ui'
import { updateProfile, type TrackerApi } from '../lib/data'
import { enablePush, isIOS, isStandalone, pushSupported } from '../lib/push'
import { supabase } from '../lib/supabase'
import { MOMENTS, type Moment, type Profile, type RoutineItem } from '../lib/types'

type Draft = Partial<RoutineItem> & Pick<RoutineItem, 'name' | 'kind' | 'moment' | 'dose'>

export default function Routine({ profile, setProfile, tracker: t }: {
  profile: Profile; setProfile: (p: Profile) => void; tracker: TrackerApi
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [newType, setNewType] = useState('')
  const [pushMsg, setPushMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const save = async (patch: Partial<Profile>) => {
    setProfile({ ...profile, ...patch })
    try { setProfile(await updateProfile(profile.id, patch)) } catch { /* l'état local reste, réessai au prochain changement */ }
  }

  const turnOnPush = async () => {
    setPushMsg(null)
    try {
      await enablePush(profile.id)
      await save({ reminders_on: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
      setPushMsg({ ok: true, text: 'Rappels activés 🔔' })
    } catch (e) {
      setPushMsg({ ok: false, text: (e as Error).message })
    }
  }

  const share = async () => {
    const text = `Rejoins-moi sur Cocon pour me soutenir 💛 Mon code : ${profile.invite_code}\n${location.href}`
    if (navigator.share) await navigator.share({ text }).catch(() => {})
    else await navigator.clipboard.writeText(text)
  }

  return (
    <>
      <div className="hello"><div className="grow"><h1>Ma routine</h1><p>Tout se règle ici, une fois pour toutes.</p></div></div>

      <section className="card">
        <div className="card-head">
          <h2>Compléments & plantes</h2>
          <button className="btn-all" onClick={() => setDraft({ name: '', dose: '', kind: 'supplement', moment: 'morning' })}>+ Ajouter</button>
        </div>
        {t.items.length === 0 && (
          <p className="muted small-text" style={{ margin: 0 }}>
            Rien pour l'instant. Ajoute chaque complément ou plante avec son moment de prise : ils apparaîtront groupés sur l'écran du jour.
          </p>
        )}
        {MOMENTS.map((m) => {
          const list = t.items.filter((i) => i.moment === m.key)
          if (!list.length) return null
          return (
            <div key={m.key} style={{ marginTop: 8 }}>
              <div className="muted small-text" style={{ fontWeight: 700, margin: '6px 0 2px' }}>{m.emoji} {m.label}</div>
              {list.map((i) => (
                <button key={i.id} className="list-item" style={{ width: '100%', textAlign: 'left', opacity: i.active ? 1 : 0.45 }} onClick={() => setDraft(i)}>
                  <span style={{ flex: 1 }}>
                    <strong>{i.name}</strong>
                    {i.dose && <span className="muted small-text"> · {i.dose}</span>}
                  </span>
                  <span className={`tag ${i.kind}`}>{i.kind === 'phyto' ? 'Plante' : 'Complément'}</span>
                </button>
              ))}
            </div>
          )
        })}
      </section>

      <section className="card">
        <div className="card-head"><h2>Objectifs</h2></div>
        <NumberRow label="💧 Eau par jour (ml)" value={profile.water_goal_ml} step={250} min={500} onChange={(v) => save({ water_goal_ml: v })} />
        <NumberRow label="🥛 Taille d'un verre (ml)" value={profile.glass_ml} step={50} min={100} onChange={(v) => save({ glass_ml: v })} />
        <NumberRow label="🏃‍♀️ Séances de sport / semaine" value={profile.sport_per_week} step={1} min={1} onChange={(v) => save({ sport_per_week: v })} />
        <NumberRow label="🍕 Repas plaisir max / semaine" value={profile.cheat_max} step={1} min={0} onChange={(v) => save({ cheat_max: v })} />
        <div className="muted small-text" style={{ fontWeight: 700, margin: '12px 0 6px' }}>Mes activités sportives</div>
        <div className="row wrap">
          {profile.sport_types.map((x) => (
            <button key={x} className="chip on" onClick={() => save({ sport_types: profile.sport_types.filter((s) => s !== x) })}>{x} ✕</button>
          ))}
        </div>
        <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => {
          e.preventDefault()
          const v = newType.trim()
          if (v && !profile.sport_types.includes(v)) save({ sport_types: [...profile.sport_types, v] })
          setNewType('')
        }}>
          <input className="input" placeholder="Ajouter une activité" value={newType} onChange={(e) => setNewType(e.target.value)} />
          <button className="btn small" type="submit">Ajouter</button>
        </form>
      </section>

      <section className="card">
        <div className="card-head"><h2>Rappels</h2></div>
        <p className="muted small-text" style={{ marginTop: 0 }}>
          Une notification à chaque moment, seulement s'il reste quelque chose à prendre.
        </p>
        {MOMENTS.map((m) => (
          <div key={m.key} className="list-item">
            <span style={{ flex: 1 }}>{m.emoji} {m.label}</span>
            <input className="input small" type="time" value={profile.reminders[m.key]}
              onChange={(e) => save({ reminders: { ...profile.reminders, [m.key]: e.target.value } as Record<Moment, string> })} />
          </div>
        ))}
        {isIOS() && !isStandalone() ? (
          <p className="small-text" style={{ marginBottom: 0 }}>
            📲 Sur iPhone, ajoute d'abord Cocon à l'écran d'accueil (Safari → Partager → « Sur l'écran d'accueil »), puis ouvre-la depuis l'icône pour activer les rappels.
          </p>
        ) : !pushSupported() ? (
          <p className="muted small-text" style={{ marginBottom: 0 }}>Notifications indisponibles sur ce navigateur.</p>
        ) : (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={turnOnPush}>{profile.reminders_on ? 'Réactiver sur cet appareil' : 'Activer les rappels 🔔'}</button>
            {profile.reminders_on && <button className="btn ghost small" onClick={() => save({ reminders_on: false })}>Couper</button>}
          </div>
        )}
        {pushMsg && <p className={pushMsg.ok ? 'ok' : 'error'}>{pushMsg.text}</p>}
      </section>

      <section className="card">
        <div className="card-head"><h2>Mon soutien 💛</h2></div>
        <p className="small-text" style={{ marginTop: 0 }}>
          Ton partenaire crée son compte, choisit « Je la soutiens » et entre ce code. Il verra ta progression et pourra t'envoyer des encouragements.
        </p>
        <div className="row">
          <span className="pill" style={{ fontSize: 20, letterSpacing: 3 }}>{profile.invite_code}</span>
          <span className="spacer" />
          <button className="btn small" onClick={share}>Partager</button>
        </div>
      </section>

      <section className="card">
        <label className="field"><span>Mon prénom</span>
          <input className="input" defaultValue={profile.name} onBlur={(e) => e.target.value !== profile.name && save({ name: e.target.value })} />
        </label>
        <button className="btn ghost block" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </section>

      <ItemSheet draft={draft} onClose={() => setDraft(null)}
        onSave={async (d) => { await t.saveItem(d); setDraft(null) }}
        onDelete={async (id) => { await t.deleteItem(id); setDraft(null) }} />
    </>
  )
}

function NumberRow({ label, value, step, min, onChange }: { label: string; value: number; step: number; min: number; onChange: (v: number) => void }) {
  return (
    <div className="list-item">
      <span style={{ flex: 1 }} className="small-text"><strong>{label}</strong></span>
      <button className="btn small" onClick={() => onChange(Math.max(min, value - step))} aria-label="Moins">−</button>
      <strong style={{ minWidth: 48, textAlign: 'center' }}>{value}</strong>
      <button className="btn small" onClick={() => onChange(value + step)} aria-label="Plus">+</button>
    </div>
  )
}

function ItemSheet({ draft, onClose, onSave, onDelete }: {
  draft: Draft | null; onClose: () => void; onSave: (d: Draft) => Promise<void>; onDelete: (id: string) => Promise<void>
}) {
  const [d, setD] = useState<Draft | null>(draft)
  const [err, setErr] = useState('')
  // réinitialise quand on ouvre un autre élément
  const [key, setKey] = useState(draft)
  if (draft !== key) { setKey(draft); setD(draft); setErr('') }
  if (!d) return null
  const set = (p: Partial<Draft>) => setD({ ...d, ...p })
  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? 'Modifier' : 'Ajouter à ma routine'}>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`chip ${d.kind === 'supplement' ? 'on' : ''}`} onClick={() => set({ kind: 'supplement' })}>💊 Complément</button>
        <button className={`chip ${d.kind === 'phyto' ? 'on' : ''}`} onClick={() => set({ kind: 'phyto' })}>🌿 Plante</button>
      </div>
      <label className="field"><span>Nom</span>
        <input className="input" autoFocus value={d.name} placeholder={d.kind === 'phyto' ? 'ex. Gattilier' : 'ex. Acide folique'} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="field"><span>Dose (optionnel)</span>
        <input className="input" value={d.dose} placeholder="ex. 1 gélule, 400 µg" onChange={(e) => set({ dose: e.target.value })} />
      </label>
      <label className="field"><span>Moment de prise</span>
        <div className="row wrap">
          {MOMENTS.map((m) => (
            <button key={m.key} className={`chip ${d.moment === m.key ? 'on' : ''}`} onClick={() => set({ moment: m.key })}>{m.emoji} {m.label}</button>
          ))}
        </div>
      </label>
      {d.id && (
        <label className="row" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={d.active ?? true} onChange={(e) => set({ active: e.target.checked })} />
          <span className="small-text">Actif (décoche pour mettre en pause sans perdre l'historique)</span>
        </label>
      )}
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={!d.name.trim()}
        onClick={() => onSave({ ...d, name: d.name.trim() }).catch((e) => setErr(e.message))}>Enregistrer</button>
      {d.id && <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => confirm('Supprimer cet élément et son historique ?') && onDelete(d.id!)}>Supprimer</button>}
    </Sheet>
  )
}
