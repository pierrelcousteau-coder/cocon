export type Moment = 'morning' | 'noon' | 'evening' | 'anytime'
export type ReminderMoment = Exclude<Moment, 'anytime'>
export const MOMENTS: { key: Moment; label: string; icon: string }[] = [
  { key: 'morning', label: 'Matin', icon: 'Sunrise' },
  { key: 'noon', label: 'Midi', icon: 'Sun' },
  { key: 'evening', label: 'Soir', icon: 'Moon' },
  { key: 'anytime', label: 'Dans la journée', icon: 'Clock' },
]
export const REMINDER_MOMENTS = MOMENTS.filter((m) => m.key !== 'anytime') as { key: ReminderMoment; label: string; icon: string }[]

export type Kind = 'supplement' | 'phyto' | 'activity'
export const KINDS: { key: Kind; label: string; icon: string }[] = [
  { key: 'supplement', label: 'Complément', icon: 'Pill' },
  { key: 'phyto', label: 'Plante', icon: 'Leaf' },
  { key: 'activity', label: 'Activité', icon: 'Sparkles' },
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
  reminders: Record<ReminderMoment, string>
  reminders_on: boolean
}

export interface RoutineItem {
  id: string
  user_id: string
  kind: Kind
  name: string
  dose: string
  moment: Moment
  active: boolean
  sort: number
  icon: string
  frequency: 'daily' | 'weekly'
  weekly_target: number
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
