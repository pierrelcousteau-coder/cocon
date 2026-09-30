import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : error.message })
    if (mode === 'up' && !data.session) setMsg({ ok: true, text: 'Compte créé ! Confirme ton adresse via le lien reçu par email, puis connecte-toi.' })
  }

  return (
    <div className="auth">
      <img className="logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
      <h1>Cocon</h1>
      <p className="center muted" style={{ marginTop: 0, marginBottom: 24 }}>Prendre soin de soi, un petit geste à la fois.</p>
      <form className="card" onSubmit={submit}>
        <label className="field"><span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Mot de passe</span>
          <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>}
        <button className="btn primary block" disabled={busy}>{mode === 'in' ? 'Se connecter' : 'Créer mon compte'}</button>
        <button type="button" className="btn ghost block" style={{ marginTop: 6 }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? 'Première fois ? Créer un compte' : "J'ai déjà un compte"}
        </button>
      </form>
    </div>
  )
}
