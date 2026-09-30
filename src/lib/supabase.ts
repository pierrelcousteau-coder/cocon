import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { demoClient } from './demo'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const demo = import.meta.env.VITE_DEMO === '1'

export const configured = demo || Boolean(url && key)
export const supabase: SupabaseClient = demo
  ? (demoClient as unknown as SupabaseClient)
  : createClient(url || 'http://localhost', key || 'missing', { auth: { persistSession: true, autoRefreshToken: true } })
