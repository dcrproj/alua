import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Region } from '@/types/api'
import GeocopiaHeader from '@/components/GeocopiaHeader'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/regions-index`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const regions: { slug: string }[] = await res.json()
    return regions.filter(r => r.slug).map(r => ({ slug: r.slug }))
  } catch {
    return []
  }
}

function formatPrice(v: number) {
  return v.toLocaleString('fr-FR') + ' €/m²'
}

function buildRegionSummary(region: Region): string {
  const nom = region.nom ?? ''
  const parts: string[] = []

  const deptTxt = region.departements.length > 0
    ? `${region.departements.length} département${region.departements.length > 1 ? 's' : ''}`
    : null
  const communesTxt = region.nbCommunes > 0
    ? `${region.nbCommunes.toLocaleString('fr-FR')} communes`
    : null
  const popTxt = region.populationTotale
    ? `${region.populationTotale.toLocaleString('fr-FR')} habitants`
    : null

  if (deptTxt && communesTxt && popTxt) {
    parts.push(`La région ${nom} regroupe ${deptTxt} et ${communesTxt} pour une population totale de ${popTxt}.`)
  } else if (deptTxt && communesTxt) {
    parts.push(`La région ${nom} regroupe ${deptTxt} et ${communesTxt}.`)
  }

  if (region.nbParcelles > 0 && region.nbTransactions > 0) {
    parts.push(
      `On y recense ${region.nbParcelles.toLocaleString('fr-FR')} parcelles cadastrales et ${region.nbTransactions.toLocaleString('fr-FR')} transactions immobilières enregistrées dans les données DVF depuis 2014.`
    )
  }

  if (region.prixMedianM2) {
    const evol = region.evolutionPrix.filter(e => e.prixMedianM2 !== null)
    if (evol.length >= 2) {
      const first = evol[0]
      const last = evol[evol.length - 1]
      const pct = first.prixMedianM2 ? Math.round(((last.prixMedianM2! - first.prixMedianM2) / first.prixMedianM2) * 100) : null
      const tendance = pct !== null
        ? (pct >= 0 ? `, en hausse de ${pct} % entre ${first.annee} et ${last.annee}` : `, en baisse de ${Math.abs(pct)} % entre ${first.annee} et ${last.annee}`)
        : ''
      parts.push(`Le prix médian au m² est de ${formatPrice(region.prixMedianM2)}${tendance}.`)
    } else {
      parts.push(`Le prix médian au m² est de ${formatPrice(region.prixMedianM2)}.`)
    }
  }

  if (region.nbDpes > 0) {
    parts.push(`${region.nbDpes.toLocaleString('fr-FR')} diagnostics de performance énergétique (DPE) ont été réalisés dans cette région.`)
  }

  return parts.join(' ')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await fetch(`${API_URL}/api/regions/${slug}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Région introuvable' }
  const r: Region = await res.json()
  const nom = r.nom ?? slug
  const prixTxt = r.prixMedianM2 ? `, prix médian ${r.prixMedianM2.toLocaleString('fr-FR')} €/m²` : ''
  const title = `${nom} — Départements et données immobilières`
  const description = `Données immobilières de la région ${nom} : ${r.nbTransactions.toLocaleString('fr-FR')} transactions DVF${prixTxt}, ${r.departements.length} départements, ${r.nbCommunes.toLocaleString('fr-FR')} communes.`
  return {
    title, description,
    alternates: { canonical: `/region/${r.slug ?? slug}` },
    openGraph: { title, description, url: `/region/${r.slug ?? slug}`, type: 'website' },
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
  const summary = buildRegionSummary(region)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Carte', item: `${siteUrl}/carte` },
      { '@type': 'ListItem', position: 2, name: nom, item: `${siteUrl}/region/${canonicalSlug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GeocopiaHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
          <svg className="absolute right-0 top-0 pointer-events-none" style={{ opacity: 0.4 }}
            width="720" height="240" viewBox="0 0 720 240" aria-hidden="true">
            <defs>
              <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="720" height="240" fill="url(#hero-cad)" />
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" prefetch={false} className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{nom}</span>
          </div>

          <div style={{ padding: '32px 40px 40px' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>Région</span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
              <span className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{region.code}</span>
            </div>
            <h1 className="text-[38px] font-semibold leading-tight text-white mb-4"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
              {nom}
            </h1>
            {summary && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 620 }}>
                {summary}
              </p>
            )}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {region.prixMedianM2 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {region.prixMedianM2.toLocaleString('fr-FR')} €/m²
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Prix médian</div>
                </div>
              )}
              {region.nbTransactions > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {region.nbTransactions.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Transactions DVF</div>
                </div>
              )}
              {region.nbCommunes > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {region.nbCommunes.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Communes</div>
                </div>
              )}
              {region.nbParcelles > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {region.nbParcelles.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Parcelles cadastrales</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>
          {region.departements.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                Départements <span className="text-base font-normal" style={{ color: 'var(--slate-500)' }}>{region.departements.length}</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {region.departements.map(d => (
                  <Link key={d.code} href={`/departement/${d.slug}`} prefetch={false}
                    className="block px-4 py-3 rounded-lg transition-colors hover:opacity-80"
                    style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', textDecoration: 'none' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: 'var(--slate-900)' }}>{d.nom}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--slate-400)' }}>{d.code}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="parcelle-footer">
          <span>Geocopia — données cadastrales françaises</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/mentions-legales" prefetch={false} className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
