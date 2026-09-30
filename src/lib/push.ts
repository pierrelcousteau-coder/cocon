import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID

/** Sur iPhone, les notifications ne marchent que si l'app est ajoutée à l'écran d'accueil */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

const b64ToUint8 = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  } catch (e) {
    console.warn('SW', e)
  }
}

export async function enablePush(userId: string) {
  if (!pushSupported()) throw new Error('Notifications non disponibles sur cet appareil')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications refusées dans les réglages')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID!) }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, user_id: userId, p256dh: json.keys.p256dh, auth: json.keys.auth })
  if (error) throw error
}

/** Envoie une notification à l'autre personne pour un nouveau message */
export async function notifyMessage(messageId: string) {
  await supabase.functions.invoke('push', { body: { type: 'encouragement', id: messageId } }).catch(() => {})
}

/** Envoie une notification de test à soi-même ; renvoie le diagnostic */
export async function testPush(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('push', { body: { type: 'test' } })
  if (error) return `Erreur serveur : ${error.message}`
  if (!data?.subs) return "Aucun appareil enregistré : touche d'abord « Activer les rappels »."
  const failed = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok)
  if (failed.length === data.subs) return `Échec d'envoi : ${failed[0]?.error ?? 'inconnu'}`
  return `Notification envoyée à ${data.subs - failed.length} appareil${data.subs - failed.length > 1 ? 's' : ''}.`
}
