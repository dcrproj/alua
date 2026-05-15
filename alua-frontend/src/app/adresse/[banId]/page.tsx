import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Address } from '@/types/api'
import { formatPrice, formatDate, DpeBadge } from '@/components/fiche'
import AddressMapWrapper from './AddressMapWrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function generateMetadata({ params }: { params: Promise<{ banId: string }> }) {
  const { banId } = await params
  const res = await fetch(`${API_URL}/api/addresses/${banId}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Adresse introuvable' }
  const a: Address = await res.json()
  const label = [a.numero, a.voie, a.commune].filter(Boolean).join(' ')
  return {
    title: `${label} — Transactions et DPE`,
    description: `Transactions DVF et diagnostics DPE pour l'adresse ${label}${a.codePostal ? ` (${a.codePostal})` : ''}.`,
  }
}

export default async function AdressePage({ params }: { params: Promise<{ banId: string }> }) {
  const { banId } = await params

  const res = await fetch(`${API_URL}/api/addresses/${banId}`, {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) notFound()

  const address: Address = await res.json()

  const adresseLabel = [address.numero, address.voie].filter(Boolean).join(' ')
  const fullLabel = [adresseLabel, address.codePostal, address.commune].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Link href="/carte" className="hover:text-foreground transition-colors">Carte</Link>
            <span>/</span>
            {address.communeCode && address.commune ? (
              <Link href={`/commune/${address.communeCode}`} className="hover:text-foreground transition-colors">
                {address.commune}
              </Link>
            ) : (
              <span>{address.commune}</span>
            )}
            <span>/</span>
            <span>{adresseLabel || banId}</span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{adresseLabel || 'Adresse'}</h1>
              <p className="text-muted-foreground mt-0.5">
                {[address.codePostal, address.commune].filter(Boolean).join(' ')}
              </p>
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

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Mini-carte */}
        {address.lon !== null && address.lat !== null && (
          <div className="h-56 rounded-xl overflow-hidden border shadow-sm">
            <AddressMapWrapper lon={address.lon} lat={address.lat} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transactions */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm">Transactions DVF</h2>
            {address.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune transaction enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {address.transactions.map((t, i) => {
                  const surf = t.surfaceBati ?? t.surfaceCarrez
                  const pm2 = surf && surf > 0 && t.valeurFonciere ? Math.round(t.valeurFonciere / surf) : null
                  return (
                    <div key={`${t.idMutation}-${i}`} className="bg-muted/40 rounded-lg px-3 py-2.5 text-sm">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                        {t.typeLocal && <span>{t.typeLocal}</span>}
                        {surf && <span>{surf} m²</span>}
                        {pm2 && <span className="font-medium text-foreground/70">{formatPrice(pm2)}/m²</span>}
                        {t.nombrePieces && <span>{t.nombrePieces} p.</span>}
                      </div>
                      {t.idParcelle && (
                        <Link
                          href={`/parcelle/${t.idParcelle}`}
                          className="text-xs text-primary hover:underline mt-1 inline-block font-mono"
                        >
                          {t.idParcelle}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* DPE */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm">Diagnostics DPE</h2>
            {address.dpes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun DPE enregistré.</p>
            ) : (
              <div className="space-y-2">
                {address.dpes.map(d => (
                  <div key={d.numeroDpe} className="bg-muted/40 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {d.etiquetteDpe && <DpeBadge label={d.etiquetteDpe} size="lg" />}
                        {d.etiquetteGes && (
                          <div className="text-xs text-muted-foreground">
                            GES <DpeBadge label={d.etiquetteGes} />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(d.date)}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {d.typeBatiment && <span>{d.typeBatiment}</span>}
                      {d.surface && <span>{d.surface} m²</span>}
                      {d.consoPrimaire !== null && (
                        <span className="col-span-2">{Math.round(d.consoPrimaire)} kWhEP/m²/an</span>
                      )}
                      {d.dateFinValidite && (
                        <span className="col-span-2 text-muted-foreground/60">
                          Valide jusqu&apos;au {formatDate(d.dateFinValidite)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Parcelles liées */}
        {address.parcelles.length > 0 && (
          <div className="border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">Parcelles cadastrales</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {address.parcelles.map(p => (
                <Link
                  key={p.idParcelle}
                  href={`/parcelle/${p.idParcelle}`}
                  className="flex items-center justify-between bg-muted/40 hover:bg-muted/70 transition-colors rounded-lg px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs">{p.idParcelle}</span>
                  <span className="text-xs text-muted-foreground">
                    {[p.section && `Section ${p.section}`, p.contenance ? `${p.contenance} m²` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
