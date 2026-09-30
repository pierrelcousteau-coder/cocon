import {
  Activity, Apple, Baby, Bath, Bed, Bike, BookOpen, Brain, CalendarCheck, Carrot, Clock, Coffee, CupSoda, Droplet,
  Dumbbell, Egg, Fish, Flower2, Footprints, HandHeart, Heart, Leaf, Moon, Music, PenLine, PhoneOff, Pill, Pizza,
  Salad, Scale, Smile, Sparkles, Sprout, Star, Stethoscope, Sun, Sunrise, Thermometer, Timer, Waves, Wind,
  type LucideIcon,
} from 'lucide-react'

/** Icônes proposées pour les éléments de routine (nom stocké en base) */
export const ICONS: Record<string, LucideIcon> = {
  Pill, Leaf, Sprout, Flower2, Droplet, CupSoda, Coffee, Apple, Salad, Carrot, Egg, Fish,
  Footprints, Dumbbell, Bike, Waves, Activity, Wind, Brain, Smile, Heart, HandHeart,
  Bed, Moon, Sun, Sunrise, Bath, BookOpen, PenLine, Music, PhoneOff, Timer, Clock,
  Thermometer, Scale, Stethoscope, CalendarCheck, Baby, Star, Sparkles, Pizza,
}

export function Icon({ name, size = 18, strokeWidth = 1.6 }: { name: string; size?: number; strokeWidth?: number }) {
  const C = ICONS[name] ?? Sparkles
  return <C size={size} strokeWidth={strokeWidth} aria-hidden />
}
