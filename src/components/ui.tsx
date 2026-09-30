import { useEffect, useState, type ReactNode } from 'react'

export function Ring({ value, size = 64, stroke = 7, color = 'var(--rose)', children }: {
  value: number; size?: number; stroke?: number; color?: string; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={v >= 0.999 ? 'var(--sage)' : color}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset .5s ease, stroke .3s' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.24 }}>
        {children}
      </div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </>
  )
}

const COLORS = ['var(--rose)', 'var(--sage)', 'var(--sky)', 'var(--lav)', 'var(--butter)']

/** Petite pluie de confettis pastel quand une journée ou un objectif est complété */
export function Burst({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setShow(true)
    navigator.vibrate?.(30)
    const t = setTimeout(() => setShow(false), 1200)
    return () => clearTimeout(t)
  }, [trigger])
  if (!show) return null
  return (
    <div className="burst" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2
        const d = 120 + Math.random() * 120
        return (
          <i key={i} style={{
            background: COLORS[i % COLORS.length],
            ['--x' as string]: `${Math.cos(a) * d}px`,
            ['--y' as string]: `${Math.sin(a) * d}px`,
          }} />
        )
      })}
    </div>
  )
}
