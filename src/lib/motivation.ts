import { addDays } from './dates'
import type { DailyLog, ItemCheck, Profile, RoutineItem } from './types'

export interface DayScore {
  done: number
  total: number
  ratio: number
  present: boolean // au moins une action saisie
}

export const dailyItems = (items: RoutineItem[]) => items.filter((i) => i.active && i.frequency !== 'weekly')
export const weeklyItems = (items: RoutineItem[]) => items.filter((i) => i.active && i.frequency === 'weekly')

/** Score quotidien : chaque élément quotidien + l'eau (au prorata) + la marche */
export function scoreDay(day: string, profile: Profile, items: RoutineItem[], checks: ItemCheck[], log?: DailyLog): DayScore {
  const daily = dailyItems(items)
  const checked = checks.filter((c) => c.day === day && daily.some((i) => i.id === c.item_id)).length
  const anyCheck = checks.some((c) => c.day === day)
  const water = Math.min(1, (log?.water_ml ?? 0) / Math.max(1, profile.water_goal_ml))
  const walked = log?.walked ? 1 : 0
  const total = daily.length + 2
  const done = checked + water + walked
  return {
    done,
    total,
    ratio: done / total,
    present: anyCheck || (log?.water_ml ?? 0) > 0 || walked === 1,
  }
}

/**
 * Code couleur : vert = complet, ambre = partiel, rouge = manqué.
 * Aujourd'hui reste neutre tant que rien n'est fait (la journée n'est pas finie).
 */
export type Status = 'done' | 'partial' | 'missed' | 'pending' | 'future'
export function status(ratio: number, day: string, todayIso: string): Status {
  if (day > todayIso) return 'future'
  if (ratio >= 0.999) return 'done'
  if (day === todayIso) return ratio > 0 ? 'partial' : 'pending'
  return ratio >= 0.5 ? 'partial' : 'missed'
}

/**
 * Série douce : elle ne casse qu'après DEUX jours manqués d'affilée
 * (« ne jamais rater deux fois »). Renvoie le nombre de jours présents.
 */
export function gentleStreak(todayIso: string, isPresent: (d: string) => boolean, maxDays = 120) {
  let count = 0
  let missedInRow = 0
  let d = isPresent(todayIso) ? todayIso : addDays(todayIso, -1)
  for (let i = 0; i < maxDays; i++) {
    if (isPresent(d)) {
      count++
      missedInRow = 0
    } else if (++missedInRow >= 2) break
    d = addDays(d, -1)
  }
  return count
}

const MILESTONES: Record<number, string> = {
  3: 'Trois jours. Le mouvement est lancé.',
  7: 'Une semaine entière de soin pour toi.',
  14: 'Deux semaines. Ta routine prend racine.',
  21: 'Vingt et un jours. Cela devient naturel.',
  30: 'Un mois de constance. Bravo.',
  66: 'Soixante-six jours : une habitude devient, en moyenne, automatique.',
  100: 'Cent jours. Quelle force tranquille.',
}
export const milestone = (streak: number) => MILESTONES[streak]

export function dailyMessage(opts: { ratio: number; presentToday: boolean; presentYesterday: boolean; name: string }) {
  const { ratio, presentToday, presentYesterday, name } = opts
  if (ratio >= 0.999) return 'Journée complète. Sois fière de toi.'
  if (ratio >= 0.7) return 'Presque tout est fait.'
  if (!presentToday && !presentYesterday) return `${name ? name + ', h' : 'H'}ier était une pause, c'est normal. Une seule petite chose aujourd'hui suffit.`
  if (!presentToday) return 'On commence doucement, par un verre d’eau.'
  return 'Chaque geste compte. À ton rythme.'
}

export function sportMessage(done: number, goal: number, daysLeft: number) {
  if (done >= goal) return done > goal ? `Objectif dépassé` : 'Objectif atteint'
  const left = goal - done
  if (left > daysLeft) return 'Chaque séance compte, même une seule.'
  return `Encore ${left} séance${left > 1 ? 's' : ''}`
}

export function cheatMessage(used: number, max: number) {
  if (used === 0) return 'Aucun cette semaine'
  if (used <= max) return 'Dans ton objectif'
  return `${used - max} de plus que prévu, on repart à zéro lundi`
}

export const PRESET_MESSAGES = [
  'Je suis fier de toi',
  'Merci pour tout ce que tu fais pour nous',
  'Pense à ton eau',
  'On va marcher ensemble ce soir ?',
  'Tu es incroyable, continue',
  'Une journée off ne change rien, je suis là',
]
