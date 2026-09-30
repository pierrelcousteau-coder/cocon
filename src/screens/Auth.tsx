import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'in' | 'up' | 'forgot'

export default function Auth() {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const go = (m: Mode) => { setMode(m); setMsg(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + import.meta.env.BASE_URL })
      setBusy(false)
      return setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Un lien pour choisir un nouveau mot de passe vient de t’être envoyé par email.' })
    }
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message })
    if (mode === 'up' && !data.session) setMsg({ ok: true, text: 'Compte créé. Confirme ton adresse via le lien reçu par email, puis connecte-toi.' })
  }

  return (
    <div className="auth">
      <div className="brand">
        <div className="eyebrow">Ma routine</div>
        <h1 className="title">Cocon</h1>
        <p className="muted" style={{ margin: '8px 0 0' }}>Prendre soin de soi, un geste à la fois.</p>
      </div>
      <form className="panel" style={{ padding: 18 }} onSubmit={submit}>
        {mode === 'forgot' && <p className="small muted" style={{ marginTop: 0 }}>Indique ton email : tu recevras un lien pour choisir un nouveau mot de passe.</p>}
        <label className="field"><span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'forgot' && (
          <label className="field"><span>Mot de passe</span>
            <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
        <button className="btn primary block" disabled={busy}>
          {mode === 'in' ? 'Se connecter' : mode === 'up' ? 'Créer mon compte' : 'Envoyer le lien'}
        </button>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          {mode === 'in' ? (
            <>
              <button type="button" className="link" onClick={() => go('forgot')}>Mot de passe oublié ?</button>
              <button type="button" className="link" onClick={() => go('up')}>Créer un compte</button>
            </>
          ) : (
            <button type="button" className="link" onClick={() => go('in')}>← Retour à la connexion</button>
          )}
        </div>
      </form>
    </div>
  )
}

/** Affiché après avoir cliqué sur le lien « mot de passe oublié » reçu par email */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setErr(error.message)
    else onDone()
  }
  return (
    <div className="auth">
      <div className="brand"><h1 className="title">Nouveau mot de passe</h1></div>
      <form className="panel" style={{ padding: 18 }} onSubmit={submit}>
        <label className="field"><span>Choisis un nouveau mot de passe</span>
          <input className="input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy}>Enregistrer</button>
      </form>
    </div>
  )
}
