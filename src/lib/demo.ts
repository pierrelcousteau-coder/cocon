// Mode démo (npm run demo) : faux client Supabase en mémoire + localStorage,
// pour essayer l'app sans backend. N'implémente que ce que l'app utilise.
import { addDays, today } from './dates'

type Row = Record<string, any>
const KEYS: Record<string, string[]> = {
  profiles: ['id'],
  routine_items: ['id'],
  daily_logs: ['user_id', 'day'],
  item_checks: ['user_id', 'day', 'item_id'],
  sport_sessions: ['id'],
  cheat_meals: ['id'],
  encouragements: ['id'],
  push_subscriptions: ['endpoint'],
}
const UID = 'demo-user'
const STORE = 'cocon-demo'

function seed(): Record<string, Row[]> {
  const t = today()
  const items = [
    { id: 'i1', kind: 'supplement', name: 'Exemple : complément 1', dose: '1 gélule', moment: 'morning' },
    { id: 'i2', kind: 'supplement', name: 'Exemple : complément 2', dose: '', moment: 'morning' },
    { id: 'i3', kind: 'phyto', name: 'Exemple : plante', dose: '1 tisane', moment: 'evening' },
    { id: 'i4', kind: 'activity', name: 'Méditation', dose: '10 minutes', moment: 'anytime', icon: 'Brain' },
    { id: 'i5', kind: 'activity', name: 'Lecture', dose: '', moment: 'anytime', icon: 'BookOpen', frequency: 'weekly', weekly_target: 3 },
  ].map((i, n) => ({ icon: '', frequency: 'daily', weekly_target: 1, ...i, user_id: UID, active: true, sort: n, created_at: '' }))
  const logs: Row[] = []
  const checks: Row[] = []
  for (let k = 1; k <= 9; k++) {
    if (k === 4) continue // un jour « off »
    const day = addDays(t, -k)
    logs.push({ user_id: UID, day, water_ml: 1000 + (k % 3) * 250, walked: k % 2 === 1, steps: k % 2 ? 5000 + k * 400 : null, mood: null })
    for (const i of items.slice(0, k % 3 === 0 ? 2 : 4)) checks.push({ user_id: UID, day, item_id: i.id })
  }
  return {
    profiles: [{ id: 'demo-partner', name: 'Soutien', role: 'supporter', linked_to: UID, invite_code: 'PART01' }, {
      id: UID, name: '', role: 'owner', linked_to: null, invite_code: 'DEMO42', tz: 'Europe/Paris',
      water_goal_ml: 1500, glass_ml: 250, sport_per_week: 3, sport_types: ['Marche rapide', 'Yoga', 'Pilates', 'Natation'],
      cheat_max: 1, reminders: { morning: '08:00', noon: '12:30', evening: '21:00' }, reminders_on: false,
    }],
    routine_items: items,
    daily_logs: logs,
    item_checks: checks,
    sport_sessions: [{ id: 's1', user_id: UID, day: addDays(t, -2), type: 'Yoga', minutes: 30, created_at: '' }],
    cheat_meals: [],
    encouragements: [
      { id: 'e0', from_id: UID, to_id: 'demo-partner', message: 'Journée difficile', created_at: new Date(Date.now() - 86400000).toISOString(), read_at: new Date().toISOString() },
      { id: 'e1', from_id: 'demo-partner', to_id: UID, message: 'Je suis fier de toi', created_at: new Date().toISOString(), read_at: null },
    ],
    push_subscriptions: [],
  }
}

let _db: Record<string, Row[]> | null = null
const tables = () => {
  if (!_db) try { _db = JSON.parse(localStorage.getItem(STORE) || '') } catch { _db = seed() }
  return _db!
}
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(tables())) } catch { /* ignore */ } }
const uuid = () => crypto.randomUUID()
const same = (table: string, a: Row, b: Row) => KEYS[table].every((k) => a[k] === b[k])

class Query implements PromiseLike<{ data: any; error: any }> {
  private filters: ((r: Row) => boolean)[] = []
  private op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private one: 'single' | 'maybe' | null = null
  private n = Infinity
  private sortKey: string | null = null
  private asc = true
  constructor(private table: string) { tables()[table] ??= [] }

  select() { return this }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this }
  upsert(p: Row | Row[]) { this.op = 'upsert'; this.payload = p; return this }
  update(p: Row) { this.op = 'update'; this.payload = p; return this }
  delete() { this.op = 'delete'; return this }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this }
  gte(k: string, v: any) { this.filters.push((r) => r[k] >= v); return this }
  is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this }
  in(k: string, v: any[]) { this.filters.push((r) => v.includes(r[k])); return this }
  or(expr: string) {
    const parts = expr.split(',').map((p) => p.split('.'))
    this.filters.push((r) => parts.some(([k, , v]) => String(r[k]) === v))
    return this
  }
  match(o: Row) { for (const [k, v] of Object.entries(o)) this.eq(k, v); return this }
  order(k: string, o?: { ascending?: boolean }) { if (!this.sortKey) { this.sortKey = k; this.asc = o?.ascending ?? true } return this }
  limit(n: number) { this.n = n; return this }
  single() { this.one = 'single'; return this }
  maybeSingle() { this.one = 'maybe'; return this }

  private run(): { data: any; error: any } {
    const db = tables()
    const rows = db[this.table]
    const hit = (r: Row) => this.filters.every((f) => f(r))
    let out: Row[] = []
    if (this.op === 'select') out = rows.filter(hit)
    if (this.op === 'delete') db[this.table] = rows.filter((r) => !hit(r))
    if (this.op === 'update') out = rows.filter(hit).map((r) => Object.assign(r, this.payload))
    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({
        id: uuid(), created_at: new Date().toISOString(), ...r,
      }))
      for (const r of list) {
        const i = rows.findIndex((x) => same(this.table, x, r))
        if (i >= 0 && this.op === 'insert') return { data: null, error: { message: 'duplicate' } }
        if (i >= 0) rows[i] = { ...rows[i], ...r }
        else rows.push(r)
        out.push(i >= 0 ? rows[i] : r)
      }
    }
    if (this.op !== 'select') persist()
    if (this.sortKey) out = [...out].sort((a, b) => (a[this.sortKey!] > b[this.sortKey!] ? 1 : -1) * (this.asc ? 1 : -1))
    out = out.slice(0, this.n).map((r) => structuredClone(r))
    if (this.one) return out[0] || this.one === 'maybe' ? { data: out[0] ?? null, error: null } : { data: null, error: { message: 'not found' } }
    return { data: out, error: null }
  }

  then<A, B>(ok?: ((v: { data: any; error: any }) => A | PromiseLike<A>) | null, ko?: ((e: any) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.run()).then(ok, ko)
  }
}

const listeners = new Set<(e: string, s: any) => void>()
// la démo démarre connectée ; « Se déconnecter » affiche l'écran de connexion
const session = () => (localStorage.getItem(STORE + '-auth') === 'off' ? null : { user: { id: UID } })
const setAuth = (on: boolean) => {
  if (on) localStorage.removeItem(STORE + '-auth')
  else localStorage.setItem(STORE + '-auth', 'off')
  listeners.forEach((l) => l(on ? 'SIGNED_IN' : 'SIGNED_OUT', session()))
  return { data: { session: session() }, error: null }
}

const channel = () => {
  const c = { on: () => c, subscribe: () => c }
  return c
}

export const demoClient = {
  from: (t: string) => new Query(t),
  channel,
  removeChannel: () => {},
  rpc: async () => ({ data: null, error: { message: 'Indisponible en mode démo' } }),
  functions: { invoke: async () => ({ data: null, error: null }) },
  auth: {
    getSession: async () => ({ data: { session: session() } }),
    onAuthStateChange: (cb: (e: string, s: any) => void) => {
      listeners.add(cb)
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
    },
    signInWithPassword: async () => setAuth(true),
    signUp: async () => setAuth(true),
    signOut: async () => setAuth(false),
    resetPasswordForEmail: async () => ({ data: null, error: null }),
    updateUser: async () => ({ data: null, error: null }),
  },
}

/** Réinitialise la démo : localStorage.removeItem('cocon-demo') puis recharger */
