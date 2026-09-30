export type Moment = 'morning' | 'noon' | 'evening'
export const MOMENTS: { key: Moment; label: string; emoji: string; hint: string }[] = [
  { key: 'morning', label: 'Matin', emoji: '🌅', hint: 'avec le petit-déjeuner' },
  { key: 'noon', label: 'Midi', emoji: '☀️', hint: 'avec le déjeuner' },
  { key: 'evening', label: 'Soir', emoji: '🌙', hint: 'avec le dîner ou au coucher' },
]

export interface Profile {
  id: string
  name: string
  role: 'owner' | 'supporter'
  linked_to: string | null
  invite_code: string
  tz: string
  water_goal_ml: number
  glass_ml: number
  sport_per_week: number
  sport_types: string[]
  cheat_max: number
  reminders: Record<Moment, string>
  reminders_on: boolean
}

export interface RoutineItem {
  id: string
  user_id: string
  kind: 'supplement' | 'phyto'
  name: string
  dose: string
  moment: Moment
  active: boolean
  sort: number
}

export interface DailyLog {
  user_id: string
  day: string
  water_ml: number
  walked: boolean
  steps: number | null
  mood: number | null
}

export interface ItemCheck { user_id: string; day: string; item_id: string }
export interface SportSession { id: string; user_id: string; day: string; type: string; minutes: number | null }
export interface CheatMeal { id: string; user_id: string; day: string; note: string }
export interface Encouragement {
  id: string
  from_id: string
  to_id: string
  message: string
  created_at: string
  read_at: string | null
}
