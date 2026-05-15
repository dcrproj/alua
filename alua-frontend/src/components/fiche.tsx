import type { Commune } from '@/types/api'

export const DPE_COLORS: Record<string, string> = {
  A: '#319834', B: '#33CC33', C: '#CACC32',
  D: '#FBCA01', E: '#FB9A00', F: '#FB6A01', G: '#E9161C',
}

export function formatPrice(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DpeBadge({ label, size = 'sm' }: { label: string; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-6 h-6 text-xs'
  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold text-white ${dim}`}
      style={{ backgroundColor: DPE_COLORS[label] ?? '#888' }}
    >
      {label}
    </span>
  )
}

export function PrixEvolutionChart({ data }: { data: Commune['evolutionPrix'] }) {
  const filtered = data.filter(d => d.prixMedianM2 !== null && d.prixMedianM2 > 0)
  if (filtered.length < 2) return null

  const maxVal = Math.max(...filtered.map(d => d.prixMedianM2!))
  const w = 480, h = 120, pad = { t: 8, r: 8, b: 28, l: 50 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const barW = Math.max(8, Math.floor(innerW / filtered.length) - 4)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-xs">
      {[0, 0.5, 1].map(ratio => {
        const y = pad.t + innerH * (1 - ratio)
        const val = Math.round(maxVal * ratio)
        return (
          <g key={ratio}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="currentColor" strokeOpacity={0.1} />
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fill="currentColor" opacity={0.5} fontSize={10}>
              {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
            </text>
          </g>
        )
      })}
      {filtered.map((d, i) => {
        const x = pad.l + (innerW / filtered.length) * i + (innerW / filtered.length - barW) / 2
        const barH = (d.prixMedianM2! / maxVal) * innerH
        const y = pad.t + innerH - barH
        return (
          <g key={d.annee}>
            <rect x={x} y={y} width={barW} height={barH} fill="#3b82f6" opacity={0.75} rx={2} />
            <text x={x + barW / 2} y={h - pad.b + 14} textAnchor="middle" fill="currentColor" opacity={0.6} fontSize={10}>
              {d.annee}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function DpeDistributionBar({ distribution }: { distribution: Record<string, number> }) {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  const total = labels.reduce((s, l) => s + (distribution[l] ?? 0), 0)
  if (!total) return <p className="text-sm text-muted-foreground">Aucune donnée</p>

  return (
    <div className="space-y-1">
      {labels.map(l => {
        const count = distribution[l] ?? 0
        const pct = total ? Math.round((count / total) * 100) : 0
        return (
          <div key={l} className="flex items-center gap-2 text-xs">
            <DpeBadge label={l} />
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: DPE_COLORS[l] }} />
            </div>
            <span className="w-8 text-right text-muted-foreground">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
