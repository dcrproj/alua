import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { Euro, Flame } from 'lucide-react'
import type { Region } from '@/types/api'
import { formatPrice, DpeBadge, PrixEvolutionChart, DpeDistributionBar } from '@/components/fiche'
import GeocopiaHeader from '@/components/GeocopiaHeader'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await fetch(`${API_URL}/api/regions/${slug}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Région introuvable' }
  const r: Region = await res.json()
  const canonicalSlug = r.slug ?? slug
  const nom = r.nom ?? slug
  const title = `${nom} — Immobilier, prix et données cadastrales`
  const description = `Prix médian${r.prixMedianM2 ? ` ${Math.round(r.prixMedianM2).toLocaleString('fr-FR')} €/m²` : ''}, ${r.nbTransactions.toLocaleString('fr-FR')} transactions DVF et ${r.nbDpes.toLocaleString('fr-FR')} DPE en région ${nom}.`
  return {
    title, description,
    alternates: { canonical: `/region/${canonicalSlug}` },
    openGraph: { title, description, url: `/region/${canonicalSlug}`, type: 'website' },
  }
}

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const res = await fetch(`${API_URL}/api/regions/${slug}`, {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) notFound()
  const region: Region = await res.json()

  if (region.slug && region.slug !== slug) {
    permanentRedirect(`/region/${region.slug}`)
  }

  const canonicalSlug = region.slug ?? slug
  const nom = region.nom ?? slug
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Carte', item: `${siteUrl}/carte` },
        { '@type': 'ListItem', position: 2, name: nom, item: `${siteUrl}/region/${canonicalSlug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'AdministrativeArea',
      name: nom,
      identifier: region.code,
      description: `Données immobilières de la région ${nom} : ${region.nbTransactions.toLocaleString('fr-FR')} transactions DVF${region.prixMedianM2 ? `, prix médian ${Math.round(region.prixMedianM2).toLocaleString('fr-FR')} €/m²` : ''}.`,
      url: `${siteUrl}/region/${canonicalSlug}`,
    },
  ]

  const evoFiltered = region.evolutionPrix.filter(d => d.prixMedianM2).sort((a, b) => a.annee - b.annee)
  const trendPct = evoFiltered.length >= 2
    ? Math.round(((evoFiltered.at(-1)!.prixMedianM2! - evoFiltered[0].prixMedianM2!) / evoFiltered[0].prixMedianM2!) * 100)
    : null
  const trendYears = evoFiltered.length >= 2 ? { from: evoFiltered[0].annee, to: evoFiltered.at(-1)!.annee } : null

  const dpeTotal = Object.values(region.distributionDpe).reduce((s, n) => s + n, 0)

  const stats = [
    { label: 'Prix médian/m²', value: region.prixMedianM2 ? formatPrice(region.prixMedianM2) : '—' },
    { label: 'Ventes DVF', value: region.nbTransactions.toLocaleString('fr-FR') },
    { label: 'DPE enregistrés', value: region.nbDpes.toLocaleString('fr-FR') },
    { label: 'Départements', value: region.departements.length.toString() },
  ]

  const summaryParts: string[] = []
  if (region.nbTransactions > 0) summaryParts.push(`${region.nbTransactions.toLocaleString('fr-FR')} transactions enregistrées depuis 2014.`)
  if (region.prixMedianM2) {
    let t = `Prix médian au m² : ${formatPrice(region.prixMedianM2)}`
    if (trendPct !== null && trendYears) t += `, ${trendPct >= 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(trendPct)} % entre ${trendYears.from} et ${trendYears.to}`
    summaryParts.push(t + '.')
  }
  const summary = summaryParts.join(' ')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GeocopiaHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* ── Dark hero ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
          <svg className="absolute right-0 top-0 pointer-events-none" style={{ opacity: 0.4 }}
            width="720" height="320" viewBox="0 0 720 320" aria-hidden="true">
            <defs>
              <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="720" height="320" fill="url(#hero-cad)" />
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{nom}</span>
          </div>

          <div className="parcelle-hero-grid">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                  Région
                </span>
                <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
                <span className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{region.code}</span>
              </div>
              <h1 className="text-[38px] font-semibold leading-tight text-white mb-3"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
                {nom}
              </h1>
              {summary && (
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 560 }}>{summary}</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '14px 16px' }}>
                  <div className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'white', letterSpacing: '-0.01em' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>

          {/* Départements */}
          {region.departements.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                Départements
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {region.departements.map(d => (
                  <Link key={d.code} href={`/departement/${d.slug}`}
                    className="block px-4 py-3 rounded-lg transition-colors hover:opacity-80"
                    style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', textDecoration: 'none' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: 'var(--slate-900)' }}>{d.nom}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--slate-400)' }}>{d.code}</span>
                    </div>
                    {d.prixMedianM2 && (
                      <div className="text-xs mt-1 tabular-nums" style={{ color: 'var(--slate-500)' }}>{formatPrice(d.prixMedianM2)}/m²</div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Évolution des prix */}
          {region.evolutionPrix.length >= 2 && (
            <section style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dvf w-9 h-9 rounded-lg flex items-center justify-center shrink-0"><Euro size={18} /></div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>Évolution des prix</h2>
                <span className="text-sm" style={{ color: 'var(--slate-500)' }}>DVF · DGFiP</span>
              </div>
              <PrixEvolutionChart data={region.evolutionPrix} />
            </section>
          )}

          {/* Distribution DPE */}
          {Object.keys(region.distributionDpe).length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dpe w-9 h-9 rounded-lg flex items-center justify-center shrink-0"><Flame size={18} /></div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>Distribution DPE</h2>
                <span className="text-sm" style={{ color: 'var(--slate-500)' }}>ADEME</span>
              </div>
              <DpeDistributionBar distribution={region.distributionDpe} />
              <div className="flex flex-wrap gap-3 mt-4">
                {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map(l => {
                  const count = region.distributionDpe[l] ?? 0
                  if (!count) return null
                  const pct = dpeTotal > 0 ? Math.round((count / dpeTotal) * 100) : 0
                  return (
                    <div key={l} className="flex items-center gap-2 text-sm">
                      <DpeBadge label={l} size="lg" />
                      <span style={{ color: 'var(--slate-700)' }} className="tabular-nums">{count.toLocaleString('fr-FR')}</span>
                      <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>{pct} %</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

        </div>

        <div className="parcelle-footer">
          <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/mentions-legales" className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
