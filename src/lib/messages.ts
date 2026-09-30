import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { notifyMessage } from './push'
import type { Encouragement, Profile } from './types'

/** Le profil de l'autre personne : le soutien pour elle, la personne suivie pour le soutien */
export function usePartner(me: Profile) {
  const [partner, setPartner] = useState<Profile | null | undefined>(undefined)
  useEffect(() => {
    const q = me.role === 'supporter'
      ? supabase.from('profiles').select('*').eq('id', me.linked_to ?? '').maybeSingle()
      : supabase.from('profiles').select('*').eq('linked_to', me.id).eq('role', 'supporter').limit(1).maybeSingle()
    q.then(({ data }) => setPartner(data ?? null))
  }, [me.id, me.role, me.linked_to])
  return partner
}

/** Conversation entre moi et l'autre, mise à jour en temps réel */
export function useMessages(meId: string) {
  const [messages, setMessages] = useState<Encouragement[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('encouragements').select('*')
      .or(`to_id.eq.${meId},from_id.eq.${meId}`).order('created_at', { ascending: true }).limit(300)
    setMessages(data ?? [])
  }, [meId])

  useEffect(() => {
    load()
    const channel = supabase.channel(`messages-${meId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encouragements' }, () => load())
      .subscribe()
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [meId, load])

  const unread = messages.filter((m) => m.to_id === meId && !m.read_at).length

  const send = async (toId: string, message: string) => {
    const text = message.trim()
    if (!text) return
    const { data, error } = await supabase.from('encouragements').insert({ from_id: meId, to_id: toId, message: text }).select().single()
    if (error) throw error
    setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]))
    notifyMessage(data.id)
  }

  const markRead = async () => {
    if (!unread) return
    const now = new Date().toISOString()
    setMessages((m) => m.map((x) => (x.to_id === meId && !x.read_at ? { ...x, read_at: now } : x)))
    await supabase.from('encouragements').update({ read_at: now }).eq('to_id', meId).is('read_at', null)
  }

  return { messages, unread, send, markRead }
}
