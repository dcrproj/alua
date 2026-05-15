import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Commune } from '@/types/api'
import { formatPrice, DpeBadge, PrixEvolutionChart, DpeDistributionBar } from '@/components/fiche'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const res = await fetch(`${API_URL}/api/communes/${code}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Commune introuvable' }
  const c: Commune = await res.json()
  return {
    title: `${c.nom ?? code} — Statistiques immobilières`,
    description: `Prix médian, transactions DVF et diagnostics DPE de la commune de ${c.nom ?? code} (${code}).`,
  }
}

export default async function CommunePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const res = await fetch(`${API_URL}/api/communes/${code}`, {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) notFound()

  const commune: Commune = await res.json()

  const stats = [
    { label: 'Prix médian/m²', value: commune.prixMedianM2 ? formatPrice(commune.prixMedianM2) : '—' },
    { label: 'Ventes DVF', value: commune.nbTransactions.toLocaleString('fr-FR') },
    { label: 'DPE enregistrés', value: commune.nbDpes.toLocaleString('fr-FR') },
    { label: 'Parcelles', value: commune.nbParcelles.toLocaleString('fr-FR') },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Link href="/carte" className="hover:text-foreground transition-colors">Carte</Link>
            <span>/</span>
            <span>{commune.nom ?? code}</span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{commune.nom ?? code}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Code INSEE {code}</p>
            </div>
            <Link
              href="/carte"
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded px-2 py-1"
            >
              ← Carte
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Évolution des prix */}
        {commune.evolutionPrix.length >= 2 && (
          <div className="border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">Évolution du prix médian/m²</h2>
            <PrixEvolutionChart data={commune.evolutionPrix} />
            <div className="grid grid-cols-3 gap-2 pt-1">
              {commune.evolutionPrix
                .filter(d => d.prixMedianM2)
                .slice(-3)
                .reverse()
                .map(d => (
                  <div key={d.annee} className="text-center">
                    <p className="font-semibold text-sm">{formatPrice(d.prixMedianM2!)}</p>
                    <p className="text-xs text-muted-foreground">{d.annee} · {d.nbVentes} ventes</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Distribution DPE */}
        {Object.keys(commune.distributionDpe).length > 0 && (
          <div className="border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">Distribution DPE</h2>
            <DpeDistributionBar distribution={commune.distributionDpe} />
            <div className="flex flex-wrap gap-2 pt-1">
              {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map(l => {
                const count = commune.distributionDpe[l] ?? 0
                if (!count) return null
                return (
                  <div key={l} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DpeBadge label={l} />
                    <span>{count.toLocaleString('fr-FR')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
