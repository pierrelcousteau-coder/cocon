import { addDays } from './dates'
import type { DailyLog, ItemCheck, Profile, RoutineItem } from './types'

export interface DayScore {
  done: number
  total: number
  ratio: number
  present: boolean // au moins une action saisie
}

/** Score quotidien : chaque complément/plante + l'eau (au prorata) + la marche */
export function scoreDay(day: string, profile: Profile, items: RoutineItem[], checks: ItemCheck[], log?: DailyLog): DayScore {
  const active = items.filter((i) => i.active)
  const checked = checks.filter((c) => c.day === day && active.some((i) => i.id === c.item_id)).length
  const water = Math.min(1, (log?.water_ml ?? 0) / Math.max(1, profile.water_goal_ml))
  const walked = log?.walked ? 1 : 0
  const total = active.length + 2
  const done = checked + water + walked
  return {
    done,
    total,
    ratio: done / total,
    present: checked > 0 || (log?.water_ml ?? 0) > 0 || walked === 1,
  }
}

/**
 * Série douce : elle ne casse qu'après DEUX jours manqués d'affilée
 * (« ne jamais rater deux fois »). Renvoie le nombre de jours présents.
 */
export function gentleStreak(todayIso: string, isPresent: (d: string) => boolean, maxDays = 120) {
  let count = 0
  let missedInRow = 0
  // aujourd'hui ne compte comme manqué que s'il est terminé : on démarre hier si rien encore
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
  3: '3 jours, le mouvement est lancé ✨',
  7: 'Une semaine entière de soin pour toi 🌷',
  14: '2 semaines ! Ta routine prend racine 🌱',
  21: '21 jours, ça devient naturel 💫',
  30: 'Un mois de constance, bravo 🌸',
  66: '66 jours : en moyenne, une habitude devient automatique 🏡',
  100: '100 jours. Quelle force tranquille 💛',
}
export const milestone = (streak: number) => MILESTONES[streak]

export function dailyMessage(opts: { ratio: number; presentToday: boolean; presentYesterday: boolean; name: string }) {
  const { ratio, presentToday, presentYesterday, name } = opts
  const hi = name ? `${name}, ` : ''
  if (ratio >= 0.999) return 'Journée complète. Prends une seconde pour être fière de toi 🌸'
  if (ratio >= 0.7) return 'Presque tout est fait, tu gères 💪'
  if (!presentToday && !presentYesterday) return `${hi}hier était une pause, c'est normal. Une seule petite chose aujourd'hui suffit 💛`
  if (!presentToday) return `${hi}on commence doucement ? Un verre d'eau, et c'est parti 💧`
  return 'Chaque case cochée compte. Continue à ton rythme 🌿'
}

export function sportMessage(done: number, goal: number, daysLeft: number) {
  if (done >= goal) return done > goal ? `Objectif dépassé (${done}/${goal}) 🎉` : 'Objectif sport atteint cette semaine 🎉'
  const left = goal - done
  if (left > daysLeft) return 'Chaque séance compte, même une seule 🌿'
  return `Encore ${left} séance${left > 1 ? 's' : ''} cette semaine`
}

export function cheatMessage(used: number, max: number) {
  if (used === 0) return `Ton repas plaisir de la semaine t'attend 🍕`
  if (used <= max) return 'Repas plaisir savouré ✓ zéro culpabilité'
  return `Un peu plus que prévu cette semaine. On repart à zéro lundi, sans se juger 💛`
}

export const PRESET_ENCOURAGEMENTS = [
  'Je suis fier de toi ❤️',
  'Tu fais ça pour nous, merci 🥰',
  'Pense à ton eau 💧',
  "On va marcher ensemble ce soir ? 🚶‍♀️",
  'Tu es incroyable, continue 🌸',
  'Une journée off ne change rien, je suis là 💛',
]
