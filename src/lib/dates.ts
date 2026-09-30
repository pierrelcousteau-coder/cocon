// Dates locales au format YYYY-MM-DD (jamais d'UTC, pour ne pas décaler les journées)
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export const today = () => iso(new Date())

/** Lundi de la semaine contenant `s` */
export const weekStart = (s: string) => {
  const d = parse(s)
  const dow = (d.getDay() + 6) % 7 // lundi = 0
  d.setDate(d.getDate() - dow)
  return iso(d)
}

export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', opts)
export const dayShort = (s: string) => fmt({ weekday: 'short' }).format(parse(s)).replace('.', '')
export const dayLong = (s: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(parse(s))
export const dayNum = (s: string) => parse(s).getDate()
export const rangeLabel = (start: string) =>
  `${fmt({ day: 'numeric', month: 'short' }).format(parse(start))} – ${fmt({ day: 'numeric', month: 'short' }).format(parse(addDays(start, 6)))}`
