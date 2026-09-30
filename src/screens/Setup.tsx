import { useState } from 'react'
import { updateProfile } from '../lib/data'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

/** Premier lancement : prénom + rôle */
export default function Setup({ profile, onDone }: { profile: Profile; onDone: (p: Profile) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<'owner' | 'supporter'>('owner')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      if (role === 'supporter') {
        const { error } = await supabase.rpc('link_with_code', { code })
        if (error) throw error
      }
      onDone(await updateProfile(profile.id, { name: name.trim(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }))
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="brand">
        <div className="eyebrow">Bienvenue</div>
        <h1 className="title">Faisons connaissance</h1>
      </div>
      <div className="panel" style={{ padding: 18 }}>
        <label className="field"><span>Ton prénom</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div className="field"><span>Tu utilises Cocon pour…</span>
          <div className="chips">
            <button className={`chip ${role === 'owner' ? 'on' : ''}`} onClick={() => setRole('owner')}>Suivre ma routine</button>
            <button className={`chip ${role === 'supporter' ? 'on' : ''}`} onClick={() => setRole('supporter')}>La soutenir</button>
          </div>
        </div>
        {role === 'supporter' && (
          <label className="field"><span>Son code (dans Routine → Mon soutien)</span>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ex. A1B2C3" maxLength={6} />
          </label>
        )}
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy || !name.trim() || (role === 'supporter' && code.length < 6)} onClick={go}>
          Commencer
        </button>
      </div>
    </div>
  )
}
