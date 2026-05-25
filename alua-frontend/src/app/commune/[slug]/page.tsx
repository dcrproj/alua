import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { Euro, Flame } from 'lucide-react'
import type { Commune } from '@/types/api'
import { formatPrice, formatDate, DpeBadge, PrixEvolutionChart, DpeDistributionBar } from '@/components/fiche'
import GeocopiaHeader from '@/components/GeocopiaHeader'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await fetch(`${API_URL}/api/communes/${slug}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Commune introuvable' }
  const c: Commune = await res.json()
  const canonicalSlug = c.slug ?? slug
  const nom = c.nom ?? slug
  const title = `${nom} — Statistiques immobilières`
  const description = `Prix médian${c.prixMedianM2 ? ` ${Math.round(c.prixMedianM2).toLocaleString('fr-FR')} €/m²` : ''}, ${c.nbTransactions.toLocaleString('fr-FR')} transactions DVF et ${c.nbDpes.toLocaleString('fr-FR')} DPE à ${nom} (${c.code}).`
  return {
    title, description,
    alternates: { canonical: `/commune/${canonicalSlug}` },
    openGraph: { title, description, url: `/commune/${canonicalSlug}`, type: 'website' },
  }
}

export default async function CommunePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const res = await fetch(`${API_URL}/api/communes/${slug}`, {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) notFound()
  const commune: Commune = await res.json()
  commune.transactions ??= []
  commune.transactionsTruncated ??= false

  // Redirect ancien URL (code INSEE) vers l'URL canonique avec slug
  if (commune.slug && commune.slug !== slug) {
    permanentRedirect(`/commune/${commune.slug}`)
  }

  const canonicalSlug = commune.slug ?? slug
  const nom = commune.nom ?? slug

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'
  const breadcrumbItems = [
    { name: 'Carte', item: `${siteUrl}/carte` },
    ...(commune.slugRegion && commune.nomRegion ? [{ name: commune.nomRegion, item: `${siteUrl}/region/${commune.slugRegion}` }] : []),
    ...(commune.slugDepartement && commune.nomDepartement ? [{ name: commune.nomDepartement, item: `${siteUrl}/departement/${commune.slugDepartement}` }] : []),
    { name: nom, item: `${siteUrl}/commune/${canonicalSlug}` },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.item })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'City',
      name: nom,
      identifier: commune.code,
      description: `Données immobilières de ${nom} : ${commune.nbTransactions.toLocaleString('fr-FR')} transactions DVF${commune.prixMedianM2 ? `, prix médian ${Math.round(commune.prixMedianM2).toLocaleString('fr-FR')} €/m²` : ''}.`,
      url: `${siteUrl}/commune/${canonicalSlug}`,
    },
  ]

  const evoFiltered = commune.evolutionPrix.filter(d => d.prixMedianM2).sort((a, b) => a.annee - b.annee)
  const trendPct = evoFiltered.length >= 2
    ? Math.round(((evoFiltered.at(-1)!.prixMedianM2! - evoFiltered[0].prixMedianM2!) / evoFiltered[0].prixMedianM2!) * 100)
    : null
  const trendYears = evoFiltered.length >= 2 ? { from: evoFiltered[0].annee, to: evoFiltered.at(-1)!.annee } : null

  const dpeTotal = Object.values(commune.distributionDpe).reduce((s, n) => s + n, 0)
  const dpeBon = (['A', 'B', 'C'] as const).reduce((s, l) => s + (commune.distributionDpe[l] ?? 0), 0)
  const dpePct = dpeTotal > 0 ? Math.round((dpeBon / dpeTotal) * 100) : null

  const summaryParts: string[] = []
  if (commune.nbTransactions > 0) {
    summaryParts.push(
      `${commune.nbTransactions.toLocaleString('fr-FR')} transaction${commune.nbTransactions > 1 ? 's' : ''} enregistrée${commune.nbTransactions > 1 ? 's' : ''} depuis 2014 sur ${commune.nbParcelles.toLocaleString('fr-FR')} parcelles cadastrales.`
    )
  }
  if (commune.prixMedianM2) {
    let priceText = `Prix médian au m² : ${formatPrice(commune.prixMedianM2)}`
    if (trendPct !== null && trendYears) {
      priceText += `, ${trendPct >= 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(trendPct)} % entre ${trendYears.from} et ${trendYears.to}`
    }
    summaryParts.push(priceText + '.')
  }
  if (dpePct !== null) {
    summaryParts.push(`${dpePct} % des logements diagnostiqués sont classés C ou mieux.`)
  }
  const summary = summaryParts.join(' ')

  const stats = [
    { label: 'Prix médian/m²', value: commune.prixMedianM2 ? formatPrice(commune.prixMedianM2) : '—' },
    { label: 'Ventes DVF', value: commune.nbTransactions.toLocaleString('fr-FR') },
    { label: 'DPE enregistrés', value: commune.nbDpes.toLocaleString('fr-FR') },
    { label: 'Parcelles', value: commune.nbParcelles.toLocaleString('fr-FR') },
  ]

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
            <g fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1">
              <path d="M0 80 Q200 70, 360 90 T720 100" />
              <path d="M0 200 Q180 190, 360 210 T720 220" />
              <path d="M200 0 Q220 80, 190 200 T220 320" />
            </g>
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" prefetch={false} className="hover:text-white/80 transition-colors">Carte</Link>
            {commune.slugRegion && commune.nomRegion && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
                <Link href={`/region/${commune.slugRegion}`} prefetch={false} className="hover:text-white/80 transition-colors">{commune.nomRegion}</Link>
              </>
            )}
            {commune.slugDepartement && commune.nomDepartement && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
                <Link href={`/departement/${commune.slugDepartement}`} prefetch={false} className="hover:text-white/80 transition-colors">{commune.nomDepartement}</Link>
              </>
            )}
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{nom}</span>
          </div>

          <div className="parcelle-hero-grid">
            {/* Identity */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                  Commune
                </span>
                <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
                <span className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{commune.code}</span>
              </div>
              <h1
                className="text-[38px] font-semibold leading-tight text-white mb-3"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
              >
                {nom}
              </h1>
              {summary && (
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 560 }}>
                  {summary}
                </p>
              )}
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {stats.map(s => (
                <div
                  key={s.label}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '14px 16px',
                  }}
                >
                  <div
                    className="tabular-nums"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'white', letterSpacing: '-0.01em' }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>

          {/* Évolution des prix */}
          {commune.evolutionPrix.length >= 2 && (
            <section style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dvf w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                  <Euro size={18} />
                </div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                  Évolution des prix
                </h2>
                <span className="text-sm" style={{ color: 'var(--slate-500)' }}>DVF · DGFiP</span>
              </div>
              <PrixEvolutionChart data={commune.evolutionPrix} />
              <div
                className="grid grid-cols-3 gap-4 mt-5 pt-5"
                style={{ borderTop: '1px solid var(--slate-200)' }}
              >
                {commune.evolutionPrix
                  .filter(d => d.prixMedianM2)
                  .slice(-3)
                  .reverse()
                  .map(d => (
                    <div key={d.annee} style={{ textAlign: 'center' }}>
                      <div className="text-xl font-semibold tabular-nums" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                        {formatPrice(d.prixMedianM2!)}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>
                        {d.annee} · {d.nbVentes} vente{d.nbVentes > 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Distribution DPE */}
          {Object.keys(commune.distributionDpe).length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dpe w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                  <Flame size={18} />
                </div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                  Distribution DPE
                </h2>
                <span className="text-sm" style={{ color: 'var(--slate-500)' }}>ADEME</span>
              </div>
              <DpeDistributionBar distribution={commune.distributionDpe} />
              <div className="flex flex-wrap gap-3 mt-4">
                {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map(l => {
                  const count = commune.distributionDpe[l] ?? 0
                  if (!count) return null
                  const pct = dpeTotal > 0 ? Math.round((count / dpeTotal) * 100) : 0
                  return (
                    <div key={l} className="flex items-center gap-2 text-sm">
                      <DpeBadge label={l} size="lg" />
                      <span style={{ color: 'var(--slate-700)' }} className="tabular-nums">
                        {count.toLocaleString('fr-FR')}
                      </span>
                      <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>{pct} %</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Transactions DVF */}
          {commune.transactions.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dvf w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                  <Euro size={18} />
                </div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                  Ventes DVF
                </h2>
                <span className="text-sm tabular-nums" style={{ color: 'var(--slate-500)' }}>
                  {commune.transactionsTruncated
                    ? `50 dernières sur ${commune.nbTransactions.toLocaleString('fr-FR')}`
                    : `${commune.nbTransactions.toLocaleString('fr-FR')} vente${commune.nbTransactions > 1 ? 's' : ''}`}
                </span>
              </div>

              <div>
                {commune.transactions.map((t, i) => {
                  const surf = t.surfaceBati ?? t.surfaceCarrez
                  const pm2 = surf && surf > 0 && t.valeurFonciere ? Math.round(t.valeurFonciere / surf) : null
                  return (
                    <div
                      key={`${t.idMutation}-${i}`}
                      className="py-4 border-t"
                      style={{ borderColor: 'var(--slate-200)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}
                    >
                      <div>
                        <div className="text-[22px] font-semibold tabular-nums mb-1" style={{ color: 'var(--slate-900)', letterSpacing: '-0.01em' }}>
                          {t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}
                        </div>
                        <div className="text-sm mb-1" style={{ color: 'var(--slate-600)' }}>
                          {[t.typeLocal, surf ? `${surf} m²` : null, pm2 ? `${formatPrice(pm2)}/m²` : null]
                            .filter(Boolean)
                            .map((s, j, arr) => (
                              <span key={j}>{s}{j < arr.length - 1 && <span style={{ color: 'var(--slate-400)', margin: '0 5px' }}>·</span>}</span>
                            ))}
                        </div>
                        {t.adresse && (
                          <div className="text-sm" style={{ color: 'var(--slate-500)' }}>{t.adresse}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 pt-1 shrink-0">
                        <div className="text-sm whitespace-nowrap" style={{ color: 'var(--slate-600)' }}>
                          {formatDate(t.date)}
                        </div>
                        {t.idParcelle && (
                          <Link
                            href={`/parcelle/${t.idParcelle}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                            style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)', textDecoration: 'none' }}
                          >
                            Voir la fiche →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="parcelle-footer">
          <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/mentions-legales" prefetch={false} className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
