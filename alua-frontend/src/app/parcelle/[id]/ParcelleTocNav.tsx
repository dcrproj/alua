'use client'

import { Euro, Flame, AlertTriangle, Briefcase, MapPin, History, Building2, Home } from 'lucide-react'

const TOC = [
  { icon: <Euro size={13} />, label: 'Transactions', kind: 'dvf' },
  { icon: <Flame size={13} />, label: 'Diagnostics DPE', kind: 'dpe' },
  { icon: <AlertTriangle size={13} />, label: 'Risques', kind: 'risques' },
  { icon: <Building2 size={13} />, label: 'Bâtiments', kind: 'batiments' },
  { icon: <Home size={13} />, label: 'Copropriété', kind: 'copro' },
  { icon: <Briefcase size={13} />, label: 'Entreprises', kind: 'entreprises' },
  { icon: <MapPin size={13} />, label: 'À proximité', kind: 'proximite' },
  { icon: <History size={13} />, label: 'Historique', kind: 'historique' },
]

const COLORS: Record<string, string> = {
  dvf:         'var(--slate-700)',
  dpe:         '#2d7a2d',
  risques:     'var(--amber-700)',
  batiments:   'var(--slate-700)',
  copro:       'var(--slate-700)',
  entreprises: '#1e4ed8',
  proximite:   'var(--amber-700)',
  historique:  'var(--slate-500)',
}

export default function ParcelleTocNav() {
  function scrollTo(kind: string) {
    document.getElementById(`section-${kind}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="parcelle-toc-inner">
      {TOC.map((t) => (
        <button
          key={t.kind}
          onClick={() => scrollTo(t.kind)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '12px 10px',
            background: 'none', border: 'none', borderBottom: '2px solid transparent',
            color: 'var(--slate-600)', fontWeight: 400,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
            transition: 'color .15s', whiteSpace: 'nowrap',
          }}
          className="hover:text-[#1e293b]"
        >
          <span style={{ color: COLORS[t.kind] }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}
