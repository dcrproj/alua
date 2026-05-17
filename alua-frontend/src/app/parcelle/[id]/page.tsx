import { notFound } from 'next/navigation'
import Link from 'next/link'
import ParcelleMapWrapper from './ParcelleMapWrapper'
import type { Parcelle, ParcelleTransaction, ParcelleTransactionLot, ParcelleDpe, SectionData, Commune, ParcelleRisques, RisqueDisplay, ParcellePatrimoine, BatimentBdnb } from '@/types/api'
import { formatPrice, formatDate, DpeBadge, PrixEvolutionChart, DpeDistributionBar } from '@/components/fiche'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

const NIVEAU_COLORS: Record<string, string> = {
  'Existant':           'text-orange-700 font-semibold',
  'Faible':             'text-yellow-700',
  'Moyen':              'text-orange-600 font-semibold',
  'Modéré':             'text-orange-600 font-semibold',
  'Significatif':       'text-red-700 font-semibold',
  'Important':          'text-red-700 font-semibold',
  'Très important':     'text-red-800 font-bold',
  'Fort':               'text-red-700 font-semibold',
  'Pas de risque connu':'text-green-700',
  'Non renseigné':      'text-muted-foreground/50',
}

function niveauColor(n: string) { return NIVEAU_COLORS[n] ?? 'text-muted-foreground' }

function RisqueTableRow({ r }: { r: RisqueDisplay }) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-4 text-sm text-foreground/90">{r.libelle}</td>
      <td className={`py-2 pr-4 text-sm text-right ${niveauColor(r.adresse)}`}>{r.adresse}</td>
      <td className={`py-2 text-sm text-right ${niveauColor(r.commune)}`}>{r.commune}</td>
    </tr>
  )
}

function RisquesTable({ risques }: { risques: ParcelleRisques }) {
  const naturels = risques.risques.filter(r => r.type === 'naturel')
  const technologiques = risques.risques.filter(r => r.type === 'technologique')
  return (
    <div className="border rounded-xl p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-sm">Risques</h2>
        <a
          href="https://www.georisques.gouv.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:underline"
        >
          georisques.gouv.fr
        </a>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground text-right">
            <th className="pb-2 text-left font-normal"></th>
            <th className="pb-2 font-normal">À l&apos;adresse</th>
            <th className="pb-2 font-normal pl-4">Sur la commune</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={3} className="py-1.5 text-xs text-muted-foreground/60 font-medium uppercase tracking-wide">
              Risques naturels
            </td>
          </tr>
          {naturels.map(r => <RisqueTableRow key={r.id} r={r} />)}
          <tr>
            <td colSpan={3} className="pt-4 pb-1.5 text-xs text-muted-foreground/60 font-medium uppercase tracking-wide">
              Risques technologiques
            </td>
          </tr>
          {technologiques.map(r => <RisqueTableRow key={r.id} r={r} />)}
        </tbody>
      </table>
    </div>
  )
}

function PatrimoineSection({ patrimoine }: { patrimoine: ParcellePatrimoine }) {
  if (patrimoine.importRequired) return null
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-sm">Patrimoine ABF</h2>
        {patrimoine.enPerimetreAbf
          ? <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">Périmètre ABF</span>
          : <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Hors périmètre</span>
        }
      </div>
      {!patrimoine.enPerimetreAbf && (
        <p className="text-sm text-muted-foreground">Aucun monument historique dans un rayon de 500 m.</p>
      )}
      {patrimoine.enPerimetreAbf && (
        <>
          <div className="space-y-2">
            {patrimoine.monuments.map(m => (
              <div key={m.reference} className="bg-orange-50 rounded-lg px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-orange-900">{m.titre || m.denomination || m.reference}</p>
                  <span className="text-xs text-orange-700 shrink-0">{m.distanceM} m</span>
                </div>
                <p className="text-xs text-orange-700/70 mt-0.5">
                  {m.protection === 'classé' ? 'Classé MH' : 'Inscrit MH'}
                  {m.denomination && m.titre ? ` · ${m.denomination}` : ''}
                  {m.commune ? ` · ${m.commune}` : ''}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground border-t pt-2">
            Tout projet de travaux visible depuis le monument ou dans son périmètre de 500 m est soumis à l&apos;avis de l&apos;ABF (délai 1–4 mois).
          </p>
        </>
      )}
    </div>
  )
}

function BatimentSection({ batiments }: { batiments: SectionData<BatimentBdnb> }) {
  if (!batiments.items.length) return null
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-sm">Bâtiment{batiments.items.length > 1 ? 's' : ''} (BDNB)</h2>
      <div className="space-y-2">
        {batiments.items.map(b => (
          <div key={b.batimentGroupeId} className="bg-muted/40 rounded-lg px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{b.usageNiveau1 ?? 'Usage non renseigné'}</p>
              {b.anneeConstruction && (
                <span className="text-xs text-muted-foreground shrink-0">Construit {b.anneeConstruction}</span>
              )}
            </div>
            {b.nbLogements !== null && (
              <p className="text-xs text-muted-foreground mt-0.5">{b.nbLogements} logement{b.nbLogements > 1 ? 's' : ''}</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60 border-t pt-2">Source : BDNB {batiments.items[0]?.millesime}</p>
    </div>
  )
}

function mainLot(lots: ParcelleTransactionLot[]) {
  return lots.find(l => l.typeLocal && l.typeLocal !== 'Dépendance' && (l.surfaceBati ?? l.surfaceCarrez)) ?? lots[0]
}

function prixM2(t: ParcelleTransaction): number | null {
  const lot = mainLot(t.lots ?? [])
  const surf = lot?.surfaceBati ?? lot?.surfaceCarrez
  if (!surf || surf <= 0 || !t.valeurFonciere) return null
  return Math.round(t.valeurFonciere / surf)
}

function medianPrixM2(transactions: ParcelleTransaction[]): number | null {
  const vals = transactions.map(prixM2).filter((v): v is number => v !== null).sort((a, b) => a - b)
  if (!vals.length) return null
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2)
}


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${API_URL}/api/parcelles/${id}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Parcelle introuvable' }
  const p: Parcelle = await res.json()
  const addr = p.address
  const label = addr
    ? [addr.numero, addr.voie, addr.commune].filter(Boolean).join(' ')
    : id
  return {
    title: `Parcelle ${id} — ${label}`,
    description: `Transactions DVF, DPE et statistiques de la parcelle cadastrale ${id}${addr?.commune ? ` à ${addr.commune}` : ''}.`,
  }
}

export default async function ParcellePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const communeCode = id.substring(0, 5)

  const [parcelleRes, transactionsRes, dpesRes, communeRes, risquesRes, patrimoineRes, batimentRes] = await Promise.all([
    fetch(`${API_URL}/api/parcelles/${id}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/parcelles/${id}/transactions`, { next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/parcelles/${id}/dpes`, { next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/communes/${communeCode}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/parcelles/${id}/risques`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/patrimoine`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/batiment`, { next: { revalidate: 86400 } }),
  ])

  if (!parcelleRes.ok) notFound()

  const parcelle: Parcelle = await parcelleRes.json()
  const transactions: SectionData<ParcelleTransaction> = transactionsRes.ok ? await transactionsRes.json() : { items: [], updatedAt: null }
  const dpes: SectionData<ParcelleDpe> = dpesRes.ok ? await dpesRes.json() : { items: [], updatedAt: null }
  const commune: Commune | null = communeRes.ok ? await communeRes.json() : null
  const risques: ParcelleRisques | null = risquesRes.ok ? await risquesRes.json() : null
  const patrimoine: ParcellePatrimoine | null = patrimoineRes.ok ? await patrimoineRes.json() : null
  const batiments: SectionData<BatimentBdnb> = batimentRes.ok ? await batimentRes.json() : { items: [], updatedAt: null }

  const addr = parcelle.address
  const adresseLabel = addr ? [addr.numero, addr.voie].filter(Boolean).join(' ') : null
  const communeLabel = addr?.commune ?? commune?.nom ?? communeCode
  const parcelleMedian = medianPrixM2(transactions.items)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Link href="/carte" className="hover:text-foreground transition-colors">Carte</Link>
            <span>/</span>
            <Link href={`/commune/${communeCode}`} className="hover:text-foreground transition-colors">
              {communeLabel}
            </Link>
            <span>/</span>
            <span className="font-mono">{id}</span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold font-mono">{id}</h1>
              {adresseLabel && (
                <p className="text-muted-foreground mt-0.5">
                  {adresseLabel}{addr?.codePostal ? `, ${addr.codePostal}` : ''} {communeLabel}
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span>Section {parcelle.section} n°{parcelle.numero}</span>
                {parcelle.contenance && <span>{parcelle.contenance.toLocaleString('fr-FR')} m² de contenance</span>}
              </div>
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
        {parcelle.centroid && (
          <div className="h-64 rounded-xl overflow-hidden border shadow-sm">
            <ParcelleMapWrapper
              lon={parcelle.centroid.lon}
              lat={parcelle.centroid.lat}
              parcelleId={id}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Transactions DVF ── */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-sm">Transactions DVF</h2>
              {transactions.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  màj {new Date(transactions.updatedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {transactions.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune transaction enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {transactions.items.map(t => {
                  const lot = mainLot(t.lots ?? [])
                  const surf = lot?.surfaceBati ?? lot?.surfaceCarrez
                  const pm2 = prixM2(t)
                  return (
                    <div key={t.idMutation} className="bg-muted/40 rounded-lg px-3 py-2.5 text-sm">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                        {lot?.typeLocal && <span>{lot.typeLocal}</span>}
                        {surf && <span>{surf} m²</span>}
                        {pm2 && <span className="font-medium text-foreground/70">{formatPrice(pm2)}/m²</span>}
                        {(t.lots?.length ?? 0) > 1 && (
                          <span className="text-muted-foreground/60">{t.lots.length} lots</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {parcelleMedian && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                Prix médian sur cette parcelle : <span className="font-semibold text-foreground">{formatPrice(parcelleMedian)}/m²</span>
              </div>
            )}
          </div>

          {/* ── DPE ── */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-sm">Diagnostics DPE</h2>
              {dpes.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  màj {new Date(dpes.updatedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {dpes.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun DPE enregistré.</p>
            ) : (
              <div className="space-y-2">
                {dpes.items.map(d => (
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
                      {d.periodeConstruction && <span>Construit {d.periodeConstruction}</span>}
                      {d.energieChauffage && <span>Chauffage {d.energieChauffage}</span>}
                      {d.consoPrimaire !== null && (
                        <span className="col-span-2">{Math.round(d.consoPrimaire)} kWhEP/m²/an</span>
                      )}
                      {d.dateFinValidite && (
                        <span className="col-span-2 text-muted-foreground/60">
                          Valide jusqu'au {formatDate(d.dateFinValidite)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Risques ── */}
        {risques && risques.risques.length > 0 && (
          <RisquesTable risques={risques} />
        )}

        {/* ── Patrimoine ABF ── */}
        {patrimoine && !patrimoine.importRequired && (
          <PatrimoineSection patrimoine={patrimoine} />
        )}

        {/* ── Bâtiment BDNB ── */}
        <BatimentSection batiments={batiments} />

        {/* ── Comparaison avec la commune ── */}
        {commune && (
          <div className="border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-sm">
              Comparaison avec{' '}
              <Link href={`/commune/${communeCode}`} className="hover:underline text-primary">
                {communeLabel}
              </Link>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {commune.prixMedianM2 ? `${Math.round(commune.prixMedianM2).toLocaleString('fr-FR')}` : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">€/m² médian commune</p>
              </div>
              {parcelleMedian && (
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(parcelleMedian).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">€/m² cette parcelle</p>
                </div>
              )}
              <div>
                <p className="text-2xl font-bold">{commune.nbTransactions.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ventes dans la commune</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{commune.nbDpes.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">DPE dans la commune</p>
              </div>
            </div>

            {commune.evolutionPrix.length >= 2 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Évolution du prix médian/m² (commune)</p>
                <PrixEvolutionChart data={commune.evolutionPrix} />
              </div>
            )}

            {Object.keys(commune.distributionDpe).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Distribution DPE (commune)</p>
                <DpeDistributionBar distribution={commune.distributionDpe} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
