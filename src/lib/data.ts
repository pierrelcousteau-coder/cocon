import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { addDays, today } from './dates'
import type { CheatMeal, DailyLog, ItemCheck, Profile, RoutineItem, SportSession } from './types'

export const HISTORY_DAYS = 84

export interface Tracker {
  loading: boolean
  items: RoutineItem[]
  logs: DailyLog[]
  checks: ItemCheck[]
  sports: SportSession[]
  cheats: CheatMeal[]
}

const empty: Tracker = { loading: true, items: [], logs: [], checks: [], sports: [], cheats: [] }

/** Charge et modifie les données de suivi de `userId` (le sien, ou celui de la personne soutenue en lecture) */
export function useTracker(userId: string | undefined) {
  const [t, setT] = useState<Tracker>(empty)

  const load = useCallback(async () => {
    if (!userId) return
    const from = addDays(today(), -HISTORY_DAYS)
    const [items, logs, checks, sports, cheats] = await Promise.all([
      supabase.from('routine_items').select('*').eq('user_id', userId).order('sort').order('created_at'),
      supabase.from('daily_logs').select('*').eq('user_id', userId).gte('day', from),
      supabase.from('item_checks').select('user_id,day,item_id').eq('user_id', userId).gte('day', from),
      supabase.from('sport_sessions').select('*').eq('user_id', userId).gte('day', from).order('created_at'),
      supabase.from('cheat_meals').select('*').eq('user_id', userId).gte('day', from).order('created_at'),
    ])
    setT({
      loading: false,
      items: items.data ?? [],
      logs: logs.data ?? [],
      checks: checks.data ?? [],
      sports: sports.data ?? [],
      cheats: cheats.data ?? [],
    })
  }, [userId])

  useEffect(() => {
    load()
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [load])

  // ───── mutations (optimistes : l'UI réagit tout de suite, la base suit) ─────

  const toggleItem = async (day: string, itemId: string) => {
    if (!userId) return
    const has = t.checks.some((c) => c.day === day && c.item_id === itemId)
    setT((s) => ({
      ...s,
      checks: has
        ? s.checks.filter((c) => !(c.day === day && c.item_id === itemId))
        : [...s.checks, { user_id: userId, day, item_id: itemId }],
    }))
    const q = has
      ? supabase.from('item_checks').delete().match({ user_id: userId, day, item_id: itemId })
      : supabase.from('item_checks').insert({ user_id: userId, day, item_id: itemId })
    const { error } = await q
    if (error) load()
  }

  const checkMany = async (day: string, itemIds: string[]) => {
    if (!userId) return
    const missing = itemIds.filter((id) => !t.checks.some((c) => c.day === day && c.item_id === id))
    if (!missing.length) {
      // tout est déjà coché : on décoche le groupe
      setT((s) => ({ ...s, checks: s.checks.filter((c) => !(c.day === day && itemIds.includes(c.item_id))) }))
      await supabase.from('item_checks').delete().eq('user_id', userId).eq('day', day).in('item_id', itemIds)
      return
    }
    const rows = missing.map((item_id) => ({ user_id: userId, day, item_id }))
    setT((s) => ({ ...s, checks: [...s.checks, ...rows] }))
    const { error } = await supabase.from('item_checks').insert(rows)
    if (error) load()
  }

  const patchLog = async (day: string, patch: Partial<Omit<DailyLog, 'user_id' | 'day'>>) => {
    if (!userId) return
    const current = t.logs.find((l) => l.day === day) ?? { user_id: userId, day, water_ml: 0, walked: false, steps: null, mood: null }
    const next = { ...current, ...patch }
    setT((s) => ({ ...s, logs: [...s.logs.filter((l) => l.day !== day), next] }))
    const { error } = await supabase.from('daily_logs').upsert(next)
    if (error) load()
  }

  const addSport = async (day: string, type: string, minutes: number | null) => {
    if (!userId) return
    const { data } = await supabase.from('sport_sessions').insert({ user_id: userId, day, type, minutes }).select().single()
    if (data) setT((s) => ({ ...s, sports: [...s.sports, data] }))
  }

  const removeSport = async (id: string) => {
    setT((s) => ({ ...s, sports: s.sports.filter((x) => x.id !== id) }))
    await supabase.from('sport_sessions').delete().eq('id', id)
  }

  const addCheat = async (day: string, note = '') => {
    if (!userId) return
    const { data } = await supabase.from('cheat_meals').insert({ user_id: userId, day, note }).select().single()
    if (data) setT((s) => ({ ...s, cheats: [...s.cheats, data] }))
  }

  const removeCheat = async (id: string) => {
    setT((s) => ({ ...s, cheats: s.cheats.filter((x) => x.id !== id) }))
    await supabase.from('cheat_meals').delete().eq('id', id)
  }

  const saveItem = async (item: Partial<RoutineItem> & Pick<RoutineItem, 'name' | 'kind' | 'moment'>) => {
    if (!userId) return
    const row = { dose: '', active: true, sort: t.items.length, icon: '', frequency: 'daily', weekly_target: 1, ...item, user_id: userId }
    const { data, error } = await supabase.from('routine_items').upsert(row).select().single()
    if (error) throw error
    setT((s) => ({ ...s, items: [...s.items.filter((i) => i.id !== data.id), data].sort((a, b) => a.sort - b.sort) }))
  }

  const deleteItem = async (id: string) => {
    setT((s) => ({ ...s, items: s.items.filter((i) => i.id !== id), checks: s.checks.filter((c) => c.item_id !== id) }))
    await supabase.from('routine_items').delete().eq('id', id)
  }

  return { ...t, reload: load, toggleItem, checkMany, patchLog, addSport, removeSport, addCheat, removeCheat, saveItem, deleteItem }
}

export type TrackerApi = ReturnType<typeof useTracker>

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Profile
}
