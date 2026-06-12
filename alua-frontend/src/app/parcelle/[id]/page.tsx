import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Euro, Flame, History } from 'lucide-react'
import type { Parcelle, ParcelleTransaction, ParcelleTransactionLot, ParcelleDpe, SectionData, Commune, ParcellePatrimoine, BatimentBdnb } from '@/types/api'
import { formatPrice, formatDate, DpeBadge, PrixEvolutionChart, DpeDistributionBar } from '@/components/fiche'
import ParcelleHeroMapClient from './ParcelleHeroMapClient'
import ParcelleTocNav from './ParcelleTocNav'
import ParcelleFicheHeader from './ParcelleFicheHeader'
import {
  RisquesServerSection,
  EntreprisesServerSection,
  PoiServerSection,
  CoproprieteServerSection,
  PermisServerSection,
} from './ParcelleServerSections'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

// ─── Section icon component ─────────────────────────────────────────────────

function SectionIcon({ kind, children }: { kind: string; children: React.ReactNode }) {
  return (
    <div
      className={`gc-icon-${kind} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}
    >
      {children}
    </div>
  )
}

function SectionHeader({ kind, icon, title, count, source }: {
  kind: string
  icon: React.ReactNode
  title: string
  count?: number | null
  source?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3.5 mb-5">
      <SectionIcon kind={kind}>{icon}</SectionIcon>
      <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
        {title}
        {count != null && (
          <span className="ml-2.5 text-base font-normal" style={{ color: 'var(--slate-500)' }}>{count}</span>
        )}
      </h2>
      {source && <span className="text-sm" style={{ color: 'var(--slate-500)' }}>{source}</span>}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${API_URL}/api/parcelles/${id}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 86400, tags: ['parcelles', `parcelle-${id}`] } })
  if (!res.ok) return { title: 'Parcelle introuvable' }
  const p: Parcelle = await res.json()
  const addr = p.address
  const addrLabel = addr ? [addr.numero, addr.voie].filter(Boolean).join(' ') : null
  const commune = addr?.commune ?? null
  const title = addrLabel
    ? `${addrLabel}${commune ? `, ${commune}` : ''} — Parcelle ${id}`
    : `Parcelle ${id}${commune ? ` — ${commune}` : ''}`
  const description = `Parcelle cadastrale ${id}${addrLabel ? ` — ${addrLabel}` : ''}${commune ? ` à ${commune}` : ''}. Transactions DVF, DPE, risques, permis et données cadastrales.`
  return {
    title,
    description,
    alternates: { canonical: `/parcelle/${id}` },
    openGraph: { title, description, url: `/parcelle/${id}`, type: 'website' },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParcellePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const communeCode = id.substring(0, 5)

  const [parcelleRes, transactionsRes, dpesRes, communeRes, patrimoineRes, batimentRes] = await Promise.all([
    fetch(`${API_URL}/api/parcelles/${id}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 86400, tags: ['parcelles', `parcelle-${id}`] } }),
    fetch(`${API_URL}/api/parcelles/${id}/transactions`, { next: { revalidate: 86400, tags: ['parcelles', 'dvf', `parcelle-${id}`] } }),
    fetch(`${API_URL}/api/parcelles/${id}/dpes`, { next: { revalidate: 86400, tags: ['parcelles', 'dpe', `parcelle-${id}`] } }),
    fetch(`${API_URL}/api/communes/${communeCode}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 86400, tags: ['communes', `commune-${communeCode}`] } }),
    fetch(`${API_URL}/api/parcelles/${id}/patrimoine`, { next: { revalidate: 86400, tags: ['parcelles', `parcelle-${id}`] } }),
    fetch(`${API_URL}/api/parcelles/${id}/batiment`, { next: { revalidate: 86400, tags: ['parcelles', 'bdnb', `parcelle-${id}`] } }),
  ])

  if (!parcelleRes.ok) notFound()

  const parcelle: Parcelle = await parcelleRes.json()
  const transactions: SectionData<ParcelleTransaction> = transactionsRes.ok ? await transactionsRes.json() : { items: [], updatedAt: null }
  const dpes: SectionData<ParcelleDpe> = dpesRes.ok ? await dpesRes.json() : { items: [], updatedAt: null }
  const commune: Commune | null = communeRes.ok ? await communeRes.json() : null
  const patrimoine: ParcellePatrimoine | null = patrimoineRes.ok ? await patrimoineRes.json() : null
  const batiments: SectionData<BatimentBdnb> = batimentRes.ok ? await batimentRes.json() : { items: [], updatedAt: null }

  const addr = parcelle.address
  const adresseLabel = addr ? [addr.numero, addr.voie].filter(Boolean).join(' ') : null
  const communeLabel = addr?.commune ?? commune?.nom ?? communeCode
  const communeSlug  = commune?.slug ?? null
  const parcelleMedian = medianPrixM2(transactions.items)

  // ── Résumé textuel ──────────────────────────────────────────────────────────
  const summaryParts: string[] = []
  const nbTx = transactions.items.length
  if (parcelle.contenance) {
    summaryParts.push(`Parcelle de ${parcelle.contenance.toLocaleString('fr-FR')} m²${adresseLabel ? ` située ${adresseLabel}, ${communeLabel}` : ` à ${communeLabel}`}.`)
  }
  if (nbTx > 0) {
    const lastTx = transactions.items.find(t => t.date)
    const lastTxLabel = lastTx
      ? ` La dernière date de ${new Date(lastTx.date!).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}${lastTx.valeurFonciere ? ` pour ${formatPrice(lastTx.valeurFonciere)}` : ''}.`
      : ''
    summaryParts.push(`${nbTx} transaction${nbTx > 1 ? 's' : ''} enregistrée${nbTx > 1 ? 's' : ''} depuis 2014.${lastTxLabel}`)
  } else {
    summaryParts.push('Aucune transaction DVF enregistrée sur cette parcelle depuis 2014.')
  }
  const bestDpe = dpes.items.find(d => d.etiquetteDpe)
  if (bestDpe) {
    summaryParts.push(`DPE le plus récent : étiquette ${bestDpe.etiquetteDpe}${bestDpe.consoPrimaire ? ` (${Math.round(bestDpe.consoPrimaire)} kWhEP/m²/an)` : ''}.`)
  }
  const parcelleSummary = summaryParts.join(' ')

  // ── Timeline historique (transactions + DPE uniquement) ───────────────────
  type HistEvent = { date: string; kind: 'VENTE' | 'DPE'; label: string; detail: string | null }
  const histEvents: HistEvent[] = [
    ...transactions.items.filter(t => t.date).map(t => {
      const lot = mainLot(t.lots ?? [])
      const surf = lot?.surfaceBati ?? lot?.surfaceCarrez
      const pm2 = prixM2(t)
      return {
        date: t.date!,
        kind: 'VENTE' as const,
        label: t.valeurFonciere ? formatPrice(t.valeurFonciere) : 'Vente',
        detail: [lot?.typeLocal, surf ? `${surf} m²` : null, pm2 ? `${formatPrice(pm2)}/m²` : null].filter(Boolean).join(' · '),
      }
    }),
    ...dpes.items.filter(d => d.date).map(d => ({
      date: d.date!,
      kind: 'DPE' as const,
      label: `DPE ${d.etiquetteDpe ?? ''}`,
      detail: [d.typeBatiment, d.surface ? `${d.surface} m²` : null].filter(Boolean).join(' · '),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR') : null
  const dvfDate = fmtDate(transactions.updatedAt)
  const dpeDate = fmtDate(dpes.updatedAt)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

  const realEstateListings = transactions.items
    .filter(t => t.valeurFonciere && t.date)
    .slice(0, 10)
    .map(t => {
      const lot = mainLot(t.lots ?? [])
      const surf = lot?.surfaceBati ?? lot?.surfaceCarrez
      const pm2 = prixM2(t)
      const typeLabel = lot?.typeLocal ?? 'Bien immobilier'
      return {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: [typeLabel, adresseLabel ?? `Parcelle ${id}`, communeLabel].filter(Boolean).join(' — '),
        description: `Vente ${typeLabel.toLowerCase()}${surf ? ` de ${surf} m²` : ''} à ${communeLabel} pour ${t.valeurFonciere!.toLocaleString('fr-FR')} €${pm2 ? ` (${pm2.toLocaleString('fr-FR')} €/m²)` : ''}.`,
        url: `${siteUrl}/parcelle/${id}`,
        datePosted: t.date,
        offers: { '@type': 'Offer', price: String(t.valeurFonciere!), priceCurrency: 'EUR' },
        ...(addr ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: adresseLabel ?? undefined,
            postalCode: addr.codePostal ?? undefined,
            addressLocality: addr.commune ?? communeLabel,
            addressCountry: 'FR',
          },
        } : {}),
      }
    })

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Carte', item: `${siteUrl}/carte` },
        ...(communeSlug ? [{ '@type': 'ListItem', position: 2, name: communeLabel, item: `${siteUrl}/commune/${communeSlug}` }] : []),
        { '@type': 'ListItem', position: 3, name: id, item: `${siteUrl}/parcelle/${id}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: adresseLabel ? `${adresseLabel}, ${communeLabel}` : `Parcelle ${id}`,
      description: `Parcelle cadastrale ${id}${adresseLabel ? ` — ${adresseLabel}` : ''} à ${communeLabel}.`,
      url: `${siteUrl}/parcelle/${id}`,
      ...(addr ? {
        address: {
          '@type': 'PostalAddress',
          streetAddress: adresseLabel ?? undefined,
          postalCode: addr.codePostal ?? undefined,
          addressLocality: addr.commune ?? undefined,
          addressCountry: 'FR',
        },
      } : {}),
      ...(parcelle.centroid ? {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: parcelle.centroid.lat,
          longitude: parcelle.centroid.lon,
        },
      } : {}),
    },
    ...realEstateListings,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── App Header ──────────────────────────────────────────────────────── */}
      <ParcelleFicheHeader />

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

      {/* ── Dark hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
        {/* Cadastral pattern overlay */}
        <svg
          className="absolute right-0 top-0 pointer-events-none"
          style={{ opacity: 0.4 }}
          width="720" height="360" viewBox="0 0 720 360"
          aria-hidden="true"
        >
          <defs>
            <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="720" height="360" fill="url(#hero-cad)" />
          <g fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="1">
            <path d="M0 60 Q200 50, 320 65 T720 80" />
            <path d="M0 180 Q160 175, 320 195 T720 200" />
            <path d="M120 0 Q140 80, 110 180 T140 360" />
            <path d="M480 0 Q510 80, 470 180 T490 360" />
          </g>
          <g fill="none" stroke="rgba(217,119,6,0.3)" strokeWidth="1.2">
            <path d="M540 90 L640 80 L660 160 L555 170 Z" />
          </g>
        </svg>

        {/* Breadcrumb row */}
        <div className="parcelle-breadcrumb">
          <Link href="/carte" prefetch={false} className="hover:text-white/80 transition-colors">Carte</Link>
          {commune?.slugRegion && commune.nomRegion && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
              <Link href={`/region/${commune.slugRegion}`} prefetch={false} className="hover:text-white/80 transition-colors">{commune.nomRegion}</Link>
            </>
          )}
          {commune?.slugDepartement && commune.nomDepartement && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
              <Link href={`/departement/${commune.slugDepartement}`} prefetch={false} className="hover:text-white/80 transition-colors">{commune.nomDepartement}</Link>
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
          {communeSlug
            ? <Link href={`/commune/${communeSlug}`} prefetch={false} className="hover:text-white/80 transition-colors">{communeLabel}</Link>
            : <span style={{ color: 'rgba(255,255,255,0.9)' }}>{communeLabel}</span>}
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
          <span className="font-mono" style={{ color: 'rgba(255,255,255,0.9)' }}>{id}</span>
          {(dvfDate || dpeDate) && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {dvfDate && <><span style={{ color: 'rgba(255,255,255,0.35)' }}>DVF ·</span><strong style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{dvfDate}</strong></>}
              {dpeDate && <>{dvfDate && <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>}<span style={{ color: 'rgba(255,255,255,0.35)' }}>DPE ·</span><strong style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{dpeDate}</strong></>}
            </span>
          )}
        </div>

        {/* Hero body — 3 columns */}
        <div className="parcelle-hero-grid">
          {/* Left — identity */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: 'var(--amber-500)' }}
              >
                Parcelle
              </span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
              <span className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{id}</span>
            </div>

            <h1
              className="text-[42px] font-semibold leading-tight text-white mb-3"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              {adresseLabel ?? `Parcelle ${parcelle.section} n°${parcelle.numero}`}
            </h1>

            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {addr?.codePostal && <span>{addr.codePostal} </span>}
              {communeLabel}
              <span className="mx-2" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
              Section {parcelle.section} n°{parcelle.numero}
              {parcelle.contenance && (
                <>
                  <span className="mx-2" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <strong className="text-white font-semibold">
                    {parcelle.contenance.toLocaleString('fr-FR')} m²
                  </strong>{' '}
                  de contenance
                </>
              )}
            </div>
          </div>

          {/* Middle — mini-map */}
          {parcelle.centroid && (
            <div
              className="parcelle-hero-map rounded overflow-hidden"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ height: 138, position: 'relative', background: 'rgba(255,255,255,0.04)' }}>
                <ParcelleHeroMapClient
                  lat={parcelle.centroid.lat}
                  lon={parcelle.centroid.lon}
                  parcelleId={id}
                />
              </div>
              <div
                className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <span>
                  {parcelle.centroid.lat.toFixed(4)}°N {parcelle.centroid.lon.toFixed(4)}°E
                </span>
                <Link
                  href={`/carte?lat=${parcelle.centroid.lat}&lon=${parcelle.centroid.lon}&zoom=18&parcelle=${parcelle.idParcelle}`}
                  prefetch={false}
                  className="hover:text-white/80 transition-colors"
                >
                  Carte →
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky TOC nav ──────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--slate-200)', position: 'sticky', top: 0, zIndex: 10, overflowX: 'auto' }}>
        <ParcelleTocNav />
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="parcelle-content-grid">
        {/* ── Main column ─────────────────────────────────────────────────── */}
        <main>

          {/* Synthèse */}
          {parcelleSummary && (
            <p
              className="leading-relaxed mb-14"
              style={{ fontSize: 16, color: 'var(--slate-700)', maxWidth: 720, lineHeight: 1.65 }}
            >
              {parcelleSummary}
            </p>
          )}

          {/* Transactions DVF */}
          <section id="section-dvf" style={{ marginBottom: 56 }}>
            <SectionHeader
              kind="dvf"
              icon={<Euro size={18} />}
              title="Transactions DVF"
              source={transactions.updatedAt
                ? `màj ${new Date(transactions.updatedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
                : undefined
              }
            />

            {transactions.items.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--slate-500)' }}>Aucune transaction enregistrée.</p>
            ) : (
              <div>
                {transactions.items.map(t => {
                  const lot = mainLot(t.lots ?? [])
                  const surf = lot?.surfaceBati ?? lot?.surfaceCarrez
                  const pm2 = prixM2(t)
                  return (
                    <div
                      key={t.idMutation}
                      className="py-4 border-t"
                      style={{ borderColor: 'var(--slate-200)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'baseline' }}
                    >
                      <div>
                        <div className="text-[22px] font-semibold tabular-nums mb-1" style={{ color: 'var(--slate-900)', letterSpacing: '-0.01em' }}>
                          {t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--slate-600)' }}>
                          {[lot?.typeLocal, surf ? `${surf} m²` : null, pm2 ? `${formatPrice(pm2)}/m²` : null, (t.lots?.length ?? 0) > 1 ? `${t.lots.length} lots` : null]
                            .filter(Boolean)
                            .map((s, i, arr) => (
                              <span key={i}>{s}{i < arr.length - 1 && <span style={{ color: 'var(--slate-400)', margin: '0 5px' }}>·</span>}</span>
                            ))}
                        </div>
                      </div>
                      <div className="text-sm whitespace-nowrap" style={{ color: 'var(--slate-600)' }}>
                        {formatDate(t.date)}
                      </div>
                    </div>
                  )
                })}
                {parcelleMedian && (
                  <div className="pt-4 border-t text-sm" style={{ borderColor: 'var(--slate-200)', color: 'var(--slate-600)' }}>
                    Prix médian sur cette parcelle :{' '}
                    <strong className="tabular-nums" style={{ color: 'var(--slate-900)' }}>{formatPrice(parcelleMedian)}/m²</strong>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Diagnostics DPE */}
          <section id="section-dpe" style={{ marginBottom: 56 }}>
            <SectionHeader
              kind="dpe"
              icon={<Flame size={18} />}
              title="Diagnostics DPE"
              count={dpes.items.length || null}
              source={dpes.updatedAt
                ? `ADEME · màj ${new Date(dpes.updatedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
                : 'ADEME'
              }
            />

            {dpes.items.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--slate-500)' }}>Aucun DPE enregistré.</p>
            ) : (
              <div>
                {dpes.items.map(d => (
                  <div
                    key={d.numeroDpe}
                    className="py-4 border-t"
                    style={{
                      borderColor: 'var(--slate-200)',
                      display: 'grid',
                      gridTemplateColumns: 'auto auto 1fr auto',
                      gap: '0 18px',
                      alignItems: 'center',
                    }}
                  >
                    {d.etiquetteDpe && (
                      <DpeBadge label={d.etiquetteDpe} size="lg" />
                    )}
                    {d.etiquetteGes && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--slate-600)' }}>
                        <span>GES</span>
                        <DpeBadge label={d.etiquetteGes} />
                      </div>
                    )}
                    {!d.etiquetteDpe && <div />}
                    {!d.etiquetteGes && <div />}
                    <div>
                      <div className="text-sm">
                        <span className="font-medium" style={{ color: 'var(--slate-800)' }}>{d.typeBatiment ?? 'bâtiment'}</span>
                        {d.periodeConstruction && (
                          <span className="ml-2" style={{ color: 'var(--slate-500)' }}>Construit {d.periodeConstruction}</span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--slate-600)' }}>
                        {d.energieChauffage && <span>Chauffage {d.energieChauffage}</span>}
                        {d.consoPrimaire !== null && (
                          <span className="tabular-nums">{d.energieChauffage ? <span style={{ color: 'var(--slate-400)', margin: '0 5px' }}>·</span> : null}{Math.round(d.consoPrimaire)} kWhEP/m²·an</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-right" style={{ color: 'var(--slate-600)' }}>
                      <div>{formatDate(d.date)}</div>
                      {d.dateFinValidite && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--slate-400)' }}>
                          valide jusqu&apos;au {formatDate(d.dateFinValidite)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Risques, entreprises, POI — SSR streamé via Suspense (cache DB sur risques + POI) */}
          <Suspense>
            <RisquesServerSection idParcelle={id} />
          </Suspense>
          <Suspense>
            <EntreprisesServerSection idParcelle={id} />
          </Suspense>
          <Suspense>
            <PoiServerSection idParcelle={id} />
          </Suspense>

          {/* Historique chronologique */}
          {histEvents.length > 0 && (
            <section id="section-historique" style={{ marginBottom: 56 }}>
              <SectionHeader
                kind="historique"
                icon={<History size={18} />}
                title="Historique"
              />
              <div>
                {histEvents.map((e, i) => (
                  <div
                    key={i}
                    className="py-3 border-t"
                    style={{ borderColor: i === 0 ? 'var(--slate-200)' : 'var(--slate-100)', display: 'grid', gridTemplateColumns: '90px auto 1fr', gap: 16, alignItems: 'baseline' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--slate-500)' }}>
                      {new Date(e.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </span>
                    {e.kind === 'VENTE' ? (
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--slate-900)' }}>{e.label}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm">
                        <DpeBadge label={e.label.slice(-1)} />
                        <span style={{ color: 'var(--slate-800)' }}>{e.label}</span>
                      </span>
                    )}
                    <span className="text-sm" style={{ color: 'var(--slate-500)' }}>{e.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="space-y-0">

          {/* Bâtiments BDNB */}
          {batiments.items.length > 0 && (
            <div className="pb-5 mb-5" style={{ borderBottom: '1px solid var(--slate-200)' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
                Bâtiment{batiments.items.length > 1 ? 's' : ''}{' '}
                <span className="font-normal text-xs" style={{ color: 'var(--slate-500)' }}>BDNB</span>
              </h4>
              {batiments.items.map(b => (
                <div key={b.batimentGroupeId} className="text-sm mb-2 last:mb-0">
                  <span className="font-medium" style={{ color: 'var(--slate-800)' }}>{b.usageNiveau1 ?? 'Usage non renseigné'}</span>
                  {b.anneeConstruction && (
                    <span className="ml-2" style={{ color: 'var(--slate-500)' }}>Construit {b.anneeConstruction}</span>
                  )}
                  {b.nbLogements !== null && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>
                      {b.nbLogements} logement{b.nbLogements > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[11px] mt-3" style={{ color: 'var(--slate-400)' }}>Source : BDNB {batiments.items[0]?.millesime}</p>
            </div>
          )}

          {/* Copropriétés et permis — SSR streamé via Suspense */}
          <Suspense>
            <CoproprieteServerSection idParcelle={id} />
          </Suspense>
          <Suspense>
            <PermisServerSection idParcelle={id} />
          </Suspense>

          {/* Patrimoine ABF */}
          {patrimoine && !patrimoine.importRequired && (
            <div className="pt-5 mt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
                Patrimoine ABF
              </h4>
              {!patrimoine.enPerimetreAbf ? (
                <div className="text-sm" style={{ color: 'var(--slate-700)' }}>
                  <strong>Hors périmètre</strong>
                  <p className="mt-1" style={{ color: 'var(--slate-500)', lineHeight: 1.5 }}>
                    Aucun monument historique dans un rayon de 500 m.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-orange-700">
                    {patrimoine.monuments.length} monument{patrimoine.monuments.length > 1 ? 's' : ''} dans le périmètre de 500 m
                  </p>
                  {patrimoine.monuments.map(m => (
                    <div key={m.reference} className="bg-orange-50 rounded px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-medium text-orange-900">{m.titre || m.denomination || m.reference}</p>
                        <span className="text-xs text-orange-700 shrink-0">{m.distanceM} m</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs" style={{ color: 'var(--slate-500)', lineHeight: 1.5 }}>
                    Travaux soumis à avis ABF (délai 1–4 mois).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comparaison commune */}
          {commune && (
            <div className="pt-5 mt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
                {communeSlug
                  ? <Link href={`/commune/${communeSlug}`} prefetch={false} className="hover:underline" style={{ textDecorationColor: 'var(--slate-300)' }}>{communeLabel}</Link>
                  : <span>{communeLabel}</span>}
              </h4>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mb-5">
                <div>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--slate-900)' }}>
                    {commune.prixMedianM2 ? `${Math.round(commune.prixMedianM2).toLocaleString('fr-FR')} €` : '—'}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--slate-500)' }}>€/m² médian</div>
                </div>
                {parcelleMedian && (
                  <div>
                    <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--amber-700)' }}>
                      {Math.round(parcelleMedian).toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--slate-500)' }}>cette parcelle</div>
                  </div>
                )}
                <div>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--slate-900)' }}>
                    {commune.nbTransactions.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--slate-500)' }}>ventes</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--slate-900)' }}>
                    {commune.nbDpes.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--slate-500)' }}>DPE</div>
                </div>
              </div>

              {commune.evolutionPrix.length >= 2 && (
                <div className="mb-5">
                  <p className="text-[11px] mb-2" style={{ color: 'var(--slate-500)' }}>Prix médian €/m² (commune)</p>
                  <PrixEvolutionChart data={commune.evolutionPrix} />
                </div>
              )}

              {Object.keys(commune.distributionDpe).length > 0 && (
                <div>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--slate-500)' }}>Distribution DPE (commune)</p>
                  <DpeDistributionBar distribution={commune.distributionDpe} />
                </div>
              )}
            </div>
          )}

          {/* Références */}
          <div className="pt-5 mt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
              Références
            </h4>
            <dl className="space-y-1 text-xs">
              {[
                ['Identifiant', id],
                ['Commune', communeCode],
                ['Section', `${parcelle.section} · n°${parcelle.numero}`],
                ...(parcelle.contenance ? [['Contenance', `${parcelle.contenance.toLocaleString('fr-FR')} m²`]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt style={{ color: 'var(--slate-500)' }}>{k}</dt>
                  <dd className="font-mono text-right" style={{ color: 'var(--slate-700)' }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

        </aside>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="parcelle-footer">
        <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME · Géorisques BRGM · BDNB · RNIC · SIRENE INSEE · OpenStreetMap</span>
        <span className="shrink-0 flex items-center gap-4 ml-4">
          <Link href="/mentions-legales" prefetch={false} className="hover:text-slate-600 transition-colors">Mentions légales</Link>
          <span className="font-mono">Geocopia</span>
        </span>
      </div>

      </div>{/* end scrollable */}
    </>
  )
}
