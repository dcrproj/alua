import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Euro, Flame, AlertTriangle, Briefcase, MapPin, History } from 'lucide-react'
import type { Parcelle, ParcelleTransaction, ParcelleTransactionLot, ParcelleDpe, SectionData, Commune, ParcelleRisques, RisqueDisplay, ParcellePatrimoine, BatimentBdnb, Copropriete, SitadelPermis, SireneEtablissement, ParcellePoi, PoiCategory } from '@/types/api'
import { formatPrice, formatDate, DpeBadge, PrixEvolutionChart, DpeDistributionBar } from '@/components/fiche'
import ParcelleHeroMapClient from './ParcelleHeroMapClient'
import ParcelleTocNav from './ParcelleTocNav'
import ParcelleFicheHeader from './ParcelleFicheHeader'

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

// ─── Risk helpers ────────────────────────────────────────────────────────────

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
    <tr className="border-b last:border-0" style={{ borderColor: 'var(--slate-100)' }}>
      <td className="py-3 pr-4 text-sm" style={{ color: 'var(--slate-700)' }}>{r.libelle}</td>
      <td className={`py-3 pr-4 text-sm text-left ${niveauColor(r.adresse)}`}>{r.adresse}</td>
      <td className={`py-3 text-sm text-left ${niveauColor(r.commune)}`}>{r.commune}</td>
    </tr>
  )
}

// ─── Copropriété section (sidebar) ───────────────────────────────────────────

function SidebarCopropriete({ coproprietes }: { coproprietes: SectionData<Copropriete> }) {
  if (!coproprietes.items.length) return null
  return (
    <div className="pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
        Copropriété{coproprietes.items.length > 1 ? 's' : ''}{' '}
        <span className="font-normal text-xs" style={{ color: 'var(--slate-500)' }}>RNIC</span>
      </h4>
      {coproprietes.items.map(c => (
        <div key={c.noImmatriculation} className="space-y-2 mb-4 last:mb-0">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--slate-900)' }}>{c.nom ?? c.noImmatriculation}</p>
            <p className="font-mono text-[11px]" style={{ color: 'var(--slate-500)' }}>{c.noImmatriculation}</p>
          </div>
          <dl className="space-y-1 text-sm">
            {c.representantLegal && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Syndic</dt>
                <dd className="text-right" style={{ color: 'var(--slate-800)' }}>{c.representantLegal}{c.typeSyndic ? ` · ${c.typeSyndic}` : ''}</dd>
              </div>
            )}
            {c.nbLotsTotal != null && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Lots total</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{c.nbLotsTotal}</dd>
              </div>
            )}
            {c.nbLotsHabitation != null && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Habitation</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{c.nbLotsHabitation}</dd>
              </div>
            )}
            {c.nbLotsStationnement != null && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Stationnement</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{c.nbLotsStationnement}</dd>
              </div>
            )}
            {c.dateReglement && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--slate-500)' }}>Règlement</dt>
                <dd style={{ color: 'var(--slate-800)' }}>{formatDate(c.dateReglement)}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
      <p className="text-[11px] mt-2" style={{ color: 'var(--slate-400)' }}>Source : RNIC — data.gouv.fr</p>
    </div>
  )
}

// ─── Permis section (sidebar) ────────────────────────────────────────────────

const ETAT_COLORS: Record<string, string> = {
  'Autorisé': 'bg-blue-50 text-blue-700',
  'Commencé': 'bg-orange-50 text-orange-700',
  'Achevé':   'bg-green-50 text-green-700',
  'Caduc':    'bg-gray-100 text-gray-500',
  'Annulé':   'bg-gray-100 text-gray-500',
  'Refusé':   'bg-red-50 text-red-700',
}

function SidebarPermis({ permis }: { permis: SectionData<SitadelPermis> }) {
  if (!permis.items.length) return null
  return (
    <div className="pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
        Autorisations{' '}
        <span className="font-normal text-xs" style={{ color: 'var(--slate-500)' }}>Sitadel</span>
      </h4>
      <div className="space-y-3">
        {permis.items.map(p => (
          <div key={p.numDau}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm" style={{ color: 'var(--slate-800)' }}>{p.natureProjetLibelle ?? p.typeDauLibelle}</p>
              {p.etatDauLibelle && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ETAT_COLORS[p.etatDauLibelle] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.etatDauLibelle}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>
              {formatDate(p.dateAutorisation ?? p.dateDaact)}
              {(p.nbLogementsCrees ?? 0) > 0 && ` · ${p.nbLogementsCrees} lgmt`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── POI section ─────────────────────────────────────────────────────────────

function PoiSection({ poi }: { poi: ParcellePoi }) {
  if (!poi.categories.length) return null
  return (
    <section id="section-proximite" style={{ marginBottom: 56 }}>
      <SectionHeader
        kind="proximite"
        icon={<MapPin size={18} />}
        title="À proximité"
        source="OpenStreetMap"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
        {poi.categories.map((cat: PoiCategory) => (
          <div key={cat.label}>
            <h4
              className="text-[11px] font-semibold uppercase tracking-widest pb-2 mb-1"
              style={{ color: 'var(--slate-500)', borderBottom: '1px solid var(--slate-200)' }}
            >
              {cat.label}
            </h4>
            {cat.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between py-2 text-sm"
                style={{ borderTop: i ? `1px solid var(--slate-100)` : 'none' }}
              >
                <span style={{ color: 'var(--slate-700)' }}>{item.name ?? item.type}</span>
                <span className="tabular-nums" style={{ color: 'var(--slate-600)' }}>{item.distM} m</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
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
  const res = await fetch(`${API_URL}/api/parcelles/${id}`, { headers: { Accept: 'application/ld+json' } })
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

  const [parcelleRes, transactionsRes, dpesRes, communeRes, risquesRes, patrimoineRes, batimentRes, coproprieteRes, permisRes, entreprisesRes, poiRes] = await Promise.all([
    fetch(`${API_URL}/api/parcelles/${id}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/parcelles/${id}/transactions`, { next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/parcelles/${id}/dpes`, { next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/communes/${communeCode}`, { headers: { Accept: 'application/ld+json' }, next: { revalidate: 3600 } }),
    fetch(`${API_URL}/api/parcelles/${id}/risques`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/patrimoine`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/batiment`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/coproprietes`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/permis`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/entreprises`, { next: { revalidate: 86400 } }),
    fetch(`${API_URL}/api/parcelles/${id}/poi`, { next: { revalidate: 7776000 } }),
  ])

  if (!parcelleRes.ok) notFound()

  const parcelle: Parcelle = await parcelleRes.json()
  const transactions: SectionData<ParcelleTransaction> = transactionsRes.ok ? await transactionsRes.json() : { items: [], updatedAt: null }
  const dpes: SectionData<ParcelleDpe> = dpesRes.ok ? await dpesRes.json() : { items: [], updatedAt: null }
  const commune: Commune | null = communeRes.ok ? await communeRes.json() : null
  const risques: ParcelleRisques | null = risquesRes.ok ? await risquesRes.json() : null
  const patrimoine: ParcellePatrimoine | null = patrimoineRes.ok ? await patrimoineRes.json() : null
  const batiments: SectionData<BatimentBdnb> = batimentRes.ok ? await batimentRes.json() : { items: [], updatedAt: null }
  const coproprietes: SectionData<Copropriete> = coproprieteRes.ok ? await coproprieteRes.json() : { items: [], updatedAt: null }
  const permis: SectionData<SitadelPermis> = permisRes.ok ? await permisRes.json() : { items: [], updatedAt: null }
  const etablissements: SectionData<SireneEtablissement> = entreprisesRes.ok ? await entreprisesRes.json() : { items: [], updatedAt: null }
  const poi: ParcellePoi = poiRes.ok ? await poiRes.json() : { categories: [], fetchedAt: null }

  const addr = parcelle.address
  const adresseLabel = addr ? [addr.numero, addr.voie].filter(Boolean).join(' ') : null
  const communeLabel = addr?.commune ?? commune?.nom ?? communeCode
  const communeSlug  = commune?.slug ?? communeCode
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

  // ── Timeline historique ──────────────────────────────────────────────────────
  type HistEvent = { date: string; kind: 'VENTE' | 'DPE' | 'PERMIS'; label: string; detail: string | null }
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
    ...permis.items.filter(p => p.dateAutorisation).map(p => ({
      date: p.dateAutorisation!,
      kind: 'PERMIS' as const,
      label: p.natureProjetLibelle ?? p.typeDauLibelle ?? 'Permis',
      detail: p.etatDauLibelle ?? null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR') : null
  const dvfDate = fmtDate(transactions.updatedAt)
  const dpeDate = fmtDate(dpes.updatedAt)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Carte', item: `${siteUrl}/carte` },
        { '@type': 'ListItem', position: 2, name: communeLabel, item: `${siteUrl}/commune/${communeSlug}` },
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
          <Link href="/carte" className="hover:text-white/80 transition-colors">Carte</Link>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
          <Link href={`/commune/${communeSlug}`} className="hover:text-white/80 transition-colors">{communeLabel}</Link>
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

          {/* Risques */}
          {risques && risques.risques.length > 0 && (
            <section id="section-risques" style={{ marginBottom: 56 }}>
              <SectionHeader
                kind="risques"
                icon={<AlertTriangle size={18} />}
                title="Risques"
                source={
                  <a href="https://www.georisques.gouv.fr" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ textDecorationColor: 'var(--slate-300)' }}>
                    georisques.gouv.fr
                  </a>
                }
              />
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th />
                    <th
                      className="pb-3 text-left text-sm font-medium"
                      style={{ color: 'var(--slate-500)', width: 180 }}
                    >
                      À l&apos;adresse
                    </th>
                    <th
                      className="pb-3 text-left text-sm font-medium"
                      style={{ color: 'var(--slate-500)', width: 180 }}
                    >
                      Sur la commune
                    </th>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <div
                        className="pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: 'var(--slate-500)', borderTop: '1px solid var(--slate-200)' }}
                      >
                        Risques naturels
                      </div>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {risques.risques.filter(r => r.type === 'naturel').map(r => (
                    <RisqueTableRow key={r.id} r={r} />
                  ))}
                  <tr>
                    <td
                      colSpan={3}
                      className="pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: 'var(--slate-500)' }}
                    >
                      Risques technologiques
                    </td>
                  </tr>
                  {risques.risques.filter(r => r.type === 'technologique').map(r => (
                    <RisqueTableRow key={r.id} r={r} />
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Établissements SIRENE */}
          {etablissements.items.length > 0 && (
            <section id="section-entreprises" style={{ marginBottom: 56 }}>
              <SectionHeader
                kind="entreprises"
                icon={<Briefcase size={18} />}
                title="Établissements à proximité"
                count={etablissements.items.length}
                source="SIRENE · INSEE · rayon 50 m"
              />
              <div>
                {etablissements.items.map(e => (
                  <a
                    key={e.siret}
                    href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${e.siret}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-3 border-t hover:opacity-75 transition-opacity"
                    style={{
                      borderColor: 'var(--slate-100)',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--slate-900)' }}>{e.nom ?? '—'}</span>
                      <span className="text-sm ml-2.5" style={{ color: 'var(--slate-500)' }}>
                        {e.nafLibelle ?? e.nafCode}
                        {e.nafCode && <span className="font-mono text-xs ml-1.5">{e.nafCode}</span>}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--slate-500)' }}>
                      {e.estSiege ? 'Siège' : '—'}
                    </div>
                    <div className="text-sm text-right" style={{ color: 'var(--slate-600)', width: 90 }}>
                      {e.dateCreation && new Date(e.dateCreation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* À proximité (OSM) */}
          <PoiSection poi={poi} />

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
                    ) : e.kind === 'DPE' ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <DpeBadge label={e.label.slice(-1)} />
                        <span style={{ color: 'var(--slate-800)' }}>{e.label}</span>
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--slate-700)' }}>{e.label}</span>
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

          {/* Copropriétés RNIC */}
          <SidebarCopropriete coproprietes={coproprietes} />

          {/* Permis Sitadel */}
          {permis.items.length > 0 && (
            <div className="mt-5">
              <SidebarPermis permis={permis} />
            </div>
          )}

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
                <Link href={`/commune/${communeSlug}`} className="hover:underline" style={{ textDecorationColor: 'var(--slate-300)' }}>
                  {communeLabel}
                </Link>
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
          <Link href="/mentions-legales" className="hover:text-slate-600 transition-colors">Mentions légales</Link>
          <span className="font-mono">Geocopia</span>
        </span>
      </div>

      </div>{/* end scrollable */}
    </>
  )
}
