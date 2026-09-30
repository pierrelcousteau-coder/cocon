// Supabase Edge Function « push »
//  - { type: 'reminders' }            → appelée toutes les 5 min par pg_cron : rappels par moment de la journée
//  - { type: 'encouragement', id }    → appelée par l'app après l'envoi d'un message (dans les deux sens)
//  - { type: 'test' }                 → notification de test envoyée à soi-même, avec diagnostic
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:cocon@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const LABELS: Record<string, string> = { morning: 'du matin', noon: 'de midi', evening: 'du soir' }
const WINDOW_MIN = 10 // tolérance si le cron a un peu de retard

async function sendTo(userId: string, payload: { title: string; body: string; tag?: string }) {
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', userId)
  const results: { ok: boolean; error?: string }[] = []
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
      results.push({ ok: true })
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      results.push({ ok: false, error: code ? `HTTP ${code}` : String((e as Error).message ?? e) })
    }
  }
  return { subs: subs?.length ?? 0, results }
}

async function userFrom(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await db.auth.getUser(jwt)
  return user
}

/** Heure locale "HH:MM" et date "YYYY-MM-DD" dans le fuseau de l'utilisatrice */
function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map((p) => [p.type, p.value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

async function reminders() {
  const { data: profiles } = await db.from('profiles').select('id, name, tz, reminders').eq('role', 'owner').eq('reminders_on', true)
  let sent = 0
  for (const p of profiles ?? []) {
    const { day, minutes } = localNow(p.tz)
    for (const [moment, hhmm] of Object.entries(p.reminders as Record<string, string>)) {
      const [h, m] = hhmm.split(':').map(Number)
      const diff = minutes - (h * 60 + m)
      if (diff < 0 || diff >= WINDOW_MIN) continue

      // une seule fois par moment et par jour
      const { error: dup } = await db.from('reminder_log').insert({ user_id: p.id, day, moment })
      if (dup) continue

      // le soir, on rappelle aussi les éléments « dans la journée » non faits
      const moments = moment === 'evening' ? ['evening', 'anytime'] : [moment]
      const { data: items } = await db.from('routine_items').select('id, name').eq('user_id', p.id)
        .in('moment', moments).eq('active', true).eq('frequency', 'daily')
      const { data: checks } = await db.from('item_checks').select('item_id').eq('user_id', p.id).eq('day', day)
      const done = new Set((checks ?? []).map((c) => c.item_id))
      const todo = (items ?? []).filter((i) => !done.has(i.id))

      let body = ''
      if (todo.length) body = todo.map((i) => i.name).join(', ')
      if (moment === 'morning') {
        const { count } = await db.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('day', day)
        if (!count) body += `${body ? ' · ' : ''}Écris ta to do du jour`
      }
      if (moment === 'evening') {
        const { data: log } = await db.from('daily_logs').select('water_ml, walked').eq('user_id', p.id).eq('day', day).maybeSingle()
        const extra = [!log?.walked && 'ta marche', !(log?.water_ml) && 'ton eau'].filter(Boolean)
        if (extra.length) body += `${body ? ' · ' : ''}Pense à noter ${extra.join(' et ')}`
      }
      if (!body) continue // tout est fait : pas de rappel inutile
      await sendTo(p.id, { title: `Ta routine ${LABELS[moment] ?? ''}`, body, tag: `reminder-${moment}` })
      sent++
    }
  }
  return { sent }
}

async function encouragement(req: Request, id: string) {
  // vérifie que l'appelant est bien l'auteur du message
  const user = await userFrom(req)
  const { data: enc } = await db.from('encouragements').select('*').eq('id', id).single()
  if (!user || !enc || enc.from_id !== user.id) return { error: 'forbidden' }
  const { data: from } = await db.from('profiles').select('name').eq('id', enc.from_id).single()
  await sendTo(enc.to_id, { title: from?.name || 'Cocon', body: enc.message, tag: 'message' })
  return { ok: true }
}

async function test(req: Request) {
  const user = await userFrom(req)
  if (!user) return { error: 'forbidden' }
  return await sendTo(user.id, { title: 'Cocon', body: 'Les notifications fonctionnent.', tag: 'test' })
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const body = await req.json().catch(() => ({}))
  let result: unknown
  if (body.type === 'reminders') {
    // réservé au cron : il doit présenter le secret CRON_SECRET
    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403, headers: cors })
    result = await reminders()
  } else if (body.type === 'test') {
    result = await test(req)
  } else if (body.type === 'encouragement') {
    result = await encouragement(req, body.id)
  } else {
    return new Response('bad request', { status: 400, headers: cors })
  }
  return new Response(JSON.stringify(result), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
