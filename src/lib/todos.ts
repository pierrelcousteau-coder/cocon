import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { addDays, today } from './dates'
import type { Todo } from './types'

/** To do des 14 derniers jours (pour le jour courant et le report de la veille) */
export function useTodos(userId: string | undefined) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('todos').select('*').eq('user_id', userId)
      .gte('day', addDays(today(), -14)).order('sort').order('created_at')
    setTodos(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [load])

  const ofDay = (day: string) => todos.filter((t) => t.day === day)

  const add = async (day: string, titles: string[]) => {
    if (!userId || !titles.length) return
    const base = ofDay(day).length
    const rows = titles.map((title, i) => ({ user_id: userId, day, title, sort: base + i }))
    const { data, error } = await supabase.from('todos').insert(rows).select()
    if (error) throw error
    setTodos((t) => [...t, ...(data ?? [])])
  }

  const patch = async (id: string, p: Partial<Pick<Todo, 'title' | 'done'>>) => {
    setTodos((t) => t.map((x) => (x.id === id ? { ...x, ...p } : x)))
    const { error } = await supabase.from('todos').update(p).eq('id', id)
    if (error) load()
  }

  const remove = async (id: string) => {
    setTodos((t) => t.filter((x) => x.id !== id))
    await supabase.from('todos').delete().eq('id', id)
  }

  return { loading, todos, ofDay, add, patch, remove }
}

export type TodosApi = ReturnType<typeof useTodos>
